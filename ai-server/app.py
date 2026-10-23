import os
import io
import base64
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from gtts import gTTS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

_whisper_model = None

def get_whisper_model():
    """
    Lazy load Whisper model on demand to reduce startup time.
    """
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            model_name = os.environ.get('WHISPER_MODEL', 'base')
            _whisper_model = whisper.load_model(model_name)
        except Exception as e:
            print(f"[AI Server] Warning: Could not initialize Whisper model: {e}")
            _whisper_model = None
    return _whisper_model


@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    """
    Health check and API specification.
    """
    return jsonify({
        'status': 'healthy',
        'service': 'VERSANT 1-to-1 Audio/Text AI Conversion Server',
        'version': '2.0.0',
        'endpoints': {
            'audio_to_text': {
                'path': '/audio-to-text',
                'aliases': ['/ai/transcribe', '/transcribe'],
                'method': 'POST',
                'input': 'multipart/form-data (audio file) OR json { audio: base64_string }',
                'output': '{ success: true, text: string, transcription: string, language: string }'
            },
            'text_to_voice': {
                'path': '/text-to-voice',
                'aliases': ['/ai/generate-tts', '/tts', '/text-to-speech'],
                'method': 'POST',
                'input': 'json { text: string, language?: string, accent?: string, format?: "base64" | "audio" }',
                'output': 'json { success: true, audio_base64: string } OR audio/mpeg stream'
            }
        }
    })


# ============================================================================
# 1-to-1 Conversion: AUDIO -> TEXT (Speech-to-Text / STT)
# ============================================================================
@app.route('/audio-to-text', methods=['POST'])
@app.route('/ai/transcribe', methods=['POST'])
@app.route('/transcribe', methods=['POST'])
def audio_to_text():
    """
    Converts input audio file or base64 audio directly to text.
    """
    tmp_path = None
    try:
        language = request.form.get('language') or (request.json.get('language') if request.is_json and request.json else None) or 'en'
        
        # 1. Check if audio is uploaded via multipart form
        if 'audio' in request.files or 'file' in request.files:
            audio_file = request.files.get('audio') or request.files.get('file')
            suffix = os.path.splitext(audio_file.filename)[1] or '.wav'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                audio_file.save(tmp.name)
                tmp_path = tmp.name

        # 2. Check if audio is supplied as base64 in JSON payload
        elif request.is_json and request.json:
            b64_audio = (
                request.json.get('audio') or 
                request.json.get('audio_base64') or 
                request.json.get('audio_data')
            )
            if b64_audio:
                # Strip potential data URI header (e.g. data:audio/wav;base64,...)
                if ',' in b64_audio:
                    b64_audio = b64_audio.split(',', 1)[1]
                audio_bytes = base64.b64decode(b64_audio)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

        if not tmp_path or not os.path.exists(tmp_path):
            return jsonify({
                'success': False,
                'message': 'Audio input required. Send an audio file as multipart form-data (key "audio") or JSON { "audio": "<base64>" }.'
            }), 400

        # Perform transcription using Whisper
        transcription_text = ''
        try:
            model = get_whisper_model()
            if model is not None:
                result = model.transcribe(tmp_path, language=language)
                transcription_text = result.get('text', '').strip()
            else:
                raise RuntimeError("Whisper model not loaded in environment")
        except Exception as whisper_err:
            print(f"[AI Server] Whisper transcription warning: {whisper_err}")
            return jsonify({
                'success': False,
                'error': str(whisper_err)
            }), 500

        return jsonify({
            'success': True,
            'text': transcription_text,
            'transcription': transcription_text,
            'language': language
        })

    except Exception as e:
        print(f"[AI Server] Audio-to-Text Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

    finally:
        # Secure cleanup of temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


# ============================================================================
# 1-to-1 Conversion: TEXT -> VOICE (Text-to-Speech / TTS)
# ============================================================================
@app.route('/text-to-voice', methods=['POST'])
@app.route('/ai/generate-tts', methods=['POST'])
@app.route('/tts', methods=['POST', 'GET'])
@app.route('/text-to-speech', methods=['POST'])
def text_to_voice():
    """
    Converts input text directly to speech voice audio (base64 or MP3 binary stream).
    """
    try:
        # Support JSON, Form-data, and Query parameters (for GET /tts?text=...)
        data = request.get_json(silent=True) or {}
        text = (
            data.get('text') or 
            request.form.get('text') or 
            request.args.get('text') or 
            ''
        ).strip()
        
        language = (
            data.get('language') or 
            request.form.get('language') or 
            request.args.get('language') or 
            'en'
        )
        accent = (
            data.get('accent') or 
            request.form.get('accent') or 
            request.args.get('accent') or 
            'com'
        )
        return_format = (
            data.get('format') or 
            request.form.get('format') or 
            request.args.get('format') or 
            'base64'
        ).lower()

        if not text:
            return jsonify({
                'success': False,
                'message': 'Text input required. Send { "text": "Your sentence here" }.'
            }), 400

        # Generate voice speech using gTTS in-memory
        tts = gTTS(text=text, lang=language, tld=accent)
        audio_stream = io.BytesIO()
        tts.write_to_fp(audio_stream)
        audio_stream.seek(0)
        audio_bytes = audio_stream.read()

        # Check if the client requested an audio stream directly or base64 JSON
        wants_audio_stream = (
            return_format in ['audio', 'stream', 'mp3', 'binary'] or 
            'audio/' in request.headers.get('Accept', '')
        )

        if wants_audio_stream:
            return send_file(
                io.BytesIO(audio_bytes),
                mimetype='audio/mpeg',
                as_attachment=False,
                download_name='voice.mp3'
            )

        # Default: Base64 JSON response
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        return jsonify({
            'success': True,
            'text': text,
            'audio_base64': audio_b64,
            'format': 'mp3',
            'content_type': 'audio/mpeg'
        })

    except Exception as e:
        print(f"[AI Server] Text-to-Voice Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVER_PORT', 8001))
    print(f"🚀 AI Server starting on port {port} (Dedicated 1-to-1 Audio <-> Text Conversion API)")
    app.run(host='0.0.0.0', port=port, debug=True)
