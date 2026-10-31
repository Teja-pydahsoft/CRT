const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const authenticateToken = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticateToken);

router.get('/modules', testController.getModules);
router.get('/levels', testController.getLevels);
router.get('/tests', testController.getAllTests);
router.delete('/tests/:id', testController.deleteTest);
router.get('/questions', testController.getQuestions);

// Auto practice questions (25 questions) & Online Test creation
router.get('/auto-practice-questions', testController.getAutoPracticeQuestions);
router.post('/auto-practice-questions', testController.getAutoPracticeQuestions);
router.post('/create-online-test', testController.createOnlineTest);
router.post('/student-count', testController.getStudentCount);

router.post('/upload-questions', upload.single('file'), testController.uploadQuestions);
router.post('/create-test-from-bank', testController.createTestFromBank);
router.post('/submit-practice-test', upload.single('audio'), testController.submitPracticeTest);

// Multi-question Speaking & Versant Online Exam Submission
router.post('/submit-online-listening-test', upload.any(), testController.submitSpeakingExam);
router.post('/submit-speaking-test', upload.any(), testController.submitSpeakingExam);
router.post('/tests/:id/submit-speaking', upload.any(), testController.submitSpeakingExam);

// 1-to-1 Audio <-> Text Conversion API endpoints
router.post('/transcribe-audio', upload.single('audio'), testController.transcribeAudio);
router.post('/audio-to-text', upload.single('audio'), testController.transcribeAudio);
router.post('/validate-transcript', testController.validateTranscript);
router.post('/text-to-voice', testController.generateTTS);
router.post('/generate-tts', testController.generateTTS);

module.exports = router;
