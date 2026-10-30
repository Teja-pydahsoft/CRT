const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  key: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  is_system: { type: Boolean, default: false },
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'roles' });

module.exports = mongoose.model('Role', roleSchema);

