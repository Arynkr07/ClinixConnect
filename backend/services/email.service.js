import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

function getTransporter() {
  // Always recreate if env changes or transporter is null
  const smtpUser = env.SMTP_EMAIL;
  const smtpPass = env.SMTP_APP_PASSWORD;

  // Don't attempt to create transporter if credentials are missing or placeholder
  if (!smtpUser || !smtpPass || smtpUser === 'asdaiso@gmail.com' || smtpPass === 'hzhdresd') {
    console.warn('[email] SMTP credentials are not configured. Set SMTP_EMAIL and SMTP_APP_PASSWORD on Render.');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_SERVER || 'smtp.gmail.com',
      port: Number(env.SMTP_PORT) || 587,
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export const emailService = {
  /**
   * Send an email notification via Nodemailer SMTP with fallback logging
   */
  async sendEmail({ to, subject, html, text }) {
    console.log(`\n================= [EMAIL DISPATCH VIA SMTP] =================`);
    console.log(`FROM: ${env.SMTP_EMAIL}`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`TIMESTAMP: ${new Date().toISOString()}`);
    console.log(`=============================================================\n`);

    const mailer = getTransporter();
    if (!mailer) {
      console.warn(`[SMTP SKIPPED] Email not sent to ${to} — SMTP not configured (set SMTP_EMAIL + SMTP_APP_PASSWORD env vars on Render).`);
      return { success: false, error: 'SMTP not configured', to, subject };
    }

    try {
      const info = await mailer.sendMail({
        from: `"ClinixConnect Healthcare" <${env.SMTP_EMAIL}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[SMTP SUCCESS] Message delivered successfully to ${to} (ID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
        to,
        subject,
      };
    } catch (err) {
      console.error(`[SMTP ERROR] Failed to deliver email to ${to}:`, err.message);
      // Reset transporter on auth failure so it gets recreated next time
      if (err.code === 'EAUTH' || err.responseCode === 535) {
        transporter = null;
      }
      return {
        success: false,
        error: err.message,
        to,
        subject,
      };
    }
  },

  /**
   * Booking confirmation for the Patient
   */
  async sendBookingConfirmation({ patientEmail, patientName = 'Patient', doctorName, date, startTime, mode, calendarLink }) {
    const subject = `Appointment Confirmed with ${doctorName} on ${date}`;
    const text = `Dear ${patientName}, your appointment with ${doctorName} is confirmed for ${date} at ${startTime} (${mode}). Sync with Google Calendar: ${calendarLink || 'N/A'}`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">Appointment Confirmation</h2>
        <p style="font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
        <p>Your healthcare appointment has been successfully booked and confirmed in our system.</p>
        <div style="background:#E6F4EA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #1B5E4F;">
          <p style="margin: 6px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${startTime}</p>
          <p style="margin: 6px 0;"><strong>Consultation Mode:</strong> ${mode}</p>
        </div>
        ${calendarLink ? `<p style="margin: 24px 0;"><a href="${calendarLink}" style="display:inline-block;padding:12px 24px;background:#1B5E4F;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">Add to Google Calendar</a></p>` : ''}
        <p style="color: #49454F; font-size: 13px;">Please arrive 10 minutes prior to your scheduled consultation time.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Healthcare Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: patientEmail, subject, html, text });
  },

  /**
   * Booking notification for the Doctor
   */
  async sendDoctorNewAppointmentAlert({ doctorEmail, doctorName, patientName, date, startTime, chiefComplaint, urgency, calendarLink }) {
    const subject = `New Patient Appointment: ${patientName} on ${date} (${urgency || 'Normal'} Urgency)`;
    const text = `Dr. ${doctorName}, you have a new appointment with ${patientName} on ${date} at ${startTime}. Chief complaint: ${chiefComplaint || 'General'}. Urgency: ${urgency || 'Normal'}.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">New Appointment Scheduled</h2>
        <p style="font-size: 16px;">Dear <strong>Dr. ${doctorName}</strong>,</p>
        <p>A new patient consultation has been scheduled in your clinic calendar.</p>
        <div style="background:#E6F4EA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid ${urgency === 'High' || urgency === 'Critical' ? '#BA1A1A' : '#1B5E4F'};">
          <p style="margin: 6px 0;"><strong>Patient:</strong> ${patientName}</p>
          <p style="margin: 6px 0;"><strong>Date & Time:</strong> ${date} at ${startTime}</p>
          <p style="margin: 6px 0;"><strong>AI Triage Urgency:</strong> <span style="color: ${urgency === 'High' || urgency === 'Critical' ? '#BA1A1A' : '#1B5E4F'}; font-weight: bold;">${urgency || 'Low'}</span></p>
          <p style="margin: 6px 0;"><strong>Chief Complaint:</strong> ${chiefComplaint || 'Routine Consultation'}</p>
        </div>
        ${calendarLink ? `<p style="margin: 24px 0;"><a href="${calendarLink}" style="display:inline-block;padding:12px 24px;background:#1B5E4F;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">Sync to Google Calendar</a></p>` : ''}
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Clinical System</strong></p>
      </div>
    `;

    return this.sendEmail({ to: doctorEmail, subject, html, text });
  },

  /**
   * Cancellation Alert (Sent to both Patient and Doctor)
   */
  async sendCancellationAlert({ recipientEmail, recipientName, doctorName, patientName, date, startTime, reason, isDoctor = false }) {
    const subject = `Appointment Cancelled for ${date} at ${startTime}`;
    const text = `The appointment between ${doctorName} and ${patientName} on ${date} at ${startTime} has been cancelled. Reason: ${reason || 'Patient/Doctor requested'}.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #BA1A1A; margin-top: 0;">Appointment Cancellation Notice</h2>
        <p style="font-size: 16px;">Dear <strong>${recipientName || (isDoctor ? doctorName : patientName)}</strong>,</p>
        <p>This is to confirm that the following appointment has been cancelled:</p>
        <div style="background:#FFEDEA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #BA1A1A;">
          <p style="margin: 6px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 6px 0;"><strong>Patient:</strong> ${patientName}</p>
          <p style="margin: 6px 0;"><strong>Scheduled Time:</strong> ${date} at ${startTime}</p>
          <p style="margin: 6px 0;"><strong>Cancellation Reason:</strong> ${reason || 'Requested by user'}</p>
        </div>
        ${!isDoctor ? `<p style="font-size: 14px;">You can rebook anytime using the ClinixConnect patient portal.</p>` : ''}
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Care Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: recipientEmail, subject, html, text });
  },

  /**
   * Reschedule confirmation for Patient and Doctor
   */
  async sendRescheduleAlert({ recipientEmail, recipientName, doctorName, patientName, oldDate, oldTime, newDate, newTime, calendarLink }) {
    const subject = `Appointment Rescheduled: Consultation on ${newDate} at ${newTime}`;
    const text = `Hello ${recipientName}, your appointment with ${doctorName} has been rescheduled from ${oldDate || ''} ${oldTime || ''} to ${newDate} at ${newTime}. Sync: ${calendarLink || 'N/A'}`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #006874; margin-top: 0;">📅 Appointment Rescheduled</h2>
        <p style="font-size: 16px;">Dear <strong>${recipientName || patientName}</strong>,</p>
        <p>Your appointment between <strong>${patientName}</strong> and <strong>${doctorName}</strong> has been successfully rescheduled.</p>
        <div style="background:#E0F3F8; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #006874;">
          <p style="margin: 6px 0; text-decoration: line-through; color: #70777C;"><strong>Previous Time:</strong> ${oldDate || ''} ${oldTime || ''}</p>
          <p style="margin: 6px 0; font-size: 16px; color: #006874;"><strong>New Scheduled Time:</strong> ${newDate} at ${newTime}</p>
          <p style="margin: 6px 0;"><strong>Doctor:</strong> ${doctorName}</p>
        </div>
        ${calendarLink ? `<p style="margin: 24px 0;"><a href="${calendarLink}" style="display:inline-block;padding:12px 24px;background:#006874;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">Update in Google Calendar</a></p>` : ''}
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Care Team</strong></p>
      </div>
    `;
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  },

  /**
   * Doctor Leave & Appointment Cancellation Alert
   */
  async sendDoctorLeaveCancellation({ patientEmail, doctorName, date, reason }) {
    const subject = `Important: Appointment Rescheduled - Dr. ${doctorName} on Leave`;
    const text = `Dr. ${doctorName} is scheduled on leave on ${date}. Your appointment has been cancelled. Please visit the patient portal to choose an alternative slot.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #BA1A1A; margin-top: 0;">Doctor Leave Notice: Action Required</h2>
        <p style="font-size: 16px;">Dear Patient,</p>
        <p>We regret to inform you that <strong>Dr. ${doctorName}</strong> will be on leave on <strong>${date}</strong> (${reason || 'Scheduled leave'}).</p>
        <div style="background:#FFEDEA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #BA1A1A;">
          <p style="margin: 0; font-weight: bold; color: #BA1A1A;">Your appointment on ${date} has been cancelled due to doctor leave.</p>
        </div>
        <p>Please log in to your patient portal to pick an alternative slot or select another specialist.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Care Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: patientEmail, subject, html, text });
  },

  /**
   * Medication Reminder Notification
   */
  async sendMedicationReminder({ patientEmail, patientName = 'Patient', medicineName, dosage, timeSlot }) {
    const subject = `Medication Reminder: ${medicineName} (${timeSlot})`;
    const text = `Reminder: Please take your prescribed dose of ${medicineName} (${dosage}) for ${timeSlot}.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">💊 Medication Reminder</h2>
        <p style="font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
        <p>It is time to take your prescribed medication:</p>
        <div style="background:#E6F4EA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #1B5E4F;">
          <h3 style="margin:0 0 8px 0; color: #1B5E4F;">${medicineName}</h3>
          <p style="margin:0;"><strong>Dosage:</strong> ${dosage} (${timeSlot})</p>
        </div>
        <p style="color: #49454F; font-size: 13px;">Please follow any dietary instructions given on your prescription.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Care Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: patientEmail, subject, html, text });
  },

  /**
   * Password Reset Verification Code via SMTP
   */
  async sendPasswordResetOTP({ email, name = 'User', otpCode }) {
    const subject = `ClinixConnect Security: Password Reset Code ${otpCode}`;
    const text = `Dear ${name}, your password reset verification code is ${otpCode}. Valid for 15 minutes.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p>We received a request to reset your password for your ClinixConnect account.</p>
        <div style="background:#E6F4EA; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0; border: 2px dashed #1B5E4F;">
          <p style="font-size: 14px; margin: 0; color: #49454F;">YOUR 6-DIGIT VERIFICATION CODE</p>
          <h1 style="font-size: 36px; letter-spacing: 6px; color: #1B5E4F; margin: 8px 0 0 0;">${otpCode}</h1>
        </div>
        <p style="font-size: 14px; color: #49454F;">This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Security Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html, text });
  },

  /**
   * Alert Patient when their Doctor's Schedule / Shift is updated
   */
  async sendDoctorScheduleUpdateAlert({ patientEmail, patientName = 'Patient', doctorName, date, startTime, newShift, newWorkingHours, isOutsideNewHours }) {
    const subject = `Schedule Update: ${doctorName}'s Working Hours Updated`;
    const note = isOutsideNewHours
      ? `ATTENTION: Your scheduled appointment time (${startTime}) on ${date} falls outside the doctor's new working hours (${newWorkingHours}). Please log in to reschedule.`
      : `Your upcoming appointment with ${doctorName} remains confirmed for ${date} at ${startTime}.`;

    const text = `Dear ${patientName}, ${doctorName}'s working hours have been updated to ${newShift} (${newWorkingHours}). ${note}`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">Doctor Schedule Update Notice</h2>
        <p style="font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
        <p>Please be advised that working hours for <strong>${doctorName}</strong> have been updated by clinic administration.</p>
        <div style="background: ${isOutsideNewHours ? '#FFDAD6' : '#E6F4EA'}; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid ${isOutsideNewHours ? '#BA1A1A' : '#1B5E4F'};">
          <p style="margin: 6px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 6px 0;"><strong>New Working Hours:</strong> ${newShift} (${newWorkingHours})</p>
          <p style="margin: 6px 0;"><strong>Your Appointment:</strong> ${date} at ${startTime}</p>
          <p style="margin: 6px 0; font-weight: bold; color: ${isOutsideNewHours ? '#BA1A1A' : '#1B5E4F'};">${note}</p>
        </div>
        <p style="color: #49454F; font-size: 13px;">Log in to ClinixConnect anytime to view available slots or adjust your appointment timing.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect Care Team</strong></p>
      </div>
    `;

    return this.sendEmail({ to: patientEmail, subject, html, text });
  },

  /**
   * Alert Default Main Admin when a Doctor signs up and requires approval
   */
  async sendDoctorPendingApprovalAdminAlert({ adminEmail = 'admin@clinixconnect.org', doctorName, doctorEmail, doctorSpecialization, phone }) {
    const subject = `👑 Action Required: New Doctor Registration Pending Approval - Dr. ${doctorName}`;
    const text = `Dear Admin, Dr. ${doctorName} (${doctorSpecialization}, Email: ${doctorEmail}, Phone: ${phone || 'N/A'}) has registered on ClinixConnect and requires your review and approval before they can practice.`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #E0E2EC; border-radius: 16px; background-color: #FAFAFA;">
        <h2 style="color: #1B5E4F; margin-top: 0;">👑 New Doctor Account Registration</h2>
        <p style="font-size: 16px;">Dear <strong>Administrator</strong>,</p>
        <p>A new doctor has registered on ClinixConnect and is awaiting your review and approval.</p>
        <div style="background:#E6F4EA; padding: 18px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #1B5E4F;">
          <p style="margin: 6px 0;"><strong>Doctor Name:</strong> Dr. ${doctorName}</p>
          <p style="margin: 6px 0;"><strong>Specialization:</strong> ${doctorSpecialization || 'General Medicine'}</p>
          <p style="margin: 6px 0;"><strong>Email Address:</strong> ${doctorEmail}</p>
          <p style="margin: 6px 0;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p style="margin: 6px 0; font-weight: bold; color: #1B5E4F;">Status: Pending Main Admin Verification</p>
        </div>
        <p style="font-size: 14px; color: #49454F;">Please log into the Admin Portal under <strong>Doctor Management</strong> to approve or decline this doctor's license.</p>
        <hr style="border: 0; border-top: 1px solid #E0E2EC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #555;">Best regards,<br/><strong>ClinixConnect System Security</strong></p>
      </div>
    `;

    return this.sendEmail({ to: adminEmail, subject, html, text });
  },
};

export default emailService;
