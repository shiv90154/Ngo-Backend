const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

module.exports = (validations = []) => async (req, res, next) => {
  try {
    const validationArray = Array.isArray(validations)
      ? validations
      : [validations];

    await Promise.all(validationArray.map((v) => v.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(
        new AppError(errors.array().map((e) => e.msg).join(", "), 400)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};