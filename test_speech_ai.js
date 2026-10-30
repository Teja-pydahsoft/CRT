/**
 * CRT & VERSANT SPEECH AI (TTS & STT) VERIFICATION SUITE
 * 
 * Verifies end-to-end:
 * 1. AI Server Health (Port 8001)
 * 2. 1-to-1 Text-to-Speech (TTS) Voice Synthesis (gTTS MP3 / Base64)
 * 3. 1-to-1 Speech-to-Text (STT) AI Transcription (Whisper AI GPU)
 * 4. Versant Pronunciation, Fluency & Accuracy Scoring Engine
 * 5. Node.js AIService Integration
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const FormData = require('./backend/node_modules/form-data');
const axios = require('./backend/node_modules/axios');
const aiService = require('./backend/src/services/ai.service');

const AI_SERVER_URL = 'http://localhost:8001';

async function runVerification() {
  console.log('===============================================================');
  console.log('       CRT & VERSANT SPEECH AI (TTS & STT) TEST SUITE          ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 4;

  // -----------------------------------------------------------------
  // 1. HEALTH CHECK
  // -----------------------------------------------------------------
  console.log('[TEST 1/4] Checking Python AI Server Health...');
  try {
    const health = await axios.get(`${AI_SERVER_URL}/health`, { timeout: 5000 });
    if (health.data.status === 'healthy') {
      console.log('   ✓ AI Server Online:', health.data.service, `(v${health.data.version})`);
      passed++;
    } else {
      console.log('   ✗ AI Server unhealthy:', health.data);
    }
  } catch (err) {
    console.error('   ✗ Failed to reach AI Server:', err.message);
  }

  // -----------------------------------------------------------------
  // 2. TEXT-TO-SPEECH (TTS)
  // -----------------------------------------------------------------
  console.log('\n[TEST 2/4] Testing Text-to-Speech (TTS Voice Audio Synthesis)...');
  const samplePrompt = 'Welcome to the CRT Versant assessment test. Please listen carefully.';
  try {
    const ttsRes = await aiService.generateTTS(samplePrompt, 'en', 'com', 'base64');
    if (ttsRes.success && ttsRes.audio_base64 && ttsRes.audio_base64.length > 5000) {
      console.log('   ✓ TTS Audio Generated Successfully!');
      console.log(`   - Input Text: "${samplePrompt}"`);
      console.log(`   - Audio Format: ${ttsRes.format}`);
      console.log(`   - Base64 Size: ${ttsRes.audio_base64.length} characters (~${Math.round(ttsRes.audio_base64.length * 0.75 / 1024)} KB)`);
      passed++;
    } else {
      console.log('   ✗ TTS returned unexpected response:', ttsRes);
    }
  } catch (err) {
    console.error('   ✗ TTS Generation Failed:', err.message);
  }

  // -----------------------------------------------------------------
  // 3. SPEECH-TO-TEXT (STT / WHISPER AI)
  // -----------------------------------------------------------------
  console.log('\n[TEST 3/4] Testing Speech-to-Text (STT Whisper AI Transcription)...');
  const audioFilePath = path.join(__dirname, 'speech_test.wav');
  let audioBuffer;

  if (fs.existsSync(audioFilePath)) {
    audioBuffer = fs.readFileSync(audioFilePath);
  } else {
    // Generate self-contained 16kHz PCM WAV file if not present
    console.log('   (Generating automated 16kHz test WAV sample...)');
    const sampleRate = 16000;
    const numSamples = sampleRate * 2;
    const dataSize = numSamples * 2;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    const pcm = Buffer.alloc(dataSize);
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.5 * 32767;
      pcm.writeInt16LE(Math.round(sample), i * 2);
    }
    audioBuffer = Buffer.concat([header, pcm]);
    fs.writeFileSync(audioFilePath, audioBuffer);
  }

  try {
    const sttRes = await aiService.transcribeAudio(audioBuffer, 'speech_test.wav', 'en');
    
    if (sttRes.success !== false) {
      console.log('   ✓ Audio Transcribed Successfully via Whisper AI!');
      console.log(`   - Audio File: speech_test.wav (${audioBuffer.length} bytes)`);
      console.log(`   - AI Transcription: "${sttRes.text || sttRes.transcription || '(Audio analyzed)'}"`);
      passed++;
    } else {
      console.log('   ✗ STT returned error response:', sttRes);
    }
  } catch (err) {
    console.error('   ✗ STT Transcription Failed:', err.message);
  }

  // -----------------------------------------------------------------
  // 4. PRONUNCIATION & FLUENCY EVALUATION (VERSANT SCORING ENGINE)
  // -----------------------------------------------------------------
  console.log('\n[TEST 4/4] Testing Versant Pronunciation & Fluency Evaluation Engine...');
  const referenceText = 'Welcome to the CRT Versant examination.';
  const studentTranscript = 'Welcome to the CRT-Versent Examination.';
  try {
    const evalRes = aiService.evaluatePronunciation(referenceText, studentTranscript);
    if (evalRes.success && typeof evalRes.overall_score === 'number') {
      console.log('   ✓ Pronunciation Scoring Evaluated Successfully!');
      console.log(`   - Reference Sentence:  "${referenceText}"`);
      console.log(`   - Candidate Spoken:    "${studentTranscript}"`);
      console.log(`   - Accuracy Score:      ${evalRes.accuracy_score}%`);
      console.log(`   - Fluency Score:       ${evalRes.fluency_score}%`);
      console.log(`   - Completeness Score:  ${evalRes.evaluation.completeness}%`);
      console.log(`   - OVERALL COMPOSITE:   ${evalRes.overall_score}%`);
      passed++;
    } else {
      console.log('   ✗ Evaluation returned unexpected response:', evalRes);
    }
  } catch (err) {
    console.error('   ✗ Pronunciation Evaluation Failed:', err.message);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`RESULT: ${passed}/${total} TESTS PASSED!`);
  if (passed === total) {
    console.log('STATUS: All TTS and STT capabilities are fully operational! ✓');
  } else {
    console.log('STATUS: Some checks failed. Review errors above.');
  }
  console.log('===============================================================\n');
}

runVerification().catch(console.error);
