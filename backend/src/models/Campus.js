const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: false },
  address: { type: String, required: false },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'campuses' });

module.exports = mongoose.model('Campus', campusSchema);
