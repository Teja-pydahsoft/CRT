const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error(`❌ [Error Handler] Path: ${req.path} | Error:`, err);

  const statusCode = err.statusCode ||
    (err.name === 'MulterError'
      ? (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT' ? 413 : 400)
      : (res.statusCode === 200 ? 500 : res.statusCode));

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
