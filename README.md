# ClinixConnect - Rural Community Healthcare Platform

A full-stack, role-based healthcare appointment, AI symptom triage, and follow-up management platform built with **React (Vite, Tailwind CSS)**, **Node.js (Express)**, and **MongoDB (Mongoose)**. The platform features automated AI symptom summaries, post-visit clinical notes, double-booking prevention with atomic slot holds, doctor leave auto-rescheduling, email notifications, and Google Calendar synchronization.

> 🔑 **Quick Login Credentials for Testing**:
> - **Main Super Admin**: `admin@clinixconnect.org` | Password: `admin12345`
> - **Default Doctor**: `doctor@clinixconnect.org` | Password: `doctor@123`
> - **Default Patient**: `patient@clinixconnect.org` | Password: `patient@123`

---

## 📋 Table of Contents
1. [🌟 Key Features](#-key-features)
2. [🔑 Default Login Credentials](#-default-login-credentials)
3. [🚀 Setup & Installation Guide](#-setup--installation-guide)
4. [⚙️ Environment Variables (.env.example)](#%EF%B8%8F-environment-variables-envexample)
5. [🔌 API Documentation](#-api-documentation)
6. [🗄️ Database Schema & Concurrency Locks](#%EF%B8%8F-database-schema--concurrency-locks)
7. [🤖 LLM Prompts & Engineering](#-llm-prompts--engineering)
8. [📅 Google Calendar Integration Setup](#-google-calendar-integration-setup)

---

## 🔑 Default Login Credentials

The platform is pre-seeded with default accounts for immediate login and testing across all 3 portals:

| Portal Role | Email Address | Password | Account ID / Profile Name | Access Permissions |
|---|---|---|---|---|
| 👑 **Main Super Admin** | `admin@clinixconnect.org` | `admin12345` | `Main Admin` | Sole System Admin, doctor schedule & leave management, shift approvals |
| 🩺 **Default Doctor** | `doctor@clinixconnect.org` | `doctor@123` | `dr-1` (Dr. Rajesh Sharma) | Patient queue, AI pre-visit clinical notes, prescriptions, shift & leave requests |
| 👤 **Default Patient** | `patient@clinixconnect.org` | `patient@123` | `JD-6612` (Gopal) | Specialist lookup, slot hold booking, AI symptom triage, calendar sync, medication tracker |

---

## 🌟 Key Features

### 1. Role-Based Access Control (RBAC)
- **Patient Portal**: Search doctors by specialization, book appointments with 10-minute temporary slot holds, submit pre-visit symptoms with LLM triage, download `.ics` / sync to Google Calendar, and track daily medication reminders.
- **Doctor Portal**: Manage daily patient queue, inspect AI pre-visit clinical summaries before appointments, record prescriptions and clinical notes, request shift rotations, and request leave days.
- **System Administrator Portal**: Manage doctor schedules (working hours, slot durations, leave days), approve doctor shift requests, and monitor overall health center analytics. System operates with a single pre-configured Main Super Admin (`admin@clinixconnect.org`).

### 2. Double-Booking Prevention & Concurrency
- **10-Minute Temporary Slot Hold**: Acquires a temporary lock on `(doctorId, date, startTime)` during patient checkout to prevent simultaneous booking attempts.
- **Compound Unique Indexing**: MongoDB compound index `{ doctor: 1, date: 1, startTime: 1, status: 1 }` guarantees zero double-booking at the database layer.

### 3. AI Clinical Summaries (LLM Integration)
- **Pre-Visit Symptom Analysis**: Uses Google Gemini to extract clinical urgency (`Low`, `Medium`, `High`, `Critical`), chief complaints, and 3 suggested diagnostic questions for the doctor.
- **Post-Visit Patient Summary**: Converts medical notes and prescriptions into patient-friendly instructions with structured medication schedules.
- **Deterministic Rule Fallback**: Clinical keyword matcher ensures continuous operation even if LLM network requests drop or fail.

### 4. Doctor Leave Management & Patient Auto-Rescheduling
- When a doctor marks leave for a scheduled date, affected patients receive notifications and can easily reschedule to another date or available physician without losing priority.

---

## 🚀 Setup & Installation Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Clone repository
git clone https://github.com/ClinixConnect/ClinixConnect.git
cd ClinixConnect

# Install Frontend dependencies
npm install

# Install Backend dependencies
cd backend
npm install
cd ..
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env` in both the root directory and `backend/`:
```bash
# Root environment file
cp .env.example .env

# Backend environment file
cp backend/.env.example backend/.env
```

### 3. Seed Database
Run the automated seed script to populate default users, doctors, and sample appointments:
```bash
cd backend
npm run seed
cd ..
```
*Note: The backend also automatically runs `autoSeed.js` on startup to ensure default profiles exist.*

### 4. Run Development Servers
Open two terminal windows:

**Terminal 1 (Backend API Server):**
```bash
cd backend
npm run dev
```
*Runs Express backend server on `http://localhost:5000/api/v1`.*

**Terminal 2 (Frontend Client):**
```bash
npm run dev
```
*Runs Vite React frontend on `http://localhost:5173`.*

---

## 🔑 Default Credentials

The platform comes pre-populated with default accounts for instant testing:

| Role | Email Address | Password | Details |
|---|---|---|---|
| **Main Super Admin** | `admin@clinixconnect.org` | `admin12345` | Sole System Admin profile |
| **Default Doctor** | `doctor@clinixconnect.org` | `doctor@123` | Dr. Rajesh Sharma (General Medicine) |
| **Default Patient** | `patient@clinixconnect.org` | `patient@123` | Patient Gopal (`patientId: Gopal...`) |

---

## ⚙️ Environment Variables (.env.example)

```env
# =================================================================
# ClinixConnect Environment Variables (.env.example)
# =================================================================

# --- Application Configuration ---
VITE_APP_NAME=ClinixConnect
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_ENABLE_MOCK_API=false

# --- Backend Server Configuration ---
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# --- Database Configuration ---
MONGODB_URI=mongodb://localhost:27017/clinixconnect

# --- JWT Authentication ---
JWT_SECRET=super_secret_jwt_key_clinixconnect_2026_change_in_production
JWT_EXPIRES_IN=7d

# --- Google Gemini / LLM Integration ---
GEMINI_API_KEY=your_google_gemini_api_key_here
LLM_MODEL=gemini-1.5-flash

# --- Email Notifications (Nodemailer SMTP) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@clinixconnect.org
SMTP_PASS=your_app_specific_password_here
SMTP_FROM="ClinixConnect Care" <notifications@clinixconnect.org>

# --- Google Calendar Integration (OAuth 2.0) ---
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
```

---

## 🔌 API Documentation

### 1. Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/login` | Log in user with `{ role, email, password }` | Public |
| `POST` | `/auth/register` | Register new `patient` or `doctor` account | Public |
| `GET` | `/auth/verify` | Verify current JWT token and session user | Authenticated |
| `POST` | `/auth/forgot-password` | Request password reset OTP code via SMTP email | Public |
| `POST` | `/auth/reset-password` | Submit OTP code and update password | Public |

### 2. Doctor Endpoints (`/api/v1/doctors`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/doctors` | Fetch all doctors (filter by `specialization` / `region`) | Authenticated |
| `GET` | `/doctors/:id` | Get specific doctor details & working schedule | Authenticated |
| `GET` | `/doctors/:id/available-slots` | Calculate open slots for a specific date | Authenticated |
| `POST` | `/doctors/:id/leave` | Mark doctor on leave & notify affected patients | Doctor / Admin |
| `POST` | `/doctors/shifts/request` | Submit 8-hour shift change request | Doctor |

### 3. Appointment & Booking Endpoints (`/api/v1/appointments`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/appointments/hold-slot` | Acquire 10-minute temporary lock on slot | Patient / Doctor |
| `POST` | `/appointments` | Confirm booking (atomic lock check) | Patient / Doctor |
| `GET` | `/appointments` | List appointments for patient or doctor | Authenticated |
| `POST` | `/appointments/:id/cancel` | Cancel appointment & release slot | Authenticated |
| `POST` | `/appointments/:id/complete` | Complete visit & save post-visit notes | Doctor |

### 4. Admin Management Endpoints (`/api/v1/admin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/admin/overview` | Fetch system dashboard KPIs & workload | Admin |
| `GET` | `/admin/doctors` | Manage doctor profiles & approval status | Admin |
| `PUT` | `/admin/doctors/:id/approve` | Approve registered doctor account | Admin |
| `PUT` | `/admin/doctors/:id/reject` | Reject registered doctor account | Admin |
| `GET` | `/admin/admins` | View system administrators directory | Admin |

### 5. AI Endpoints (`/api/v1/ai`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/ai/pre-visit-summary` | Generate LLM pre-visit symptom analysis | Authenticated |
| `POST` | `/ai/post-visit-summary` | Generate LLM patient-friendly post-visit notes | Authenticated |

---

## 🗄️ Database Schema & Concurrency Locks

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Doctor      │       │     Patient     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ _id             │◄─────┐│ _id             │◄─────┐│ _id             │
│ name            │      └│ user (ObjectId) │      └│ user (ObjectId) │
│ email           │       │ specialization  │       │ personalInfo    │
│ role (enum)     │       │ workingHours    │       │ vitals          │
│ isApproved      │       │ slotDuration    │       │ queue           │
│ password (hash) │       │ leaveDays []    │       └────────┬────────┘
└─────────────────┘       └────────┬────────┘                │
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

### Double-Booking Prevention Logic
1. **10-Minute Temporary Hold**:
   - `POST /appointments/hold-slot` registers an in-memory lock key `hold:doctorId:date:startTime` expiring in 600 seconds.
2. **MongoDB Database Constraint**:
   - `AppointmentSchema.index({ doctor: 1, date: 1, startTime: 1, status: 1 }, { unique: true })`.
   - Prevents duplicate active bookings even under heavy concurrent network requests.

---

## 🤖 LLM Prompts & Engineering

The platform integrates Google Gemini (`gemini-1.5-flash`) for clinical NLP task automation:

### 1. Pre-Visit Clinical Symptom Analysis Prompt

```text
System: You are an expert clinical triage AI assistant for rural health centers. 
Analyze patient symptoms and return a JSON object with urgency assessment.

User Prompt:
Patient Name: {{patientName}}
Symptoms: {{symptoms}}
Duration: {{duration}}

Required JSON Output Schema:
{
  "urgency": "Low" | "Medium" | "High" | "Critical",
  "chiefComplaint": "Short 1-line summary",
  "suggestedQuestions": [
    "Question 1 for doctor",
    "Question 2 for doctor",
    "Question 3 for doctor"
  ],
  "triageReasoning": "Clinical reasoning..."
}
```

### 2. Post-Visit Patient Summary Prompt

```text
System: You are a compassionate medical communicator. Convert doctor's clinical notes 
and prescription details into clear, patient-friendly instructions in plain language.

User Prompt:
Doctor Notes: {{clinicalNotes}}
Prescription: {{prescriptionDetails}}
Diagnosis: {{diagnosis}}

Required Output Format:
- Summary of Diagnosis: Plain text explanation
- Medication Schedule: List with dosage timings (Morning / Afternoon / Night)
- Warning Symptoms: When to seek emergency care
- Follow-Up Instructions: Return date and dietary precautions
```

### 3. Rule-Based Fallback Engine
When the Gemini API is unreachable, `ai.service.js` executes a deterministic keyword classifier:
- Keywords like `"chest pain"`, `"breathlessness"`, `"unconscious"` $\rightarrow$ **Critical**
- Keywords like `"fever"`, `"vomiting"`, `"severe pain"` $\rightarrow$ **High** / **Medium**

---

## 📅 Google Calendar Integration Setup

ClinixConnect supports 3 calendar synchronization methods:

### Method 1: Direct Web Intent (Zero Config Required)
Upon appointment confirmation, ClinixConnect dynamically builds a Google Calendar Web Template URL:
```javascript
const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Medical Consultation - ' + doctorName)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(hospital)}`;
```

### Method 2: iCalendar (`.ics`) Download
Patients can click **Download .ics Calendar File** to generate a standard RFC-5545 calendar event compatible with Apple Calendar, Microsoft Outlook, and Google Calendar.

### Method 3: Google Cloud OAuth 2.0 API Setup (Optional Server-Side Sync)

To enable automatic direct calendar event creation in the patient's Google Account:

1. **Create Google Cloud Project**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/).
   - Click **Create Project** $\rightarrow$ Name it `ClinixConnect`.

2. **Enable Google Calendar API**:
   - Go to **APIs & Services** $\rightarrow$ **Library**.
   - Search for **Google Calendar API** and click **Enable**.

3. **Configure OAuth Consent Screen**:
   - Select **External** $\rightarrow$ Fill App Name (`ClinixConnect`), Support Email, and Developer Email.
   - Add Scope: `https://www.googleapis.com/auth/calendar.events`.

4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** $\rightarrow$ **Credentials**.
   - Click **Create Credentials** $\rightarrow$ **OAuth client ID**.
   - Application Type: **Web Application**.
   - Authorized Redirect URIs: `http://localhost:5000/api/v1/auth/google/callback`.
   - Copy **Client ID** and **Client Secret**.

5. **Update Backend `.env`**:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
   ```

---

## 📄 License & Maintainers

Built for **ClinixConnect Healthcare Platform** — Rural Community Care.
