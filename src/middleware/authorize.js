const AppError = require('../utils/AppError');

module.exports = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('आपको इस कार्य की अनुमति नहीं है।', 403));
    }
    next();
  };
};