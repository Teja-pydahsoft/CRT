const testIncludesSdmsScope = (test, { collegeId = null, courseId = null } = {}) => {
  const collegeIds = (test.target_college_ids || []).map(Number);
  const courseIds = (test.target_course_ids || []).map(Number);
  if (collegeId && collegeIds.length && !collegeIds.includes(Number(collegeId))) return false;
  if (courseId && courseIds.length && !courseIds.includes(Number(courseId))) return false;
  return !(test.target_campus_ids || []).length && !(test.target_batch_ids || []).length;
};

module.exports = { testIncludesSdmsScope };
