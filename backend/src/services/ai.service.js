const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

class AIService {
  constructor() {
    this.baseURL = env.AI_SERVER_URL || 'http://localhost:8001';
  }

  /**
   * 1-to-1 Audio -> Text conversion
   * Sends audio buffer to Python AI Server and receives transcribed text
   */
  async transcribeAudio(fileBuffer, originalName, language = 'en') {
    try {
      const formData = new FormData();
      formData.append('audio', fileBuffer, { filename: originalName || 'recording.wav' });
      formData.append('language', language);

      // Attempt primary route /audio-to-text, fallback to /ai/transcribe if needed
      let response;
      try {
        response = await axios.post(`${this.baseURL}/audio-to-text`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 60000
        });
      } catch (err) {
        if (err.response?.status === 404) {
          response = await axios.post(`${this.baseURL}/ai/transcribe`, formData, {
            headers: { ...formData.getHeaders() },
            timeout: 60000
          });
        } else {
          throw err;
        }
      }

      const text = response.data.text || response.data.transcription || '';
      return {
        success: true,
        text: text,
        transcription: text,
        transcript: text,
        language: response.data.language || language
      };
    } catch (error) {
      console.error('[AIService] Audio-to-Text Error:', error.response?.data || error.message);
      return {
        success: false,
        text: '',
        transcription: '',
        transcript: '',
        error: error.message
      };
    }
  }

  /**
   * 1-to-1 Text -> Voice conversion
   * Sends text to Python AI Server and receives speech audio
   */
  async generateTTS(text, language = 'en', accent = 'com', format = 'base64') {
    try {
      let response;
      try {
        response = await axios.post(`${this.baseURL}/text-to-voice`, {
          text,
          language,
          accent,
          format
        }, {
          timeout: 30000
        });
      } catch (err) {
        if (err.response?.status === 404) {
          response = await axios.post(`${this.baseURL}/ai/generate-tts`, {
            text,
            language,
            accent,
            format
          }, {
            timeout: 30000
          });
        } else {
          throw err;
        }
      }

      return {
        success: true,
        text: text,
        audio_base64: response.data.audio_base64,
        format: response.data.format || 'mp3'
      };
    } catch (error) {
      console.error('[AIService] Text-to-Voice Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pronunciation & Text Evaluation
   * Evaluated directly in application service (decoupled from AI conversion API)
   */
  evaluatePronunciation(referenceText, transcribedText) {
    if (!referenceText || !transcribedText) {
      return {
        success: false,
        accuracy_score: 0,
        fluency_score: 0,
        overall_score: 0,
        evaluation: { pronunciation: 0, fluency: 0, completeness: 0 }
      };
    }

    const clean = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const refWords = clean(referenceText).split(/\s+/).filter(Boolean);
    const transWords = clean(transcribedText).split(/\s+/).filter(Boolean);

    const matches = transWords.filter(w => refWords.includes(w)).length;
    const total = Math.max(refWords.length, 1);

    const accuracyScore = Math.round((matches / total) * 100);
    const fluencyScore = Math.min(100, Math.round((transWords.length / total) * 90));
    const completenessScore = Math.min(100, Math.round((transWords.length / total) * 100));
    const overallScore = Math.round((accuracyScore * 0.6) + (fluencyScore * 0.4));

    return {
      success: true,
      reference_text: referenceText,
      transcribed_text: transcribedText,
      accuracy_score: accuracyScore,
      fluency_score: fluencyScore,
      overall_score: overallScore,
      evaluation: {
        pronunciation: accuracyScore,
        fluency: fluencyScore,
        completeness: completenessScore
      }
    };
  }
}

module.exports = new AIService();
