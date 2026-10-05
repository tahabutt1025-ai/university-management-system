const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeType: {
    type: String,
    enum: ['Tuition', 'Library', 'Laboratory', 'Examination', 'Sports', 'Hostel', 'Transport', 'Other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  status: {
    type: String,
    enum: ['paid', 'unpaid', 'partial', 'waived'],
    default: 'unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  semester: Number,
  academicYear: String,
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Online', 'Cheque'],
  },
  transactionId: String,
  remarks: String
}, { timestamps: true });

module.exports = mongoose.model('Fee', FeeSchema);
