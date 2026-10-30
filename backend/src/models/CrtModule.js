const mongoose = require('mongoose');

const crtTopicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  levels: [
    {
      level: { type: Number, required: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, default: '', trim: true }
    }
  ],
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const crtModuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  module_type: { 
    type: String, 
    enum: ['mcq', 'text_to_voice', 'voice_to_text', 'dual_voice', 'technical', 'mixed'], 
    default: 'mcq' 
  }, // mcq (Standard Text/MCQ), text_to_voice (TTS/Listening), voice_to_text (STT/Speaking), dual_voice (Interactive Voice AI), technical (Coding), mixed
  icon: { type: String, default: 'BookOpen', trim: true },
  color: { type: String, default: 'indigo', trim: true },
  topics: [crtTopicSchema],
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'crt_modules' });

module.exports = mongoose.model('CrtModule', crtModuleSchema);
