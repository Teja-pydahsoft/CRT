const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: false },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'courses' });

module.exports = mongoose.model('Course', courseSchema);
