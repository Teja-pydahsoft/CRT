const toStudentQuestion = (question) => {
  const safeQuestion = typeof question?.toObject === 'function'
    ? question.toObject()
    : { ...question };
  delete safeQuestion.correct_answer;
  delete safeQuestion.correctAnswer;
  delete safeQuestion.answer_key;
  delete safeQuestion.answerKey;
  delete safeQuestion.reference_text;
  delete safeQuestion.explanation;
  return safeQuestion;
};

const toStudentTest = (test) => {
  const data = typeof test.toObject === 'function' ? test.toObject() : { ...test };
  data.name = data.name || data.title;
  data.module_name = data.module_name || data.module_id;
  data.question_count = Array.isArray(data.questions) ? data.questions.length : 0;
  data.questions = (data.questions || []).map(toStudentQuestion);
  return data;
};

module.exports = { toStudentQuestion, toStudentTest };
