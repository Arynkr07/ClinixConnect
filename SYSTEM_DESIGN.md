# System Design Write-Up: Healthcare Appointment & Follow-Up Manager

## 1. Double-Booking Prevention & Concurrency Control
Double-booking is eliminated using a multi-layer concurrency control strategy combining **pessimistic lock holds**, **atomic database transactions**, and **compound unique indexes**.
1. **Compound Database Constraints**: At the MongoDB schema level, appointments enforce a compound unique index on `{ doctor: 1, date: 1, startTime: 1 }` filtered on `{ status: 'upcoming' }`. This provides absolute consistency at the storage engine level, rejecting race conditions that bypass API checks.
2. **Atomic Query Operations**: Booking creation executes via atomic conditional updates (`findOneAndUpdate` / ACID multi-document transactions) that verify the slot is neither booked nor held by another session before writing.
3. **Graceful Conflict Response**: If two concurrent booking requests hit the server within milliseconds, only one writes successfully while the other receives an immediate `409 Conflict` status with an updated list of open alternate slots.

```
[Patient Request] -> [Check SlotHold + Unique Index] -> [Atomic DB Write]
                                                        ├─ Success -> Confirm + Calendar Link
                                                        └─ Conflict -> 409 + Show Open Slots
```

---

## 2. Slot Hold Mechanism (Temporary Lock)
To guarantee a smooth user experience during symptom intake without locking slots indefinitely, the system implements a **Time-To-Live (TTL) Slot Hold Mechanism**:
- **Hold Acquisition**: When a patient selects an available slot, a `SlotHold` record is created keyed by `{ doctorId, date, startTime }` with a 10-minute expiration timestamp (`expiresAt = now + 10m`).
- **TTL Expiration Index**: MongoDB TTL index (`{ expiresAt: 1 }, { expireAfterSeconds: 0 }`) ensures expired holds are automatically cleaned up in the background if the user abandons checkout.
- **Client Countdown Synchronization**: The frontend runs a synchronized 10-minute countdown. If the timer expires before symptom submission, the held slot is released back into the pool and the patient is prompted to re-select.
- **Hold Consumption**: Upon successful appointment confirmation, the `SlotHold` is atomically deleted and converted into a confirmed `Appointment`.

---

## 3. Doctor Leave Conflict Handling
When administrators or doctors schedule leave for specific dates, active bookings must be reconciled immediately:
1. **Atomic Leave Application**: Setting a doctor on leave appends the date to `Doctor.leaveDays` and prevents any future slot generation for that date.
2. **Conflict Detection & Batch Invalidation**: The system executes a bulk query for all appointments where `status: 'upcoming'` and `date == leaveDate`. All affected records are updated to `status: 'cancelled'` with `cancelledReason: 'Doctor on leave'`.
3. **Automated Patient Notification & Re-routing**:
   - For every affected appointment, an immediate high-priority in-app notification and email dispatch are triggered via `emailService.sendDoctorLeaveCancellation()`.
   - The notification contains a direct one-click rescheduling link directing the patient to priority re-booking with alternative specialists or future dates.

---

## 4. Notification Failure Handling & Reliability
Healthcare reminders require guaranteed multi-channel delivery:
1. **Asynchronous Retry Queue with Exponential Backoff**: Failed email or webhook deliveries enter a retry queue with exponential backoff (1m, 5m, 15m, 1h, max 5 attempts) to absorb third-party SMTP or network hiccups.
2. **Dead-Letter Logging**: If an alert exhausts max retries, it is flagged in the system audit log for administrative triage.
3. **Multi-Channel Fallback**: If email delivery fails, the in-app notification context and persistent dashboard badges ensure the patient sees urgent schedule updates immediately upon opening the app.

---

## 5. LLM Prompt Quality & Graceful Failure Handling
LLM integrations for Pre-Visit and Post-Visit summaries are designed with clinical safety and zero-breakage resilience:
- **Pre-Visit Triage Prompt**:
  `"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"`
- **Post-Visit Patient Summary Prompt**:
  `"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"`
- **Graceful Fallback Pipeline**: If an external LLM API experiences rate limits, timeouts, or network outages, the system seamlessly routes through a built-in clinical rule-based parsing engine. The patient and doctor experience zero latency and zero disruption.

---

## 6. Email & Google Calendar Integration Architecture
1. **Google Calendar Web Sync & .ics**: Every booking generates both a direct 1-click Google Calendar URL (`calendar.google.com/calendar/render?action=TEMPLATE...`) and a downloadable RFC-5545 standard `.ics` file.
2. **Bi-directional Status Sync**: Reschedules update calendar time ranges, and cancellations provide updated event links or cancellation emails.
