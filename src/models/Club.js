const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // एक सदस्य का केवल एक क्लब रिकॉर्ड
    },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Crown'],
      default: 'Bronze',
    },
    totalPoints: { type: Number, default: 0 },          // lifetime points
    currentPoints: { type: Number, default: 0 },        // redeemable points
    totalEarnings: { type: Number, default: 0 },        // total commission earned via club
    pendingRewards: { type: Number, default: 0 },       // rewards not yet claimed
    referralCount: { type: Number, default: 0 },        // number of members referred
    downlineCount: { type: Number, default: 0 },        // total downline members (if MLM)
    achievements: [
      {
        title: String,
        description: String,
        date: { type: Date, default: Date.now },
        icon: String,                                   // optional icon class
      },
    ],
    lastUpgradeDate: Date,
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

clubSchema.index({ member: 1 });
clubSchema.index({ tier: 1 });
clubSchema.index({ totalPoints: -1 });

module.exports = mongoose.model('Club', clubSchema);