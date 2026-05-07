const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

module.exports = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
  }
  next();
};