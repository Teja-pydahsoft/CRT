const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  module_id: { type: String, required: true },
  level_id: { type: Number, default: 1 },
  test_type: { type: String, enum: ['practice', 'online_exam', 'random_bank'], default: 'practice' },
  questions: [{ type: mongoose.Schema.Types.Mixed }],
  duration: { type: Number, default: 30 }, // in minutes
  startDateTime: { type: Date, default: Date.now },
  endDateTime: { type: Date, default: null },
  target_campus_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campus' }],
  target_batch_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  random_config: { type: Object, default: {} },
  status: { type: String, default: 'active' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'tests' });

module.exports = mongoose.model('Test', testSchema);
