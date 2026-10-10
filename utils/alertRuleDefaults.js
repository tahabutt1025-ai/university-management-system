/**
 * Default Alert Rules Configuration & Fallback Templates
 * Follows section 4 of the UniManage Spec
 */

const DEFAULT_ALERT_RULES = [
  {
    code: 'low_attendance',
    name: 'Low Attendance Alert',
    description: 'Triggered when attendance in any course drops below the required threshold.',
    threshold: 75,
    cooldownDays: 7,
    audience: 'student',
    schedule: 'daily',
    tone: 'firm_warning',
    fallbackSubjectTemplate: 'Your {{courseName}} attendance needs attention',
    fallbackBodyTemplate: 'Hi {{firstName}}, your attendance in {{courseName}} is {{attendanceRate}}% ({{attendedClasses}} of {{totalClasses}} classes). The university minimum is {{threshold}}%, so you can miss at most {{classesCanMiss}} more classes this semester. Please speak with your instructor if there is a problem. View details in the portal.'
  },
  {
    code: 'attendance_drop',
    name: 'Sudden Attendance Drop Warning',
    description: 'Triggered when attendance falls by 15 points or more over a 2-week period.',
    threshold: 15,
    cooldownDays: 7,
    audience: 'student',
    schedule: 'weekly',
    tone: 'firm_warning',
    fallbackSubjectTemplate: 'Notice regarding recent attendance drop in {{courseName}}',
    fallbackBodyTemplate: 'Hi {{firstName}}, our system noticed a recent decline of {{dropPercentage}}% in your attendance for {{courseName}} over the last two weeks. Maintaining steady class participation is critical for exam eligibility. Please reach out to your academic advisor if you need support. View details in the portal.'
  },
  {
    code: 'fee_due_soon',
    name: 'Fee Due Reminder',
    description: 'Upcoming semester fee reminder sent 7 days and 2 days before the due date.',
    threshold: 7,
    secondaryThreshold: 2,
    cooldownDays: 4,
    audience: 'student',
    schedule: 'daily',
    tone: 'friendly',
    fallbackSubjectTemplate: 'Upcoming Fee Reminder: {{feeTitle}} due on {{dueDate}}',
    fallbackBodyTemplate: 'Hi {{firstName}}, this is a friendly reminder that your {{feeTitle}} payment of PKR {{amountDue}} is due on {{dueDate}} (in {{daysRemaining}} days). Please ensure timely payment to avoid late surcharges. View details in the portal.'
  },
  {
    code: 'fee_overdue',
    name: 'Overdue Fee Notice',
    description: 'Firm notice sent when a fee remains unpaid past the deadline.',
    threshold: 0,
    cooldownDays: 5,
    maxOccurrences: 3,
    audience: 'student',
    schedule: 'daily',
    tone: 'urgent',
    fallbackSubjectTemplate: 'Urgent: Overdue Fee Notice for {{feeTitle}}',
    fallbackBodyTemplate: 'Dear {{firstName}}, your payment of PKR {{amountDue}} for {{feeTitle}} was due on {{dueDate}} and remains outstanding. Please clear the pending dues immediately or contact the accounts office to prevent administrative holds on your portal. View details in the portal.'
  },
  {
    code: 'new_result_published',
    name: 'New Exam Result Published',
    description: 'Instant notification when an instructor publishes marks for a quiz, midterm, or final.',
    threshold: 0,
    cooldownDays: 1,
    audience: 'student',
    schedule: 'on_event',
    tone: 'informative',
    fallbackSubjectTemplate: 'New Results Published: {{examType}} for {{courseName}}',
    fallbackBodyTemplate: 'Hi {{firstName}}, your marks for {{examType}} in {{courseName}} have been uploaded. You scored {{marksObtained}} out of {{totalMarks}} ({{percentage}}%). Review your performance breakdown and feedback in the portal. View details in the portal.'
  },
  {
    code: 'grade_trend_warning',
    name: 'Grade Trend Early Warning',
    description: 'Warning alert when a student experiences 2 consecutive declining scores in a subject.',
    threshold: 2,
    cooldownDays: 7,
    audience: 'student',
    schedule: 'weekly',
    tone: 'informative',
    fallbackSubjectTemplate: 'Academic Support Notice for {{courseName}}',
    fallbackBodyTemplate: 'Hi {{firstName}}, our system noticed that your recent scores in {{courseName}} have declined across consecutive assessments (current average: {{currentAverage}}%). We encourage you to attend faculty office hours or seek peer tutoring early. View details in the portal.'
  },
  {
    code: 'upcoming_deadline',
    name: 'Upcoming Assignment / Exam Notice',
    description: 'Reminder for deadlines or exams scheduled within the next 3 days.',
    threshold: 3,
    cooldownDays: 1,
    audience: 'student',
    schedule: 'daily',
    tone: 'friendly',
    fallbackSubjectTemplate: 'Reminder: {{itemTitle}} due in {{daysRemaining}} days',
    fallbackBodyTemplate: 'Hi {{firstName}}, you have an upcoming {{itemType}} in {{courseName}} titled "{{itemTitle}}" scheduled for {{dueDate}}. Please verify your submission preparation. View details in the portal.'
  },
  {
    code: 'new_notice',
    name: 'Official Campus Notice',
    description: 'Broadcast notice published by department heads or campus administration.',
    threshold: 0,
    cooldownDays: 1,
    audience: 'all',
    schedule: 'on_event',
    tone: 'informative',
    fallbackSubjectTemplate: 'Notice: {{noticeTitle}}',
    fallbackBodyTemplate: 'Dear {{firstName}}, an official campus announcement has been published regarding "{{noticeTitle}}": {{noticeSnippet}}. View details in the portal.'
  },
  {
    code: 'at_risk_digest',
    name: 'Weekly Teacher At-Risk Digest',
    description: 'Weekly summary delivered to teachers detailing students with attendance or score flags.',
    threshold: 75,
    cooldownDays: 7,
    audience: 'teacher',
    schedule: 'weekly',
    tone: 'informative',
    fallbackSubjectTemplate: 'Weekly Academic At-Risk Digest — {{courseName}}',
    fallbackBodyTemplate: 'Dear {{teacherName}}, here is your weekly summary for {{courseName}}. {{atRiskCount}} students are currently flagged for low attendance or declining grades. Review the full list and recorded interventions in your teacher dashboard. View details in the portal.'
  },
  {
    code: 'admin_daily_summary',
    name: 'Admin Daily System Summary',
    description: 'Daily operational summary for university management detailing fee defaulters and critical risks.',
    threshold: 0,
    cooldownDays: 1,
    audience: 'admin',
    schedule: 'daily',
    tone: 'informative',
    fallbackSubjectTemplate: 'Daily Campus Alert Summary — {{dateStr}}',
    fallbackBodyTemplate: 'System Summary for {{dateStr}}: {{totalAlertsSent}} alerts dispatched, {{atRiskTotal}} students flagged under academic watch, and {{overdueFeesTotal}} overdue fee accounts active. Full audit log available in admin console. View details in the portal.'
  }
];

module.exports = { DEFAULT_ALERT_RULES };
