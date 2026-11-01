import os
import io
import base64
import binascii
import re
import subprocess
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
CORS(app)

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            os.environ.get('WHISPER_MODEL', 'tiny'),
            device=os.environ.get('WHISPER_DEVICE', 'cpu'),
            compute_type=os.environ.get('WHISPER_COMPUTE_TYPE', 'int8'),
            cpu_threads=int(os.environ.get('WHISPER_CPU_THREADS', '2'))
        )
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
                'output': 'json { success: true, audio_base64: string } OR audio/wav stream'
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
        data = request.get_json(silent=True) or {}
        language = request.form.get('language') or data.get('language') or 'en'

        audio_file = request.files.get('audio') or request.files.get('file')
        if audio_file:
            suffix = os.path.splitext(audio_file.filename)[1] or '.wav'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                audio_file.save(tmp.name)
                tmp_path = tmp.name

        elif request.is_json:
            b64_audio = (
                data.get('audio') or
                data.get('audio_base64') or
                data.get('audio_data')
            )
            if b64_audio:
                if ',' in b64_audio:
                    b64_audio = b64_audio.split(',', 1)[1]
                audio_bytes = base64.b64decode(b64_audio, validate=True)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

        if not tmp_path or not os.path.exists(tmp_path):
            return jsonify({
                'success': False,
                'message': 'Audio input required. Send an audio file as multipart form-data (key "audio") or JSON { "audio": "<base64>" }.'
            }), 400

        try:
            model = get_whisper_model()
        except Exception:
            app.logger.exception('Could not load the local speech recognition model')
            return jsonify({
                'success': False,
                'error': 'Local speech recognition model is unavailable.'
            }), 503

        try:
            segments, _ = model.transcribe(
                tmp_path,
                language=language,
                beam_size=1,
                condition_on_previous_text=False
            )
            transcription_text = ' '.join(segment.text.strip() for segment in segments).strip()
        except Exception:
            app.logger.exception('Local speech transcription failed')
            return jsonify({
                'success': False,
                'error': 'Local speech transcription failed.'
            }), 500

        return jsonify({
            'success': True,
            'text': transcription_text,
            'transcription': transcription_text,
            'language': language
        })

    except (ValueError, binascii.Error):
        return jsonify({
            'success': False,
            'error': 'Audio data must be valid base64.'
        }), 400
    except Exception:
        app.logger.exception('Audio-to-text request failed')
        return jsonify({
            'success': False,
            'error': 'Audio-to-text request failed.'
        }), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                app.logger.exception('Could not remove temporary audio file')


# ============================================================================
# 1-to-1 Conversion: TEXT -> VOICE (Text-to-Speech / TTS)
# ============================================================================
@app.route('/text-to-voice', methods=['POST'])
@app.route('/ai/generate-tts', methods=['POST'])
@app.route('/tts', methods=['POST', 'GET'])
@app.route('/text-to-speech', methods=['POST'])
def text_to_voice():
    """
    Synthesizes input text as a WAV audio response using local eSpeak NG.
    """
    try:
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

        if len(text) > 5000:
            return jsonify({
                'success': False,
                'message': 'Text input cannot exceed 5000 characters.'
            }), 400

        voice = language.lower().replace('_', '-')
        if not re.fullmatch(r'[a-z]{2,3}(?:-[a-z0-9]{2,8})?', voice):
            return jsonify({
                'success': False,
                'message': 'Language must be a valid language code.'
            }), 400
        if voice == 'en':
            voice = 'en-us'

        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, 'speech.wav')
            subprocess.run(
                ['espeak-ng', '-v', voice, '-s', '150', '-w', audio_path, text],
                check=True,
                capture_output=True,
                timeout=60
            )
            with open(audio_path, 'rb') as audio_file:
                audio_bytes = audio_file.read()

        wants_audio_stream = (
            return_format in ['audio', 'stream', 'wav', 'binary'] or
            'audio/' in request.headers.get('Accept', '')
        )

        if wants_audio_stream:
            return send_file(
                io.BytesIO(audio_bytes),
                mimetype='audio/wav',
                as_attachment=False,
                download_name='voice.wav'
            )

        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        return jsonify({
            'success': True,
            'text': text,
            'audio_base64': audio_b64,
            'format': 'wav',
            'content_type': 'audio/wav'
        })

    except Exception:
        app.logger.exception('Text-to-voice request failed')
        return jsonify({
            'success': False,
            'error': 'Text-to-voice request failed.'
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVER_PORT', 8001))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=False)
