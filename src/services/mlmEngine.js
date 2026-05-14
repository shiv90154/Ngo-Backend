// backend/src/services/mlmEngine.js
const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');
const CommissionSplit = require('../models/CommissionSplit');
const CommissionLog = require('../models/CommissionLog');  // 🆕
const mailer = require('../utils/sendEmail');

/**
 * Distribute commission up the sponsor chain
 * @param {ObjectId} userId - The user whose action triggered commission
 * @param {Number} amount - The base amount on which commission is calculated
 * @param {String} type - e.g., 'license_sale', 'education_sale', 'agriculture_sale', 'donation'
 * @param {ObjectId|null} referenceId - Reference to the purchase/donation
 */
async function calculateCommission(userId, amount, type, referenceId = null) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.sponsorId) return;

    // 🆕 प्रोडक्ट टाइप के हिसाब से स्प्लिट लाएँ (type + 'all' दोनों)
    const splits = await CommissionSplit.find({
      productType: { $in: [type, 'all'] },
      isActive: true,
    }).sort({ levelOffset: 1 });

    if (!splits.length) {
      console.warn(`No CommissionSplit found for type ${type} – using default fixed rates`);
      await distributeWithFixedRates(userId, amount, type, referenceId);
      return;
    }

    let currentSponsor = user;
    let level = 0;

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

        // 🆕 2️⃣ CommissionLog रिकॉर्ड बनाओ (पूरी डिटेल के साथ)
        await CommissionLog.create({
          purchase: type === 'license_sale' ? referenceId : null,
          sale: type === 'education_sale' || type === 'agriculture_sale' ? referenceId : null,
          user: sponsor._id,
          fromUser: userId,
          amount: commissionAmount,
          productType: type.replace('_sale', ''),  // 'license', 'education', 'agriculture', 'donation'
          percentage: split.percentage,
          level: level + 1,
          role: sponsor.role,
          status: 'pending',
          description: `${type.replace(/_/g, ' ')} commission for level ${level + 1}`,
        });

        // 3️⃣ स्पॉन्सर के पेंडिंग कमीशन और कुल कमाई अपडेट करो
        await User.findByIdAndUpdate(sponsor._id, {
          $inc: {
            'incentivePayoutInfo.pendingIncentive': commissionAmount,
            totalIncentiveEarned: commissionAmount,
          },
        });

        // 4️⃣ स्पॉन्सर को ईमेल भेजो
        try {
          await mailer.sendCommissionCredited(
            sponsor.email,
            sponsor.fullName,
            commissionAmount,
            type.replace(/_/g, ' ')
          );
        } catch (emailErr) {
          console.error('Commission email failed:', emailErr.message);
        }
      }

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

    const rates = [0.10, 0.05, 0.03, 0.02, 0.01];
    let currentSponsor = user;
    let level = 0;

    while (currentSponsor.sponsorId && level < rates.length) {
      const sponsor = await User.findById(currentSponsor.sponsorId);
      if (!sponsor) break;

      const commissionAmount = amount * rates[level];
      if (commissionAmount > 0) {
        // Transaction
        await CommissionTransaction.create({
          user: sponsor._id,
          sponsor: sponsor._id,
          amount: commissionAmount,
          level: level + 1,
          type,
          referenceId,
        });

        // 🆕 CommissionLog
        await CommissionLog.create({
          purchase: type === 'license_sale' ? referenceId : null,
          sale: type === 'education_sale' || type === 'agriculture_sale' ? referenceId : null,
          user: sponsor._id,
          fromUser: userId,
          amount: commissionAmount,
          productType: type.replace('_sale', ''),
          percentage: rates[level] * 100,
          level: level + 1,
          role: sponsor.role,
          status: 'pending',
          description: `Fallback ${type.replace(/_/g, ' ')} commission for level ${level + 1}`,
        });

        await User.findByIdAndUpdate(sponsor._id, {
          $inc: {
            'incentivePayoutInfo.pendingIncentive': commissionAmount,
            totalIncentiveEarned: commissionAmount,
          },
        });

        try {
          await mailer.sendCommissionCredited(
            sponsor.email,
            sponsor.fullName,
            commissionAmount,
            type.replace(/_/g, ' ')
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
 */
async function processPayout(userId) {
  const user = await User.findById(userId);
  if (!user || (user.incentivePayoutInfo?.pendingIncentive || 0) <= 0) return null;

  const amount = user.incentivePayoutInfo.pendingIncentive;
  user.walletBalance += amount;
  user.incentivePayoutInfo.pendingIncentive = 0;
  user.incentivePayoutInfo.totalWithdrawn = (user.incentivePayoutInfo.totalWithdrawn || 0) + amount;
  user.incentivePayoutInfo.lastPayoutDate = new Date();
  user.incentivePayoutInfo.nextPayoutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  await CommissionTransaction.updateMany(
    { user: userId, status: 'pending' },
    { status: 'paid' }
  );

  // 🆕 CommissionLog भी अपडेट करो
  await CommissionLog.updateMany(
    { user: userId, status: 'pending' },
    { status: 'paid' }
  );

  return amount;
}

module.exports = { calculateCommission, processPayout };