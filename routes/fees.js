const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Fee = require('../models/Fee');
const Student = require('../models/Student');

// @route   POST /api/fees
// @desc    Create fee record
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.create(req.body);
    res.status(201).json({ success: true, fee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/fees/bulk
// @desc    Create fee records in bulk (e.g., for all students)
// @access  Admin
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentIds, feeType, amount, dueDate, semester, academicYear } = req.body;

    const fees = studentIds.map(studentId => ({
      student: studentId,
      feeType,
      amount,
      dueDate,
      semester,
      academicYear
    }));

    const result = await Fee.insertMany(fees);
    res.status(201).json({ success: true, count: result.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/fees
// @desc    Get fee records
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { studentId, status, feeType, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status) query.status = status;
    if (feeType) query.feeType = feeType;

    // Students can only see own fees
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) query.student = student._id;
    } else if (studentId) {
      query.student = studentId;
    }

    const total = await Fee.countDocuments(query);
    const fees = await Fee.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('student', 'rollNumber department semester')
      .sort('-dueDate')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, fees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/fees/:id/pay
// @desc    Record fee payment
// @access  Admin
router.put('/:id/pay', protect, authorize('admin'), async (req, res) => {
  try {
    const { paidAmount, paymentMethod, transactionId, remarks } = req.body;
    const fee = await Fee.findById(req.params.id);
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

    fee.paidAmount = paidAmount || fee.amount;
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod;
    fee.transactionId = transactionId;
    fee.remarks = remarks;
    fee.status = fee.paidAmount >= fee.amount ? 'paid' : 'partial';

    await fee.save();
    res.json({ success: true, fee, message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/fees/:id
// @desc    Update fee record
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
    res.json({ success: true, fee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/fees/:id
// @desc    Delete fee record
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Fee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Fee record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/fees/student/:studentId/summary
// @desc    Get fee summary for a student
// @access  Admin, Teacher, Student (own)
router.get('/student/:studentId/summary', protect, async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.params.studentId });

    const summary = {
      totalDue: fees.reduce((acc, f) => acc + f.amount, 0),
      totalPaid: fees.reduce((acc, f) => acc + f.paidAmount, 0),
      totalPending: fees.filter(f => f.status === 'unpaid').reduce((acc, f) => acc + f.amount, 0),
      overdue: fees.filter(f => f.status === 'unpaid' && new Date(f.dueDate) < new Date()),
      upcoming: fees.filter(f => f.status === 'unpaid' && new Date(f.dueDate) >= new Date()),
      byType: {}
    };

    fees.forEach(f => {
      if (!summary.byType[f.feeType]) summary.byType[f.feeType] = { total: 0, paid: 0, pending: 0 };
      summary.byType[f.feeType].total += f.amount;
      summary.byType[f.feeType].paid += f.paidAmount;
      if (f.status !== 'paid') summary.byType[f.feeType].pending += f.amount - f.paidAmount;
    });

    res.json({ success: true, summary, fees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
