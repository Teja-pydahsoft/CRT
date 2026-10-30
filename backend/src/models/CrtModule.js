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
  icon: { type: String, default: 'BookOpen', trim: true },
  color: { type: String, default: 'indigo', trim: true },
  topics: [crtTopicSchema],
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'crt_modules' });

module.exports = mongoose.model('CrtModule', crtModuleSchema);

