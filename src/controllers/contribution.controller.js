const WeeklyContribution = require('../models/WeeklyContribution');

exports.recordContribution = async (req, res) => {
  try {
    const { village, amount, purpose } = req.body;
    const contribution = await WeeklyContribution.create({
      gramVikasAdhikari: req.user.id,
      village,
      amount,
      purpose,
      date: new Date(),
    });
    res.status(201).json({ success: true, contribution });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};