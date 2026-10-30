const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  module_id: { type: String, required: true },
  main_module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CrtModule' },
  topic_id: { type: String, default: '' },
  level_id: { type: Number, default: 1 },
  level_name: { type: String, default: 'Level 1' },
  subcategory: { type: String, default: 'general' },
  question_type: { type: String, default: 'mcq' }, // mcq, sentence, paragraph, technical, audio
  options: [{ type: String }],
  correct_answer: { type: mongoose.Schema.Types.Mixed },
  explanation: { type: String, default: '' },
  audio_url: { type: String, default: '' },
  code_stub: { type: String, default: '' },
  expected_output: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'questions' });

module.exports = mongoose.model('Question', questionSchema);
