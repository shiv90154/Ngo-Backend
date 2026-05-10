// backend/src/services/mlmEngine.js
const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');
const CommissionSplit = require('../models/CommissionSplit'); // 🆕 डायनामिक स्प्लिट के लिए
const mailer = require('../utils/sendEmail');

/**
 * Distribute commission up the sponsor chain
 * @param {ObjectId} userId - The user whose action triggered commission
 * @param {Number} amount - The base amount on which commission is calculated
 * @param {String} type - e.g., 'license_purchase', 'donation', 'enrollment'
 * @param {ObjectId|null} referenceId - Reference to the purchase/donation
 */
async function calculateCommission(userId, amount, type, referenceId = null) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.sponsorId) return;

    // 🆕 डायनामिक कमीशन प्रतिशत (एडमिन से बदलने योग्य)
    const splits = await CommissionSplit.find().sort({ levelOffset: 1 });
    if (!splits.length) {
      console.warn('No CommissionSplit found – using default 5-level fixed rates');
      // फॉलबैक: पुराने हार्डकोडेड रेट
      await distributeWithFixedRates(userId, amount, type, referenceId);
      return;
    }

    let currentSponsor = user;
    let level = 0;

    // स्पॉन्सर चेन में ऊपर जाओ
    while (currentSponsor.sponsorId && level < splits.length) {
      const sponsor = await User.findById(currentSponsor.sponsorId);
      if (!sponsor) break;

      const split = splits[level];
      const commissionAmount = (amount * split.percentage) / 100;

      if (commissionAmount > 0) {
        // 1️⃣ CommissionTransaction रिकॉर्ड बनाओ
        await CommissionTransaction.create({
          user: sponsor._id,
          sponsor: sponsor._id,
          amount: commissionAmount,
          level: level + 1,
          type,
          referenceId,
        });

        // 2️⃣ स्पॉन्सर के पेंडिंग कमीशन और कुल कमाई अपडेट करो
        await User.findByIdAndUpdate(sponsor._id, {
          $inc: {
            'mlmPayoutInfo.pendingCommission': commissionAmount,
            totalCommissionEarned: commissionAmount,
          },
        });

        // 3️⃣ स्पॉन्सर को ईमेल भेजो (असफल होने पर भी रुको मत)
        try {
          await mailer.sendCommissionCredited(
            sponsor.email,
            sponsor.fullName,
            commissionAmount,
            type.replace('_', ' ')
          );
        } catch (emailErr) {
          console.error('Commission email failed:', emailErr.message);
        }
      }

      // अगले लेवल पर जाओ
      currentSponsor = sponsor;
      level++;
    }

    console.log(`✅ Commission distributed for ${userId}, amount ${amount}, type ${type}`);
  } catch (error) {
    console.error('Commission calculation error:', error);
  }
}

/**
 * Fallback: Fixed 5-level rates (used when CommissionSplit table is empty)
 */
async function distributeWithFixedRates(userId, amount, type, referenceId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.sponsorId) return;

    const rates = [0.10, 0.05, 0.03, 0.02, 0.01]; // 10%,5%,3%,2%,1%
    let currentSponsor = user;
    let level = 0;

    while (currentSponsor.sponsorId && level < rates.length) {
      const sponsor = await User.findById(currentSponsor.sponsorId);
      if (!sponsor) break;

      const commissionAmount = amount * rates[level];
      if (commissionAmount > 0) {
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

        try {
          await mailer.sendCommissionCredited(
            sponsor.email,
            sponsor.fullName,
            commissionAmount,
            type.replace('_', ' ')
          );
        } catch (emailErr) {
          console.error('Commission email failed:', emailErr.message);
        }
      }
      currentSponsor = sponsor;
      level++;
    }
  } catch (error) {
    console.error('Fallback commission error:', error);
  }
}

/**
 * Process payout – move pending commission to wallet
 * @param {ObjectId} userId
 * @returns {Number|null} amount paid out, or null if nothing to pay
 */
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

  // पेंडिंग कमीशन ट्रांजेक्शंस को "paid" करो
  await CommissionTransaction.updateMany(
    { user: userId, status: 'pending' },
    { status: 'paid' }
  );

  return amount;
}

module.exports = { calculateCommission, processPayout };