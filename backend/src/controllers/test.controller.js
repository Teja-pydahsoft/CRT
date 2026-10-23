const Test = require('../models/Test');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Student = require('../models/Student');
const s3Service = require('../services/s3.service');
const aiService = require('../services/ai.service');

exports.getModules = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 'listening', name: 'Listening Comprehension', description: 'Audio comprehension test' },
      { id: 'speaking', name: 'Speaking Proficiency', description: 'Pronunciation and fluency assessment' },
      { id: 'reading', name: 'Reading Comprehension', description: 'Text understanding test' },
      { id: 'writing', name: 'Writing Ability', description: 'Grammar and written expression' },
      { id: 'grammar', name: 'Grammar Mastery', description: 'Structured grammar practice' },
      { id: 'vocabulary', name: 'Vocabulary Knowledge', description: 'Word power assessment' }
    ]
  });
};

exports.getLevels = async (req, res) => {
  const { module_id } = req.query;
  return res.json({
    success: true,
    data: [
      { id: 1, name: 'Beginner (Level 1-3)', level: 1 },
      { id: 2, name: 'Intermediate (Level 4-6)', level: 2 },
      { id: 3, name: 'Advanced (Level 7-9)', level: 3 }
    ]
  });
};

exports.uploadQuestions = async (req, res) => {
  try {
    const { module_id, level_id } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
    
    let createdCount = 0;
    // Parse simple CSV rows
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const questionText = parts[0].trim();
        const correctAnswer = parts[1].trim();
        const options = parts.slice(2).map(o => o.trim());

        const q = new Question({
          text: questionText,
          module_id: module_id || 'reading',
          level_id: level_id ? parseInt(level_id) : 1,
          correct_answer: correctAnswer,
          options: options.length ? options : [correctAnswer]
        });
        await q.save();
        createdCount++;
      }
    }

    return res.json({
      success: true,
      message: `Uploaded ${createdCount} questions successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTestFromBank = async (req, res) => {
  try {
    const test = new Test(req.body);
    await test.save();
    return res.status(201).json({ success: true, data: test });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { module_id, level_id } = req.query;
    const filter = {};
    if (module_id) filter.module_id = module_id;
    if (level_id) filter.level_id = parseInt(level_id);

    const questions = await Question.find(filter);
    return res.json({ success: true, data: questions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitPracticeTest = async (req, res) => {
  try {
    const { test_id, module_id, answers, reference_text } = req.body;
    let audioUrl = '';
    let transcription = '';
    let aiEval = null;

    if (req.file) {
      // Upload speaking recording to AWS S3
      const fileKey = `speaking/${req.user.id || 'std'}_${Date.now()}.wav`;
      audioUrl = await s3Service.uploadFile(req.file.buffer, fileKey, req.file.mimetype || 'audio/wav');

      // Send audio to Python AI server for Whisper transcription
      const transcribeRes = await aiService.transcribeAudio(req.file.buffer, req.file.originalname);
      transcription = transcribeRes.transcription || '';

      // Evaluate pronunciation against reference text
      if (reference_text || req.body.prompt_text) {
        aiEval = await aiService.evaluatePronunciation(reference_text || req.body.prompt_text, transcription);
      }
    }

    const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : (answers || []);
    let score = 0;
    if (aiEval && typeof aiEval.overall_score === 'number') {
      score = aiEval.overall_score;
    }

    const studentDoc = await Student.findOne({ user_id: req.user.id || req.user._id });

    const result = new Result({
      student_id: studentDoc ? studentDoc._id : (req.user.id || req.user._id),
      user_id: req.user.id || req.user._id,
      test_id: test_id || null,
      module_id: module_id || 'speaking',
      score: score,
      percentage: score,
      answers: parsedAnswers,
      speaking_audio_url: audioUrl,
      transcription: transcription,
      ai_evaluation: aiEval ? {
        accuracy_score: aiEval.accuracy_score,
        fluency_score: aiEval.fluency_score,
        overall_score: aiEval.overall_score
      } : { accuracy_score: score, fluency_score: score, overall_score: score }
    });

    await result.save();

    return res.json({
      success: true,
      data: result,
      score,
      audioUrl,
      transcription,
      evaluation: aiEval
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 1-to-1 Audio -> Text API
 * Transcribe speaking practice audio for immediate student feedback
 */
exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file required' });
    }

    const transcribeRes = await aiService.transcribeAudio(
      req.file.buffer,
      req.file.originalname,
      req.body.language || 'en'
    );

    return res.json({
      success: transcribeRes.success !== false,
      transcript: transcribeRes.transcript || transcribeRes.transcription || transcribeRes.text,
      transcription: transcribeRes.transcription || transcribeRes.text,
      text: transcribeRes.text || transcribeRes.transcription
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Validate Student Transcript against Reference Text
 */
exports.validateTranscript = async (req, res) => {
  try {
    const { original_sentence, reference_text, student_transcript, transcribed_text } = req.body;
    const refText = original_sentence || reference_text || '';
    const transText = student_transcript || transcribed_text || '';

    const evaluation = aiService.evaluatePronunciation(refText, transText);

    return res.json({
      success: true,
      ...evaluation
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 1-to-1 Text -> Voice API
 * Generate TTS speech voice audio from given text
 */
exports.generateTTS = async (req, res) => {
  try {
    const { text, language, accent, format } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const ttsResult = await aiService.generateTTS(text, language || 'en', accent || 'com', format || 'base64');
    return res.json(ttsResult);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

