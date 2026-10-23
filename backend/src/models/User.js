const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  email: { type: String, required: false },
  name: { type: String, required: false },
  role: { 
    type: String, 
    enum: ['superadmin', 'campus_admin', 'course_admin', 'student'],
    required: true 
  },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', default: null },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'users' });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
