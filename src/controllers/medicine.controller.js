const Medicine = require('../models/Medicine');
const MedicineOrder = require('../models/MedicineOrder');

// GET /api/medicines – list medicines (with search, category, pagination)
exports.getMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
      ];
    }

    const medicines = await Medicine.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ name: 1 });

    const total = await Medicine.countDocuments(filter);

    res.json({
      success: true,
      medicines,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/medicines/search?q=… – full‑text search
exports.searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, medicines: [] });

    // Try full‑text search first, fallback to regex
    const medicines = await Medicine.find(
      { $text: { $search: q }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);

    res.json({ success: true, medicines });
  } catch (error) {
    // If text index not created, fallback to regex
    try {
      const regex = new RegExp(q, 'i');
      const medicines = await Medicine.find({
        isActive: true,
        $or: [{ name: regex }, { genericName: regex }],
      }).limit(20);
      res.json({ success: true, medicines });
    } catch (err) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// GET /api/medicines/:id
exports.getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/medicines – admin add medicine
exports.addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/medicines/:id – admin update
exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/medicines/:id – admin delete
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/medicines/:id/stock – update stock
exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, { stock }, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/medicines/order – place an order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, prescriptionId } = req.body;
    const userId = req.user.id;

    // Validate medicines and stock
    const medicineIds = items.map(i => i.medicine);
    const medicines = await Medicine.find({ _id: { $in: medicineIds }, isActive: true });
    if (medicines.length !== items.length) {
      return res.status(400).json({ success: false, message: 'Some medicines are not available' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const med = medicines.find(m => m._id.toString() === item.medicine);
      if (!med) {
        return res.status(400).json({ success: false, message: `Medicine ${item.medicine} not found` });
      }
      if (med.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${med.name}` });
      }
      if (med.prescriptionRequired && !prescriptionId) {
        return res.status(400).json({ success: false, message: `Prescription required for ${med.name}` });
      }

      orderItems.push({
        medicine: med._id,
        name: med.name,
        quantity: item.quantity,
        price: med.price,
      });
      totalAmount += med.price * item.quantity;
    }

    const order = await MedicineOrder.create({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      payment: { method: paymentMethod || 'wallet', status: 'pending' },
      prescriptionId: prescriptionId || null,
      createdBy: userId,
    });

    // Decrease stock
    for (const item of items) {
      await Medicine.findByIdAndUpdate(item.medicine, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json({ success: true, message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/medicines/orders/my – user's order history
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await MedicineOrder.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.medicine', 'name imageUrl');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/medicines/orders/:id – single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await MedicineOrder.findById(req.params.id)
      .populate('items.medicine', 'name imageUrl');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Authorization: user can see own orders, admin can see all
    if (req.user.role !== 'SUPER_ADMIN' && order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/medicines/orders/:id/status – admin update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await MedicineOrder.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await MedicineOrder.find()
      .sort({ createdAt: -1 })
      .populate('user', 'fullName email')
      .populate('items.medicine', 'name');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};