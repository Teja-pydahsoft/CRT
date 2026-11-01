const requireSdmsAssignment = (req, res, next) => {
  if (req.user.role === 'campus_admin') {
    const collegeId = Number(req.user.sdms_college_id);
    if (!Number.isSafeInteger(collegeId) || collegeId <= 0) {
      return res.status(403).json({ success: false, message: 'Assign an SDMS college before accessing student records.' });
    }
    req.sdmsScope = { collegeId };
  } else if (req.user.role === 'course_admin') {
    const courseId = Number(req.user.sdms_course_id);
    if (!Number.isSafeInteger(courseId) || courseId <= 0) {
      return res.status(403).json({ success: false, message: 'Assign an SDMS course before accessing student records.' });
    }
    const collegeId = req.user.sdms_college_id ? Number(req.user.sdms_college_id) : null;
    if (collegeId !== null && (!Number.isSafeInteger(collegeId) || collegeId <= 0)) {
      return res.status(403).json({ success: false, message: 'The assigned SDMS college ID is invalid.' });
    }
    req.sdmsScope = {
      collegeId,
      courseId
    };
  } else {
    req.sdmsScope = {};
  }
  return next();
};

module.exports = requireSdmsAssignment;
