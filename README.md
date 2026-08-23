<<<<<<< HEAD
# JeevanDoot - Healthcare Appointment & Follow-Up Manager

A full-stack, role-based healthcare appointment and follow-up management platform built with React, Tailwind CSS, Express, and MongoDB. The system provides dedicated portals for **Patients**, **Doctors**, and **Admins** with automated AI symptom summaries, post-visit clinical notes, double-booking prevention, doctor leave management, email alerts, and Google Calendar synchronization.

---

## 🌟 Key Features

### 1. Role-Based Access Control (RBAC)
- **Patient Portal**: Search specialists, book appointments with slot holds, submit symptoms with AI triage, sync with Google Calendar, manage appointments, and track daily medication reminders.
- **Doctor Portal**: Manage priority queue, inspect AI pre-visit assessments before appointments, write prescriptions, and generate AI post-visit patient summaries.
- **Admin Portal**: Manage doctor profiles (specialization, working hours, slot duration, leave days) and automatically handle leave conflicts with affected patient notifications.

### 2. AI Clinical Summaries (LLM Integration)
- **Pre-Visit Symptom Analysis**:
  - *Prompt*: `"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"`
  - Extracts clinical urgency, chief complaint, and 3 high-yield questions for the doctor.
- **Post-Visit Patient-Friendly Summary**:
  - *Prompt*: `"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"`
  - Generates clear, compassionate instructions, dosage timings, and follow-up precautions.
- **Graceful Fallback**: Rule-based clinical triage engine prevents system failure during network drops or API rate limits.

### 3. Slot Hold & Concurrency Control
- **10-Minute Temporary Slot Hold**: Prevents simultaneous double-booking during checkout.
- **Compound Unique Indexes & Atomic Transactions**: Guarantees zero double-booking at the database level.

### 4. Google Calendar & Notification System
- **1-Click Google Calendar Web Sync & .ics Download**: Available instantly upon booking confirmation.
- **Email Notifications**: Dispatched for booking confirmations, appointment reminders, cancellations, and doctor leave alerts.
- **Medication Reminders**: Frequency-based daily medication schedule checklists.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: (Optional for local API backend; the frontend includes a standalone mock mode)

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Demo Credentials
- **Patient**: `patient@jeevandoot.org` (Password: any 8+ characters)
- **Doctor**: `doctor@jeevandoot.org` (Password: any 8+ characters)
- **Admin**: `admin@jeevandoot.org` (Password: any 8+ characters)

### 2. Backend Setup
```bash
cd backend

# Install backend dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start API server
npm run dev
```
Backend API will listen on [http://localhost:5000/api/v1](http://localhost:5000/api/v1).

---

## 📋 Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Doctor      │       │     Patient     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ _id             │◄─────┐│ _id             │◄─────┐│ _id             │
│ name            │      └│ user (ObjectId) │      └│ user (ObjectId) │
│ email           │       │ specialization  │       │ personalInfo    │
│ role (enum)     │       │ workingHours    │       │ vitals          │
│ password (hash) │       │ slotDuration    │       │ allergies       │
└─────────────────┘       │ leaveDays []    │       │ queue           │
                          └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   ▼                         ▼
                          ┌───────────────────────────────────────────┐
                          │                Appointment                │
                          ├───────────────────────────────────────────┤
                          │ _id                                       │
                          │ patient (ObjectId) -> Patient             │
                          │ doctor (ObjectId)  -> Doctor              │
                          │ date (Date) & startTime (String)          │
                          │ status (upcoming / completed / cancelled) │
                          │ symptoms (String)                         │
                          │ urgency (Low / Medium / High / Critical)  │
                          │ chiefComplaint (String)                   │
                          │ suggestedQuestions [String]               │
                          │ preVisitSummary (Object)                  │
                          │ postVisitSummary (String)                 │
                          │ googleCalendarLink (String)               │
                          └───────────────────────────────────────────┘
```

---

## 🔌 API Documentation

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT | Public |
| `POST` | `/api/v1/auth/register` | Register new patient / doctor | Public |
| `GET` | `/api/v1/doctors` | List doctors with filter by specialty | Authenticated |
| `GET` | `/api/v1/doctors/:id/available-slots` | Calculate open slots (excluding leave) | Authenticated |
| `POST` | `/api/v1/doctors/:id/leave` | Mark doctor leave & notify affected patients | Admin / Doctor |
| `POST` | `/api/v1/appointments/hold-slot` | Acquire 10-minute temporary slot hold | Patient / Doctor |
| `POST` | `/api/v1/appointments` | Create appointment (with atomic lock) | Patient / Doctor |
| `GET` | `/api/v1/appointments` | List patient / doctor appointments | Authenticated |
| `POST` | `/api/v1/appointments/:id/cancel` | Cancel appointment | Authenticated |
| `POST` | `/api/v1/ai/pre-visit-summary` | Generate pre-visit symptom analysis | Authenticated |
| `POST` | `/api/v1/ai/post-visit-summary` | Convert clinical notes to patient summary | Authenticated |

---

## 📅 Google Calendar Setup

1. **Web Add Event Link**: Generated automatically on booking using standard calendar query parameters (`https://calendar.google.com/calendar/render?action=TEMPLATE...`).
2. **Downloadable `.ics` file**: Standard RFC-5545 calendar file that can be opened in Apple Calendar, Microsoft Outlook, or Google Calendar.
3. **Google OAuth 2.0 API (Optional)**:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/).
   - Enable **Google Calendar API**.
   - Configure OAuth Consent Screen and generate Client ID / Client Secret.
   - Add credentials to `backend/.env`.

---

## 📄 System Design Write-Up

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for the 800-word design write-up covering double-booking prevention, doctor leave conflict handling, slot hold mechanisms, and notification reliability.
=======
# ClinixConnect

>>>>>>> 4c4c803c9490a7b3200d789172aec049ba5ac1b5
