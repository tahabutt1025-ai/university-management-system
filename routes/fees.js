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
    // S-06 FIX: Allow-list fields
    const { student, feeType, amount, dueDate, semester, academicYear, description } = req.body;
    if (!student || !feeType || !amount || !dueDate) {
      return res.status(400).json({ success: false, message: 'student, feeType, amount, and dueDate are required.' });
    }
    const fee = await Fee.create({
      student,
      feeType: String(feeType).trim().slice(0, 100),
      amount: Math.max(parseFloat(amount) || 0, 0),
      dueDate,
      semester: semester ? parseInt(semester) : undefined,
      academicYear: academicYear ? String(academicYear).trim().slice(0, 20) : undefined,
      description: description ? String(description).trim().slice(0, 500) : undefined,
      status: 'unpaid',
      paidAmount: 0
    });
    res.status(201).json({ success: true, fee });
  } catch (err) {
    console.error('[fees/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create fee record.' });
  }
});

// @route   POST /api/fees/bulk
// @desc    Create fee records in bulk (e.g., for all students)
// @access  Admin
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentIds, feeType, amount, dueDate, semester, academicYear } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required.' });
    }
    // S-06 FIX: Allow-list bulk fields
    const fees = studentIds.map(studentId => ({
      student: studentId,
      feeType: String(feeType || '').trim().slice(0, 100),
      amount: Math.max(parseFloat(amount) || 0, 0),
      dueDate,
      semester: semester ? parseInt(semester) : undefined,
      academicYear: academicYear ? String(academicYear).trim().slice(0, 20) : undefined,
      status: 'unpaid',
      paidAmount: 0
    }));

    const result = await Fee.insertMany(fees, { ordered: false });
    res.status(201).json({ success: true, count: result.length });
  } catch (err) {
    console.error('[fees/bulk]', err);
    res.status(500).json({ success: false, message: 'Failed to create bulk fee records.' });
  }
});

// @route   GET /api/fees
// @desc    Get fee records
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { studentId, status, feeType, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
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
      .limit(limit);

    res.json({ success: true, total, fees });
  } catch (err) {
    console.error('[fees/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load fee records.' });
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

    const paid = parseFloat(paidAmount);
    if (isNaN(paid) || paid <= 0) {
      return res.status(400).json({ success: false, message: 'paidAmount must be a positive number.' });
    }
    // B-07 FIX: Prevent overpayment
    if (paid > fee.amount) {
      return res.status(400).json({ success: false, message: `Payment of PKR ${paid.toLocaleString()} exceeds total fee of PKR ${fee.amount.toLocaleString()}.` });
    }

    fee.paidAmount = paid;
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod ? String(paymentMethod).trim().slice(0, 50) : 'Cash';
    fee.transactionId = transactionId ? String(transactionId).trim().slice(0, 100) : undefined;
    fee.remarks = remarks ? String(remarks).trim().slice(0, 500) : undefined;
    fee.status = fee.paidAmount >= fee.amount ? 'paid' : 'partial';

    await fee.save();
    res.json({ success: true, fee, message: 'Payment recorded' });
  } catch (err) {
    console.error('[fees/pay]', err);
    res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

// @route   PUT /api/fees/:id
// @desc    Update fee record
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // S-06 FIX: Allow-list fields
    const { feeType, amount, dueDate, semester, academicYear, description, status } = req.body;
    const allowedUpdate = {};
    if (feeType      !== undefined) allowedUpdate.feeType      = String(feeType).trim().slice(0, 100);
    if (amount       !== undefined) allowedUpdate.amount       = Math.max(parseFloat(amount) || 0, 0);
    if (dueDate      !== undefined) allowedUpdate.dueDate      = dueDate;
    if (semester     !== undefined) allowedUpdate.semester     = parseInt(semester);
    if (academicYear !== undefined) allowedUpdate.academicYear = String(academicYear).trim().slice(0, 20);
    if (description  !== undefined) allowedUpdate.description  = String(description).trim().slice(0, 500);
    const validStatuses = ['unpaid', 'partial', 'paid', 'waived'];
    if (status !== undefined && validStatuses.includes(status)) allowedUpdate.status = status;

    const fee = await Fee.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true, runValidators: true
    });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
    res.json({ success: true, fee });
  } catch (err) {
    console.error('[fees/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update fee record.' });
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
    console.error('[fees/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete fee record.' });
  }
});

// @route   GET /api/fees/student/:studentId/summary
// @desc    Get fee summary for a student
// @access  Admin — OR Student (own record only)
router.get('/student/:studentId/summary', protect, async (req, res) => {
  try {
    // Ownership enforcement: students can only view their own fees
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id }).select('_id');
      if (!student || student._id.toString() !== req.params.studentId) {
        return res.status(403).json({ success: false, message: 'Access denied: you can only view your own fee records.' });
      }
    }

    const fees = await Fee.find({ student: req.params.studentId });

    // B-07 FIX: Correct totals that include partial and waived statuses
    const summary = {
      totalDue: fees.reduce((acc, f) => acc + f.amount, 0),
      totalPaid: fees.reduce((acc, f) => acc + (f.paidAmount || 0), 0),
      // Only count genuinely unpaid/partial as "pending"
      totalPending: fees
        .filter(f => f.status === 'unpaid' || f.status === 'partial')
        .reduce((acc, f) => acc + (f.amount - (f.paidAmount || 0)), 0),
      overdue: fees.filter(f => (f.status === 'unpaid' || f.status === 'partial') && new Date(f.dueDate) < new Date()),
      upcoming: fees.filter(f => (f.status === 'unpaid' || f.status === 'partial') && new Date(f.dueDate) >= new Date()),
      byType: {}
    };

    fees.forEach(f => {
      if (!summary.byType[f.feeType]) summary.byType[f.feeType] = { total: 0, paid: 0, pending: 0 };
      summary.byType[f.feeType].total += f.amount;
      summary.byType[f.feeType].paid += f.paidAmount || 0;
      if (f.status !== 'paid' && f.status !== 'waived') {
        summary.byType[f.feeType].pending += f.amount - (f.paidAmount || 0);
      }
    });

    res.json({ success: true, summary, fees });
  } catch (err) {
    console.error('[fees/summary]', err);
    res.status(500).json({ success: false, message: 'Failed to load fee summary.' });
  }
});

module.exports = router;
