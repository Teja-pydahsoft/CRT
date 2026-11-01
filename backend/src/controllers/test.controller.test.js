jest.mock('../models/Test', () => ({ findById: jest.fn() }));
jest.mock('../models/Question', () => ({}));
jest.mock('../models/Student', () => ({ findOne: jest.fn() }));
jest.mock('../models/Result', () => {
  const Result = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'result-1';
    this.save = jest.fn().mockResolvedValue(this);
  });
  return Result;
});
jest.mock('../models/ExamAttempt', () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock('../services/s3.service', () => ({}));
jest.mock('../services/ai.service', () => ({
  evaluatePronunciation: jest.fn()
}));
jest.mock('../services/questionBank.service', () => ({}));
jest.mock('../services/sdms.service', () => ({}));

const Test = require('../models/Test');
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const testController = require('./test.controller');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('SDMS speaking exam submission', () => {
  beforeEach(() => jest.clearAllMocks());

  test('claims the attempt and stores the result using the SDMS student ID', async () => {
    Test.findById.mockResolvedValue({
      _id: 'test-1',
      title: 'Reading assessment',
      module_id: 'READING',
      test_type: 'online_exam',
      duration: 20,
      questions: [{
        question_id: 'question-1',
        text: 'Choose the answer',
        correct_answer: 'A'
      }]
    });
    ExamAttempt.findOneAndUpdate.mockResolvedValue({ _id: 'attempt-1' });
    const response = makeResponse();

    await testController.submitSpeakingExam({
      params: { id: 'test-1' },
      user: { auth_source: 'sdms', sdms_student_id: 42 },
      body: {
        attempt_id: 'attempt-1',
        answers: { 'question-1': 'A' }
      },
      files: []
    }, response);

    expect(ExamAttempt.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'attempt-1',
        sdms_student_id: 42,
        test_id: 'test-1',
        status: 'in_progress'
      }),
      { $set: { status: 'submitting' } },
      { new: true }
    );
    expect(ExamAttempt.findOneAndUpdate.mock.calls[0][0]).not.toHaveProperty('user_id');
    expect(Result.mock.instances[0].save).toHaveBeenCalled();
    expect(Result.mock.calls[0][0]).toMatchObject({
      sdms_student_id: 42,
      user_id: null,
      test_id: 'test-1',
      score: 100
    });
    expect(response.json.mock.calls[0][0].success).toBe(true);
  });
});
