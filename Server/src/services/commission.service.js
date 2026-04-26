const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');

async function calculateCommission(userId, amount, type, referenceId = null) {
  try {
    const levels = 5;
    const rates = [0.10, 0.05, 0.03, 0.02, 0.01]; // 10%,5%,3%,2%,1%

    let current = await User.findById(userId).populate('sponsorId');
    let level = 0;

    while (current && current.sponsorId && level < levels) {
      const sponsor = current.sponsorId;
      const commissionAmount = amount * rates[level];

      await CommissionTransaction.create({
        user: sponsor._id,
        sponsor: sponsor._id,
        amount: commissionAmount,
        level: level + 1,
        type,
        referenceId,
      });

      await User.findByIdAndUpdate(sponsor._id, {
        $inc: {
          'mlmPayoutInfo.pendingCommission': commissionAmount,
          totalCommissionEarned: commissionAmount,
        },
      });

      current = await User.findById(sponsor._id).populate('sponsorId');
      level++;
    }
  } catch (error) {
    console.error('Commission calculation error:', error);
  }
}

async function processPayout(userId) {
  const user = await User.findById(userId);
  if (!user || user.mlmPayoutInfo.pendingCommission <= 0) return null;

  const amount = user.mlmPayoutInfo.pendingCommission;
  user.walletBalance += amount;
  user.mlmPayoutInfo.pendingCommission = 0;
  user.mlmPayoutInfo.totalWithdrawn += amount;
  user.mlmPayoutInfo.lastPayoutDate = new Date();
  user.mlmPayoutInfo.nextPayoutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  await CommissionTransaction.updateMany(
    { user: userId, status: 'pending' },
    { status: 'paid' }
  );

  return amount;
}

module.exports = { calculateCommission, processPayout };