import base64
import io
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import app


class LocalSpeechApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.app.test_client()

    def test_transcribes_audio_with_local_model(self):
        model = SimpleNamespace(
            transcribe=unittest.mock.Mock(
                return_value=(
                    [SimpleNamespace(text=' Hello'), SimpleNamespace(text=' there.')],
                    SimpleNamespace(language='en')
                )
            )
        )
        with patch.object(app, 'get_whisper_model', return_value=model):
            response = self.client.post(
                '/audio-to-text',
                data={'audio': (io.BytesIO(b'audio bytes'), 'speech.wav'), 'language': 'en'},
                content_type='multipart/form-data'
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['transcription'], 'Hello there.')
        model.transcribe.assert_called_once()
        self.assertEqual(model.transcribe.call_args.kwargs['beam_size'], 1)

    def test_returns_service_unavailable_when_local_model_cannot_load(self):
        with patch.object(app, 'get_whisper_model', side_effect=RuntimeError('model missing')):
            response = self.client.post(
                '/audio-to-text',
                data={'audio': (io.BytesIO(b'audio bytes'), 'speech.wav')},
                content_type='multipart/form-data'
            )

        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.json['success'])

    def test_rejects_invalid_base64_audio(self):
        response = self.client.post(
            '/audio-to-text',
            json={'audio': 'not-valid-base64%%'}
        )

        self.assertEqual(response.status_code, 400)

    def test_generates_local_wav_audio(self):
        audio_bytes = b'RIFF\x00\x00\x00\x00WAVE'

        def fake_espeak(command, **kwargs):
            with open(command[6], 'wb') as audio_file:
                audio_file.write(audio_bytes)

        with patch.object(app.subprocess, 'run', side_effect=fake_espeak) as run:
            response = self.client.post(
                '/text-to-voice',
                json={'text': 'Hello there', 'language': 'en', 'format': 'base64'}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['format'], 'wav')
        self.assertEqual(response.json['content_type'], 'audio/wav')
        self.assertEqual(base64.b64decode(response.json['audio_base64']), audio_bytes)
        self.assertEqual(run.call_args.args[0][2], 'en-us')

    def test_streams_local_wav_audio(self):
        audio_bytes = b'RIFF\x00\x00\x00\x00WAVE'

        def fake_espeak(command, **kwargs):
            with open(command[6], 'wb') as audio_file:
                audio_file.write(audio_bytes)

        with patch.object(app.subprocess, 'run', side_effect=fake_espeak):
            response = self.client.post(
                '/text-to-voice',
                json={'text': 'Hello there', 'format': 'audio'}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'audio/wav')
        self.assertEqual(response.data, audio_bytes)

    def test_rejects_oversized_tts_text(self):
        with patch.object(app.subprocess, 'run') as run:
            response = self.client.post(
                '/text-to-voice',
                json={'text': 'x' * 5001}
            )

        self.assertEqual(response.status_code, 400)
        run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
