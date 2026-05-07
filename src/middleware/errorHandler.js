const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => new AppError(`अमान्य ${err.path}: ${err.value}`, 400);
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  return new AppError(`डुप्लिकेट फील्ड वैल्यू: ${value}. कृपया दूसरी वैल्यू का प्रयोग करें।`, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  return new AppError(`अमान्य इनपुट डेटा। ${errors.join('. ')}`, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      success: false,
      message: 'कुछ गलत हो गया!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    sendErrorProd(error, res);
  }
};