const requireSdmsAssignment = require('./sdmsScope.middleware');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('SDMS organization scope middleware', () => {
  test('requires a college assignment for campus admins', () => {
    const req = { user: { role: 'campus_admin' } };
    const res = makeResponse();
    const next = jest.fn();

    requireSdmsAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('sets the fixed college and course scope for course admins', () => {
    const req = {
      user: { role: 'course_admin', sdms_college_id: 7, sdms_course_id: 24 }
    };
    const res = makeResponse();
    const next = jest.fn();

    requireSdmsAssignment(req, res, next);

    expect(req.sdmsScope).toEqual({ collegeId: 7, courseId: 24 });
    expect(next).toHaveBeenCalled();
  });

  test('rejects invalid SDMS assignment IDs', () => {
    const req = {
      user: { role: 'course_admin', sdms_college_id: 'invalid', sdms_course_id: 24 }
    };
    const res = makeResponse();

    requireSdmsAssignment(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
