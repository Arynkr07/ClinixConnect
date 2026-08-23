import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { doctorService } from '../../services/doctorService';
import {
  appointmentService,
  generateGoogleCalendarLink,
  downloadIcsFile,
} from '../../services/appointmentService';
import { aiService } from '../../services/aiService';
import { patientSidebarItems } from './patientNav';

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { notify } = useNotification();

  const sidebarItems = patientSidebarItems(t);

  const [doctor, setDoctor] = useState(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  // Booking step state: 1: Slot Selection, 2: Symptoms & AI Analysis, 3: Confirmed
  const [step, setStep] = useState(1);

  // Form selections
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [slotsData, setSlotsData] = useState({ isDoctorOnLeave: false, slots: [] });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotHold, setSlotHold] = useState(null);
  const [holdTimerSeconds, setHoldTimerSeconds] = useState(600); // 10 mins

  // Symptoms & AI state
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [mode, setMode] = useState('in-person');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // Advanced Options (Additional Details) state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [ongoingMeds, setOngoingMeds] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Confirmation state
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load Doctor Details
  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const doc = await doctorService.getById(doctorId);
        setDoctor(doc);
      } catch (err) {
        console.error('Failed to load doctor', err);
      } finally {
        setLoadingDoctor(false);
      }
    };
    loadDoctor();
  }, [doctorId]);

  // Load Slots when Date or Doctor changes
  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    let active = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setSlotHold(null);

    doctorService
      .getAvailableSlots(doctorId, selectedDate)
      .then((data) => {
        if (active) {
          setSlotsData(data || { isDoctorOnLeave: false, slots: [] });
        }
      })
      .catch((err) => {
        console.error('Error fetching slots:', err);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [doctorId, selectedDate]);

  // Countdown timer for Slot Hold
  useEffect(() => {
    if (!slotHold) return undefined;
    const interval = setInterval(() => {
      setHoldTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSlotHold(null);
          setSelectedSlot(null);
          notify({ type: 'warning', message: t('booking.slotHoldExpired') });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [slotHold, notify, t]);

  // Handle slot selection with Slot Hold lock
  const handleSelectSlot = async (slot) => {
    if (!slot.isAvailable) return;
    try {
      const holdRes = await appointmentService.holdSlot({
        doctorId,
        date: selectedDate,
        startTime: slot.startTime,
        holdMinutes: 10,
      });

      if (holdRes.success) {
        setSelectedSlot(slot);
        setSlotHold(holdRes);
        setHoldTimerSeconds(600);
        notify({ type: 'success', message: 'Slot held for 10 minutes!' });
      } else {
        notify({ type: 'error', message: holdRes.message || 'Slot currently held by another user.' });
      }
    } catch {
      notify({ type: 'error', message: 'Could not hold slot. Please try again.' });
    }
  };

  // Generate AI Summary and Complete Booking
  const handleGenerateAiAssessment = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      notify({ type: 'error', message: 'Please describe your symptoms first.' });
      return;
    }
    if (!selectedSlot || !doctor) return;

    setSubmitting(true);
    let aiResult = null;
    try {
      const combinedPrompt = `${symptoms}. Duration: ${duration || 'unspecified'}. Patient-reported severity: ${severity}.`;
      aiResult = await aiService.generatePreVisitSummary(combinedPrompt, severity);
    } catch {
      /* continue smoothly */
    }

    try {
      const payload = {
        patientId: user?.patientId || user?.id || 'JD-1209',
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || 'patient@jeevandoot.org',
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorEmail: doctor.email || 'doctor@jeevandoot.org',
        doctorSpecialty: doctor.specialty || doctor.specialization,
        purpose: aiResult?.chiefComplaint || symptoms.slice(0, 80) || 'General Consultation',
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: mode,
        symptoms: symptoms.trim(),
        additionalDetails: {
          medicalHistory,
          allergies,
          ongoingMeds,
          additionalNotes,
        },
        urgency: aiResult?.urgency || 'Low',
        chiefComplaint: aiResult?.chiefComplaint || symptoms.slice(0, 80),
        suggestedQuestions: aiResult?.suggestedQuestions || [],
        preVisitSummary: aiResult,
      };

      const apt = await appointmentService.create(payload);
      setCreatedAppointment(apt);
      setStep(3); // Confirmation screen
      notify({ type: 'success', message: t('booking.bookingSuccess') });

      // Automatically trigger calendar schedule download (.ics file)
      try {
        downloadIcsFile(apt);
      } catch (icsErr) {
        console.warn('[BookAppointment] ICS auto-download fallback:', icsErr);
      }
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Booking failed due to a slot conflict.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loadingDoctor) {
    return (
      <DashboardLayout sidebarProps={{ items: sidebarItems }}>
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!doctor) {
    return (
      <DashboardLayout sidebarProps={{ items: sidebarItems }}>
        <Card className="text-center py-16">
          <h3 className="font-headline font-bold text-title-lg text-on-surface">Doctor not found</h3>
          <Link to="/patient/doctors" className="mt-4 inline-block">
            <Button>Back to Doctor Search</Button>
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('booking.title'),
        subtitle: t('booking.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {/* Booking Wizard Steps Progress */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 md:p-6 mb-8 card-shadow">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-label-md font-bold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>
              1
            </span>
            <span>Slot Selection</span>
          </div>
          <div className="h-0.5 w-12 bg-outline-variant" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>
              2
            </span>
            <span>Symptoms & AI</span>
          </div>
          <div className="h-0.5 w-12 bg-outline-variant" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>
              3
            </span>
            <span>Confirmed</span>
          </div>
        </div>
      </div>

      {/* Selected Doctor Summary Card */}
      <Card className="mb-8 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline text-title-lg font-bold">
              {doctor.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-title-lg text-on-surface">{doctor.name}</h3>
                <Badge variant="secondary">{doctor.specialty || doctor.specialization}</Badge>
              </div>
              <p className="text-label-md text-on-surface-variant mt-0.5">
                {doctor.hospital || doctor.facility} · Working Hours: {doctor.workingHours?.start || '09:00'}–{doctor.workingHours?.end || '17:00'} ({doctor.slotDuration || 30} min slots)
              </p>
            </div>
          </div>
          <Link to="/patient/doctors">
            <Button variant="ghost" size="sm" icon="swap_horiz">
              Change Doctor
            </Button>
          </Link>
        </div>
      </Card>

      {/* STEP 1: DATE & SLOT SELECTION */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card title={t('booking.selectDate')} icon="calendar_month" className="lg:col-span-1">
            <div className="space-y-4">
              <Input
                label="Appointment Date"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon="event"
              />
              <p className="text-label-sm text-on-surface-variant leading-relaxed">
                Choose a date to view all open appointment slots. If the doctor has scheduled leave, unavailable dates will be marked.
              </p>
            </div>
          </Card>

          <Card
            title={t('booking.availableSlots')}
            icon="schedule"
            className="lg:col-span-2"
            subtitle={`Slots for ${selectedDate}`}
            headerRight={
              slotHold && (
                <Badge variant="warning" icon="hourglass_top">
                  Hold Expires in {formatTimer(holdTimerSeconds)}
                </Badge>
              )
            }
          >
            {loadingSlots ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : slotsData.isDoctorOnLeave ? (
              <div className="text-center py-12 bg-error-container/20 rounded-xl p-6 border border-error/20">
                <span className="material-symbols-outlined text-4xl text-error mb-2">event_busy</span>
                <h4 className="font-bold text-on-surface text-title-md">Doctor is On Leave</h4>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  The doctor is scheduled on leave on {selectedDate}. Please select another date.
                </p>
              </div>
            ) : slotsData.slots.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <p>{t('booking.noSlotsAvailable')}</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slotsData.slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => handleSelectSlot(slot)}
                        className={`p-3.5 rounded-xl border text-center font-headline transition-all ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary shadow-elevation1'
                            : slot.isAvailable
                            ? 'bg-surface-container-low hover:border-primary border-outline-variant/40 text-on-surface font-semibold'
                            : 'bg-surface-container-high text-outline opacity-40 cursor-not-allowed line-through'
                        }`}
                      >
                        <span className="block text-title-sm font-bold">{slot.startTime}</span>
                        <span className="block text-label-xs opacity-80 mt-0.5">{slot.endTime}</span>
                      </button>
                    );
                  })}
                </div>

                {slotHold && (
                  <div className="mt-6 p-4 rounded-xl bg-secondary-container/40 border border-secondary/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-2xl">lock_clock</span>
                      <div>
                        <p className="font-bold text-on-surface text-label-md">
                          Slot {selectedSlot?.startTime} – {selectedSlot?.endTime} is held for you!
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          Proceed to fill in your symptoms to generate your AI pre-visit assessment.
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setStep(2)} icon="arrow_forward" iconPosition="right">
                      Next: Symptom Form
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STEP 2: SYMPTOM INTAKE FORM & AI TRIAGE ANALYSIS */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card title={t('booking.symptomIntake')} icon="description" className="lg:col-span-2">
            <form onSubmit={handleGenerateAiAssessment} className="space-y-6">
              <div>
                <label className="block text-label-lg font-semibold text-on-surface mb-2">
                  {t('booking.describeSymptoms')} <span className="text-error">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t('booking.symptomsPlaceholder')}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-body-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('booking.duration')}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={t('booking.durationPlaceholder')}
                  icon="schedule"
                />
                <div>
                  <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">
                    {t('booking.severity')}
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary"
                  >
                    <option value="Mild">{t('booking.severityMild')}</option>
                    <option value="Moderate">{t('booking.severityModerate')}</option>
                    <option value="Severe">{t('booking.severitySevere')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-lg font-semibold text-on-surface mb-2">Consultation Mode</label>
                <div className="flex gap-3">
                  {['in-person', 'virtual'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 p-3 rounded-xl border text-label-md font-semibold capitalize flex items-center justify-center gap-2 transition-all ${
                        mode === m
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {m === 'in-person' ? 'person' : 'videocam'}
                      </span>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* ADVANCED OPTIONS (ADDITIONAL DETAILS) */}
              <div className="border border-outline-variant/50 rounded-xl overflow-hidden bg-surface-container-lowest">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-surface-container-low/60 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-xl">tune</span>
                    <span className="font-bold text-label-lg text-on-surface">Advanced Options (Additional Details)</span>
                    <Badge variant="outline" size="sm">Optional</Badge>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
                </button>

                {showAdvanced && (
                  <div className="p-5 space-y-4 border-t border-outline-variant/40 bg-surface-container-lowest">
                    <div>
                      <label className="block text-label-md font-semibold text-on-surface mb-1">
                        Past Medical History / Chronic Conditions
                      </label>
                      <input
                        type="text"
                        value={medicalHistory}
                        onChange={(e) => setMedicalHistory(e.target.value)}
                        placeholder="e.g. High BP, Diabetes, Thyroid, previous surgeries"
                        className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-label-md font-semibold text-on-surface mb-1">
                          Known Allergies & Reaction History
                        </label>
                        <input
                          type="text"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder="e.g. Penicillin, Sulfa drugs, Dust"
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-label-md font-semibold text-on-surface mb-1">
                          Current Ongoing Medications
                        </label>
                        <input
                          type="text"
                          value={ongoingMeds}
                          onChange={(e) => setOngoingMeds(e.target.value)}
                          placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-label-md font-semibold text-on-surface mb-1">
                        Additional Notes & Special Requests
                      </label>
                      <textarea
                        rows={2}
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Any additional health details, dietary preferences, or accessibility requests..."
                        className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} icon="arrow_back">
                  Back to Slots
                </Button>
                <Button type="submit" loading={submitting || analyzingAi} icon="check_circle" size="lg">
                  Confirm & Book Appointment
                </Button>
              </div>
            </form>
          </Card>

          {/* Appointment Summary Sidebar */}
          <div className="space-y-6">
            <Card
              title="Booking Details"
              icon="event"
              subtitle="Review appointment details"
              borderLeft="primary"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase font-semibold">Doctor</p>
                  <p className="font-bold text-on-surface text-body-lg">{doctor.name}</p>
                  <p className="text-label-md text-on-surface-variant">{doctor.specialty || doctor.specialization}</p>
                </div>
                <div className="border-t border-outline-variant/40 pt-3">
                  <p className="text-label-sm text-on-surface-variant uppercase font-semibold">Date & Time</p>
                  <p className="font-bold text-on-surface text-body-md">
                    {selectedDate} at {typeof selectedSlot === 'object' ? selectedSlot?.startTime || '' : selectedSlot}
                  </p>
                </div>
                <div className="border-t border-outline-variant/40 pt-3">
                  <p className="text-label-sm text-on-surface-variant uppercase font-semibold">Consultation Mode</p>
                  <p className="font-bold text-on-surface text-body-md capitalize">{mode}</p>
                </div>
                <div className="border-t border-outline-variant/40 pt-3 text-label-sm text-on-surface-variant leading-relaxed">
                  <span className="material-symbols-outlined text-primary text-base align-middle mr-1">auto_awesome</span>
                  An AI symptom summary will be automatically generated and provided to your doctor before your visit.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 3: BOOKING CONFIRMED & CALENDAR INTEGRATION */}
      {step === 3 && createdAppointment && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-success-container text-on-success-container rounded-2xl p-8 text-center shadow-elevation2 border border-success/30">
            <div className="w-16 h-16 rounded-full bg-success text-on-success flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">check</span>
            </div>
            <h2 className="font-headline text-headline-md font-bold">{t('booking.bookingSuccess')}</h2>
            <p className="text-body-md opacity-90 mt-2">
              Your appointment with <span className="font-bold">{doctor.name}</span> on{' '}
              <span className="font-bold">{createdAppointment.date}</span> at{' '}
              <span className="font-bold">{createdAppointment.startTime}</span> has been confirmed.
            </p>
          </div>

          <Card title="Appointment & Calendar Details" icon="calendar_add_on">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl text-label-md">
                <div>
                  <span className="text-on-surface-variant block">Doctor</span>
                  <span className="font-bold text-on-surface">{doctor.name} ({doctor.specialty || doctor.specialization})</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Date & Time</span>
                  <span className="font-bold text-on-surface">{createdAppointment.date} at {createdAppointment.startTime}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Mode</span>
                  <span className="font-bold text-on-surface capitalize">{createdAppointment.notes}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">AI Triage Urgency</span>
                  <span className="font-bold text-primary">{createdAppointment.urgency}</span>
                </div>
              </div>

              {/* Instant Google Calendar Sync & Download */}
              <div className="space-y-3 pt-2">
                <a
                  href={generateGoogleCalendarLink(createdAppointment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button fullWidth size="lg" variant="secondary" icon="calendar_add_on">
                    {t('patient.addToGoogleCalendar')}
                  </Button>
                </a>

                <Button
                  fullWidth
                  variant="outline"
                  icon="download"
                  onClick={() => downloadIcsFile(createdAppointment)}
                >
                  {t('patient.downloadIcs')}
                </Button>
              </div>

              <div className="flex gap-4 pt-4 border-t border-outline-variant/30">
                <Button fullWidth onClick={() => navigate('/patient/dashboard')}>
                  Go to Patient Dashboard
                </Button>
                <Button fullWidth variant="outline" onClick={() => navigate('/patient/appointments')}>
                  View My Appointments
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
