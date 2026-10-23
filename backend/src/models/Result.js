const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: false },
  module_id: { type: String, required: true },
  level_id: { type: Number, default: 1 },
  score: { type: Number, default: 0 },
  total_questions: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  answers: [{ type: mongoose.Schema.Types.Mixed }],
  speaking_audio_url: { type: String, default: '' },
  transcription: { type: String, default: '' },
  ai_evaluation: {
    accuracy_score: { type: Number, default: 0 },
    fluency_score: { type: Number, default: 0 },
    overall_score: { type: Number, default: 0 },
    pronunciation_breakdown: { type: Object, default: {} }
  },
  cheating_instances: { type: Number, default: 0 },
  submitted_at: { type: Date, default: Date.now }
}, { collection: 'test_results' });

module.exports = mongoose.model('Result', resultSchema);
