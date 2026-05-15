const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  next(new AppError(`रूट ${req.originalUrl} नहीं मिला।`, 404));
};