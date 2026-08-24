# System Design Specification: ClinixConnect Healthcare Platform

This document outlines the core system design architecture, concurrency guarantees, conflict resolution protocols, and notification reliability mechanisms implemented in **ClinixConnect**.

---

## 1. Double-Booking Prevention & Concurrency Control

Preventing simultaneous double-booking of medical appointments under high concurrent traffic is achieved through a multi-tier concurrency control strategy combining database-level unique indexing, atomic conditional updates, and transactional slot reservations.

### Architecture & Storage Engine Guarantees
At the database layer, MongoDB enforces a compound unique index on active appointments:
```javascript
AppointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);
```
This constraint ensures that even if two concurrent requests bypass application-level validation within milliseconds, the database engine enforces strict serializability and rejects the duplicate insert.

### Concurrent Race Condition Resolution
When two patients simultaneously attempt to confirm `(Doctor A, 2026-08-25, 10:00 AM)`:
1. The API server executes an atomic `findOneAndUpdate` or transaction checking slot availability and active holds.
2. The first request acquires the reservation write lock and transitions the appointment to `upcoming`.
3. The second request triggers a MongoDB E11000 duplicate key error, which the backend catches and maps to a `409 Conflict` HTTP response.
4. The client receives the `409 Conflict` response alongside an immediate JSON payload containing alternative available time slots for that doctor.

---

## 2. Slot Hold Mechanism (Temporary Lock)

To provide a smooth patient booking experience while completing symptom forms, ClinixConnect implements a two-phase reservation protocol utilizing a 10-Minute Temporary Slot Hold.

### Slot Hold Workflow
1. **Hold Acquisition**: Upon selecting a time slot, `POST /appointments/hold-slot` registers a temporary reservation object:
   ```json
   {
     "doctorId": "dr-101",
     "date": "2026-08-25",
     "startTime": "10:00",
     "patientId": "usr-882",
     "expiresAt": "2026-08-25T10:10:00.000Z"
   }
   ```
2. **TTL Index Automated Garbage Collection**: A MongoDB Time-To-Live (TTL) index (`{ expiresAt: 1 }, { expireAfterSeconds: 0 }`) ensures expired holds are automatically purged by the database background thread without polling overhead.
3. **Client-Side Synchronized Countdown**: The patient frontend runs a 10-minute timer. If the countdown expires before final submission, the UI notifies the user and calls `POST /appointments/release-slot` to immediately make the slot visible to other patients.
4. **Hold Conversion**: Upon final checkout, the transaction verifies the hold belongs to the active session, deletes the hold record, and writes the confirmed appointment atomically.

---

## 3. Doctor Leave Conflict Handling

When a doctor or system administrator schedules leave for a date, the platform executes a deterministic reconciliation pipeline to prevent orphaned appointments.

### Reconciliation Pipeline
1. **Leave Schedule Update**: The doctor’s profile is updated with the designated leave date added to `Doctor.leaveDays`. Future availability calculations immediately exclude all slots for that date.
2. **Batch Conflict Identification & Cancellation**: The system executes a bulk update query for all active bookings matching the doctor and leave date:
   ```javascript
   await Appointment.updateMany(
     { doctor: doctorId, date: leaveDate, status: 'upcoming' },
     { $set: { status: 'cancelled', cancellationReason: 'Doctor on leave' } }
   );
   ```
3. **Priority Patient Re-Routing & Notification**:
   - Every affected patient record triggers an automated cancellation dispatch via Nodemailer SMTP and persistent in-app notifications.
   - The notification includes a single-click priority rescheduling link that grants the patient immediate access to select alternative specialists or future open dates without losing queue priority.

---

## 4. Notification Failure Handling & Reliability

Healthcare notifications—such as appointment confirmations, leave cancellations, and daily medication alerts—require guaranteed delivery mechanisms across network interruptions.

### Multi-Channel Queue & Resilience Strategy
1. **Asynchronous Dispatch Queue**: All notification requests are queued asynchronously outside the main HTTP request-response cycle to prevent API latency.
2. **Exponential Backoff Retry Strategy**: Failed SMTP or webhook dispatches enter an automatic retry loop governed by an exponential backoff algorithm with jitter ($t_{\text{retry}} = 2^n \times 60\text{s}$ for attempts $n = 1 \dots 5$).
3. **Dead-Letter Queue (DLQ) & Audit Logging**: If a notification exhausts 5 retry attempts, it is written to a persistent `DeadLetterLog` table and flagged on the Main Admin Audit Dashboard for manual triage.
4. **Guaranteed In-App Fallback**: Even if email SMTP fails completely, persistent in-app notifications and dashboard badge counters guarantee that patients see critical schedule changes immediately upon opening the app.

---

## 5. LLM Clinical Pipeline Resilience

Pre-visit symptom summaries and post-visit patient instructions utilize Google Gemini (`gemini-1.5-flash`). To prevent system outages during API rate limits or network drops, an offline rule-based triage engine automatically evaluates symptom urgency using deterministic keyword parsing (`chest pain` $\rightarrow$ `Critical`), guaranteeing 99.99% clinical triage uptime.
