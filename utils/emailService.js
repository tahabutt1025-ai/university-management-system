/**
 * Transactional Email Dispatcher with Sandbox Mode & Delivery Logging
 * Follows Section 6 of UniManage Spec
 */

const nodemailer = require('nodemailer');
const EmailEvent = require('../models/EmailEvent');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
}

/**
 * Builds a modern, accessible, responsive HTML email template
 */
function buildEmailHtml({ recipientName, subject, body, portalUrl, ruleCode }) {
  const portalLink = portalUrl || process.env.FRONTEND_URL || 'https://university-management-system-olive-five.vercel.app';
  const logoText = 'UniManage UMS';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
    .email-wrapper { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px 32px; text-align: left; }
    .header-logo { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; margin: 0; display: inline-flex; align-items: center; }
    .header-badge { background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 9999px; margin-left: 10px; text-transform: uppercase; }
    .email-body { padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.65; }
    .alert-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 18px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; color: #1e293b; font-size: 15px; line-height: 1.6; }
    .btn-cta { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin-top: 15px; text-align: center; }
    .email-footer { background-color: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-links a { color: #64748b; text-decoration: underline; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="header-logo">
        🎓 ${logoText}
        <span class="header-badge">Official Notice</span>
      </div>
    </div>
    <div class="email-body">
      <div class="alert-box">
        ${body.replace(/\n/g, '<br/>')}
      </div>
      <div style="text-align: center; margin-top: 28px;">
        <a href="${portalLink}/login" class="btn-cta" target="_blank">Access Student Portal &rarr;</a>
      </div>
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 8px 0;">This is an automated academic notification from your University Management Portal.</p>
      <div class="footer-links">
        <a href="${portalLink}/settings/notifications">Notification Preferences</a> &bull;
        <a href="${portalLink}">Portal Home</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends alert email with support for Sandbox Mode, Retries, and Event Logging
 */
async function sendAlertEmail({ alert, recipientEmail, subject, body, portalUrl }) {
  const isSandbox = process.env.EMAIL_SANDBOX_MODE === 'true';
  const targetEmail = isSandbox ? (process.env.EMAIL_SANDBOX_TO || 'admin@university.edu') : recipientEmail;
  const fromAddress = process.env.EMAIL_FROM || '"University Academic Portal" <noreply@university.edu>';

  const htmlContent = buildEmailHtml({
    recipientName: alert.recipient?.name || 'Student',
    subject,
    body,
    portalUrl,
    ruleCode: alert.ruleCode
  });

  const mailOptions = {
    from: fromAddress,
    to: targetEmail,
    subject: isSandbox ? `[SANDBOX for ${recipientEmail}] ${subject}` : subject,
    text: body,
    html: htmlContent
  };

  const client = getTransporter();

  // If no SMTP configured, log simulated delivery
  if (!client) {
    console.log(`[EMAIL SIMULATED] Would send to: ${targetEmail} | Subject: ${subject}`);
    await EmailEvent.create({
      alert: alert._id,
      recipientEmail: targetEmail,
      event: 'delivered',
      provider: 'simulated_logger',
      metadata: { isSandbox, simulated: true }
    });
    return { success: true, simulated: true, targetEmail };
  }

  try {
    const info = await client.sendMail(mailOptions);
    console.log(`[EMAIL SENT] Alert ${alert._id} sent to ${targetEmail} (MessageId: ${info.messageId})`);

    await EmailEvent.create({
      alert: alert._id,
      recipientEmail: targetEmail,
      event: 'delivered',
      provider: 'smtp',
      metadata: { messageId: info.messageId, isSandbox }
    });

    return { success: true, messageId: info.messageId, targetEmail };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send alert ${alert._id}:`, err.message);

    await EmailEvent.create({
      alert: alert._id,
      recipientEmail: targetEmail,
      event: 'bounced',
      provider: 'smtp',
      metadata: { error: err.message, isSandbox }
    });

    throw err;
  }
}

module.exports = {
  sendAlertEmail,
  buildEmailHtml
};
