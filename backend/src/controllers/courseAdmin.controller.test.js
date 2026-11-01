jest.mock('../models/Result', () => ({ find: jest.fn() }));
jest.mock('../models/Test', () => ({ countDocuments: jest.fn() }));
jest.mock('../services/sdms.service', () => ({
  getFilteredStudents: jest.fn(),
  getAllFilteredStudents: jest.fn()
}));

const Result = require('../models/Result');
const sdmsService = require('../services/sdms.service');
const courseAdminController = require('./courseAdmin.controller');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('course admin SDMS reports', () => {
  beforeEach(() => jest.clearAllMocks());

  test('limits online result queries to the assigned SDMS course', async () => {
    sdmsService.getAllFilteredStudents.mockResolvedValue({
      students: [{
        sdms_student_id: 42,
        name: 'Student',
        roll_number: 'R-42',
        batch_name: '2025'
      }],
      total: 1,
      truncated: false
    });
    Result.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{
        _id: 'result-1',
        sdms_student_id: 42,
        test_type: 'online_exam',
        score: 85
      }])
    });
    const response = makeResponse();

    await courseAdminController.getStudentOnlineResults({
      sdmsScope: { collegeId: 7, courseId: 24 }
    }, response);

    expect(sdmsService.getAllFilteredStudents).toHaveBeenCalledWith(
      { collegeId: 7, courseId: 24, includePhoto: false },
      5000
    );
    expect(Result.find).toHaveBeenCalledWith({
      sdms_student_id: { $in: [42] },
      test_type: 'online_exam'
    });
    expect(response.json.mock.calls[0][0].data[0]).toMatchObject({
      student_id: '42',
      student_name: 'Student',
      roll_number: 'R-42'
    });
  });
});
