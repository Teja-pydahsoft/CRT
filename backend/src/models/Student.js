const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_id: { type: String, required: true, unique: true, index: true },
  roll_number: { type: String, required: false },
  email: { type: String, required: false },
  name: { type: String, required: true },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: false },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: false },
  college_id: { type: Number, required: false },
  college_name: { type: String, required: false },
  course_id: { type: Number, required: false },
  course_name: { type: String, required: false },
  branch_id: { type: Number, required: false },
  branch_name: { type: String, required: false },
  year: { type: Number, required: false },
  semester: { type: Number, required: false },
  section: { type: String, required: false, default: 'A' },
  mobile_number: { type: String, required: false },
  authorized_levels: { type: [Number], default: [1] },
  authorized_modules: { 
    type: [String], 
    default: ['listening', 'speaking', 'reading', 'writing', 'grammar', 'vocabulary'] 
  },
  progress: { type: Object, default: {} },
  created_at: { type: Date, default: Date.now }
}, { collection: 'students' });

module.exports = mongoose.model('Student', studentSchema);

