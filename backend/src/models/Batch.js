const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: false },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
  student_count: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'batches' });

module.exports = mongoose.model('Batch', batchSchema);
