const { body, param, query } = require('express-validator');

exports.createPost = [
  body('content')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Content cannot exceed 2000 characters'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string'),
];

exports.updatePost = [
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('content')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Content cannot exceed 2000 characters'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  body('location')
    .optional()
    .isString(),
];

exports.addComment = [
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('text')
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
];

exports.deleteComment = [
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
];

exports.followUser = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
];