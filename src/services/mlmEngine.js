// backend/src/services/mlmEngine.js
const User = require('../models/user.model');
const Transaction = require('../models/Transaction.model');
const CommissionSplit = require('../models/CommissionSplit');

/**
 * Distribute commission up the sponsor chain
 * @param {ObjectId} userId - The user whose action triggered commission
 * @param {Number} amount - The base amount on which commission is calculated
 * @param {String} type - e.g., 'license_purchase', 'donation', 'enrollment'
 */
exports.distributeCommission = async (userId, amount, type) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.sponsorId) return;

    // Fetch all commission splits (sorted by levelOffset ascending)
    const splits = await CommissionSplit.find().sort({ levelOffset: 1 });
    if (!splits.length) return;

    let currentSponsorId = user.sponsorId;

    // Iterate through each level
    for (const split of splits) {
      if (!currentSponsorId) break;

      const sponsor = await User.findById(currentSponsorId);
      if (!sponsor) break;

      // Calculate commission
      const commissionAmount = (amount * split.percentage) / 100;
      if (commissionAmount > 0) {
        // Create transaction for sponsor
        await Transaction.create({
          user: sponsor._id,
          amount: commissionAmount,
          type: 'commission',
          status: 'completed',
          description: `${type} से लेवल ${split.levelOffset} कमीशन`,
          reference: userId,
        });

        // Update sponsor's wallet & commission tracking
        sponsor.walletBalance += commissionAmount;
        sponsor.totalCommissionEarned += commissionAmount;
        await sponsor.save();
      }

      // Move up to the next sponsor in chain
      currentSponsorId = sponsor.sponsorId;
    }

    console.log(`✅ MLM Commission distributed for user ${userId}, amount ${amount}, type ${type}`);
  } catch (error) {
    console.error('MLM Commission Distribution Error:', error);
  }
};