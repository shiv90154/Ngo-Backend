const ProductSale = require('../models/ProductSale');
const LicensePurchase = require('../models/LicensePurchase');
const User = require('../models/user.model');
const PIShare = require('../models/PIShare');
const Transaction = require('../models/Transaction.model');

exports.distributeMonthlyPI = async () => {
  const now = new Date();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const productSales = await ProductSale.find({
    purchaseDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });
  const licenseSales = await LicensePurchase.find({
    purchaseDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });

  const totalSales = [...productSales, ...licenseSales].reduce((sum, sale) => sum + sale.amount, 0);

  if (totalSales === 0) {
    console.log('No sales last month, skipping PI distribution');
    return { piPool: 0, distributedTotal: 0, remaining: 0 };
  }

  const piPool = totalSales * 0.5;
  const shares = await PIShare.find({ isActive: true });
  let distributedTotal = 0;

  for (const share of shares) {
    const usersOfRole = await User.find({
      role: share.role,
      isActive: true,
      isDeleted: false,
    });

    if (usersOfRole.length === 0) continue;

    const roleTotal = (piPool * share.percentage) / 100;
    const perUser = roleTotal / usersOfRole.length;

    for (const user of usersOfRole) {
      user.walletBalance += perUser;
      user.totalEarnings += perUser;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: 'credit',
        amount: perUser,
        description: `PI Distribution - ${share.role} (${share.percentage}%)`,
        status: 'completed',
      });
    }

    distributedTotal += roleTotal;
  }

  const remaining = piPool - distributedTotal;

  return { piPool, distributedTotal, remaining };
};