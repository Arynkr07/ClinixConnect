import { emailService } from './email.service.js';

class ReminderBackgroundService {
  constructor() {
    this.intervalId = null;
    this.retryQueue = []; // Queue for retry attempts: { payload, attempt, nextRetryAt }
  }

  start(intervalMs = 60000) {
    console.log('[reminderService] Background reminder worker & email retry queue started.');
    this.intervalId = setInterval(() => {
      this.runPeriodicCheck();
      this.processRetryQueue();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * Enqueue a failed notification for exponential backoff retry
   */
  enqueueRetry(emailPayload, currentAttempt = 1) {
    if (currentAttempt > 5) {
      console.error('[reminderService] Maximum retry attempts reached for message to:', emailPayload.to);
      return;
    }
    const backoffMs = Math.pow(2, currentAttempt) * 30000; // 1m, 2m, 4m, 8m...
    this.retryQueue.push({
      payload: emailPayload,
      attempt: currentAttempt,
      nextRetryAt: Date.now() + backoffMs,
    });
    console.log(`[reminderService] Enqueued retry #${currentAttempt} for ${emailPayload.to} in ${backoffMs / 1000}s`);
  }

  /**
   * Process pending retries whose time has arrived
   */
  async processRetryQueue() {
    const now = Date.now();
    const ready = this.retryQueue.filter((item) => item.nextRetryAt <= now);
    this.retryQueue = this.retryQueue.filter((item) => item.nextRetryAt > now);

    for (const item of ready) {
      try {
        await emailService.sendEmail(item.payload);
        console.log(`[reminderService] Successfully delivered retried email to: ${item.payload.to}`);
      } catch (err) {
        console.warn(`[reminderService] Retry attempt #${item.attempt} failed for ${item.payload.to}: ${err.message}`);
        this.enqueueRetry(item.payload, item.attempt + 1);
      }
    }
  }

  /**
   * Periodic check for scheduled medication dosage reminders
   */
  async runPeriodicCheck() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      let activeSlot = null;
      if (currentHour >= 7 && currentHour <= 9) activeSlot = 'Morning';
      else if (currentHour >= 12 && currentHour <= 14) activeSlot = 'Afternoon';
      else if (currentHour >= 20 && currentHour <= 22) activeSlot = 'Night';

      if (!activeSlot) return;

      const { Prescription, User } = await import('../models/index.js');
      const activePrescriptions = await Prescription.find({ status: 'active' }).populate('patient');

      for (const rx of activePrescriptions) {
        for (const med of rx.medicines || []) {
          const isDue =
            (activeSlot === 'Morning' && med.schedule?.morning) ||
            (activeSlot === 'Afternoon' && med.schedule?.afternoon) ||
            (activeSlot === 'Night' && med.schedule?.night);

          if (isDue && rx.patient?.user) {
            const user = await User.findById(rx.patient.user);
            if (user?.email) {
              await emailService.sendMedicationReminder({
                patientEmail: user.email,
                patientName: user.name,
                medicineName: med.medicineName,
                dosage: med.dosage,
                timeSlot: activeSlot,
              });
            }
          }
        }
      }
    } catch (e) {
      // Background worker absorbs errors gracefully
    }
  }
}

export const reminderService = new ReminderBackgroundService();
export default reminderService;
