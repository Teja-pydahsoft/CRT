const mongoose = require('mongoose');
const env = require('../config/env');

const userAttemptKey = { user_id: 1, test_id: 1 };
const sdmsAttemptKey = { sdms_student_id: 1, test_id: 1 };

const hasKeyPattern = (index, keyPattern) => (
  Object.keys(keyPattern).length === Object.keys(index.key || {}).length &&
  Object.entries(keyPattern).every(([key, value]) => index.key[key] === value)
);

const hasPartialFilter = (index, field) => (
  index.partialFilterExpression?.[field]?.$type === 'objectId' ||
  index.partialFilterExpression?.[field]?.$type === 'number'
);

async function migrateIndexes() {
  await mongoose.connect(env.MONGODB_URI);
  const collection = mongoose.connection.collection('exam_attempts');
  const collections = await mongoose.connection.db.listCollections({ name: 'exam_attempts' }).toArray();
  if (!collections.length) {
    await mongoose.connection.db.createCollection('exam_attempts');
  }
  let indexes = await collection.indexes();

  const oldUserIndex = indexes.find((index) => (
    index.unique &&
    hasKeyPattern(index, userAttemptKey) &&
    !index.partialFilterExpression
  ));
  if (oldUserIndex) {
    await collection.dropIndex(oldUserIndex.name);
    console.log(`Dropped legacy unique index: ${oldUserIndex.name}`);
  }

  indexes = await collection.indexes();
  const userIndexExists = indexes.some((index) => (
    index.unique &&
    hasKeyPattern(index, userAttemptKey) &&
    hasPartialFilter(index, 'user_id')
  ));
  if (!userIndexExists) {
    await collection.createIndex(userAttemptKey, {
      name: 'user_id_1_test_id_1',
      unique: true,
      partialFilterExpression: { user_id: { $type: 'objectId' } }
    });
    console.log('Created partial unique index for Mongo user attempts.');
  }

  indexes = await collection.indexes();
  const sdmsIndexExists = indexes.some((index) => (
    index.unique &&
    hasKeyPattern(index, sdmsAttemptKey) &&
    hasPartialFilter(index, 'sdms_student_id')
  ));
  if (!sdmsIndexExists) {
    await collection.createIndex(sdmsAttemptKey, {
      name: 'sdms_student_id_1_test_id_1',
      unique: true,
      partialFilterExpression: { sdms_student_id: { $type: 'number' } }
    });
    console.log('Created partial unique index for SDMS student attempts.');
  }
}

migrateIndexes()
  .catch((error) => {
    console.error('SDMS exam attempt index migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
