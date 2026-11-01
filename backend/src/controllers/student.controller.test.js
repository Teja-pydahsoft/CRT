jest.mock('../models/Student', () => ({ findOne: jest.fn() }));
jest.mock('../models/Test', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));
jest.mock('../models/Result', () => {
  const Result = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'result-1';
    this.save = jest.fn().mockResolvedValue(this);
  });
  Result.exists = jest.fn();
  Result.distinct = jest.fn();
  Result.find = jest.fn();
  Result.findOne = jest.fn();
  return Result;
});
jest.mock('../models/ExamAttempt', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock('../services/questionBank.service', () => ({}));

const Test = require('../models/Test');
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const studentController = require('./student.controller');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('student exam endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not expose answers or speaking reference text before submission', async () => {
    Test.findById.mockResolvedValue({
      _id: 'test-1',
      title: 'Speaking test',
      module_id: 'SPEAKING',
      status: 'active',
      questions: [{
        text: 'Repeat this sentence',
        correct_answer: 'secret answer',
        reference_text: 'private transcript',
        options: ['A', 'B']
      }]
    });
    const response = makeResponse();

    await studentController.getTestDetails(
      { params: { id: 'test-1' }, user: { id: 'student-1' } },
      response
    );

    const question = response.json.mock.calls[0][0].data.questions[0];
    expect(question.text).toBe('Repeat this sentence');
    expect(question.options).toEqual(['A', 'B']);
    expect(question).not.toHaveProperty('correct_answer');
    expect(question).not.toHaveProperty('reference_text');
  });

  test('does not issue an attempt before the exam window opens', async () => {
    Test.findById.mockResolvedValue({
      _id: 'test-1',
      status: 'active',
      startDateTime: new Date(Date.now() + 60_000),
      endDateTime: new Date(Date.now() + 120_000),
      target_campus_ids: [],
      target_batch_ids: []
    });
    const response = makeResponse();

    await studentController.startTest(
      { params: { id: 'test-1' }, user: { id: 'student-1' } },
      response
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(ExamAttempt.findOne).not.toHaveBeenCalled();
  });

  test('loads a result only when it belongs to the requesting student', async () => {
    const result = {
      _id: 'result-1',
      user_id: 'student-1',
      test_id: null,
      module_id: 'SPEAKING',
      score: 82,
      percentage: 82,
      answers: []
    };
    Result.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(result) });
    const response = makeResponse();

    await studentController.getTestResultById(
      { params: { id: 'result-1' }, user: { id: 'student-1' } },
      response
    );

    expect(Result.findOne).toHaveBeenCalledWith({ _id: 'result-1', user_id: 'student-1' });
    expect(response.json.mock.calls[0][0].data.score_percentage).toBe(82);
  });

  test('returns the student history in the shape used by the report screen', async () => {
    const result = {
      _id: 'result-1',
      test_id: 'test-1',
      module_id: 'READING',
      score: 75,
      percentage: 75,
      total_questions: 4,
      correct_answers: 3,
      answers: [{ is_correct: true }, { is_correct: true }, { is_correct: true }, { is_correct: false }],
      submitted_at: new Date()
    };
    Result.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([result])
    });
    Test.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{
        _id: 'test-1',
        title: 'Reading assessment',
        test_type: 'online_exam',
        module_id: 'READING'
      }])
    });
    const response = makeResponse();

    await studentController.getTestHistory(
      { user: { id: 'student-1' } },
      response
    );

    const group = response.json.mock.calls[0][0].data[0];
    expect(group.test_name).toBe('Reading assessment');
    expect(group.test_type).toBe('online');
    expect(group.attempt_count).toBe(1);
    expect(group.attempts[0].detailed_results).toHaveLength(4);
  });

  test('grades MCQ answers on the server and stores question-level results', async () => {
    Test.findById.mockResolvedValue({
      _id: 'test-1',
      title: 'Reading assessment',
      module_id: 'READING',
      test_type: 'online_exam',
      duration: 20,
      target_campus_ids: [],
      target_batch_ids: [],
      questions: [
        { question_id: 'question-1', question_text: 'First?', correct_answer: 'A' },
        { _id: 'question-2', question_text: 'Second?', correct_answer: 'C' }
      ]
    });
    ExamAttempt.findOneAndUpdate.mockResolvedValue({ _id: 'attempt-1' });
    const response = makeResponse();

    await studentController.submitOnlineExam({
      params: { id: 'test-1' },
      user: { id: 'student-1' },
      body: {
        attempt_id: 'attempt-1',
        time_taken_ms: 60000,
        answers: { 'question-1': 'A', 'question-2': 'B' }
      }
    }, response);

    const [resultData] = Result.mock.calls[0];
    expect(resultData.correct_answers).toBe(1);
    expect(resultData.total_questions).toBe(2);
    expect(resultData.percentage).toBe(50);
    expect(resultData.answers.map((answer) => answer.is_correct)).toEqual([true, false]);
    expect(ExamAttempt.updateOne).toHaveBeenCalledWith(
      { _id: 'attempt-1', status: 'submitting' },
      { $set: { status: 'submitted', result_id: 'result-1' } }
    );
    expect(response.json.mock.calls[0][0].data.score).toBe(50);
  });
});
