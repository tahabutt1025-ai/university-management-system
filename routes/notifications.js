const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get user's notifications (own only — enforced by query)
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, isRead, type } = req.query;
    // H-08 FIX: cap limit at 100
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    // Scoped to own notifications — students/teachers can't see others' (H-02)
    let query = { recipient: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = String(type).trim().slice(0, 50);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, total, unreadCount, notifications });
  } catch (err) {
    console.error('[notifications/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

// @route   POST /api/notifications
// @desc    Create notification (system/admin use)
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    // S-06 FIX: Allow-list fields — never pass raw req.body to Notification.create
    const { recipient, title, message, type, priority, link } = req.body;

    if (!recipient || !title || !message) {
      return res.status(400).json({ success: false, message: 'recipient, title and message are required.' });
    }

    const VALID_TYPES = ['attendance_alert', 'grade_update', 'fee_reminder', 'ai_insight', 'assignment_due', 'general'];
    const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    const notification = await Notification.create({
      recipient: String(recipient).trim(),
      title:    String(title).trim().slice(0, 200),
      message:  String(message).trim().slice(0, 2000),
      type:     VALID_TYPES.includes(type) ? type : 'general',
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
      link:     link ? String(link).trim().slice(0, 500) : undefined
    });

    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error('[notifications/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create notification.' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read (own only)
// @access  All authenticated
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id }, // ownership enforced
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.json({ success: true, notification });
  } catch (err) {
    console.error('[notifications/read]', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all own notifications as read
// @access  All authenticated
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[notifications/read-all]', err);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete own notification
// @access  All authenticated
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('[notifications/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
});

module.exports = router;
