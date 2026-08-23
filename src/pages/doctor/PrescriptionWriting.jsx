import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import { MEDICATION_SUGGESTIONS, COMMON_MEDICINE_SCHEDULES } from '../../utils/constants';
import {
  validatePrescription,
  savePrescription,
  downloadPrescriptionPDF,
  printPrescription,
} from '../../utils/prescriptionUtils';
import { consumePrescriptionDraft } from '../../utils/consultationUtils';
import { aiService } from '../../services/aiService';
import { notificationService } from '../../services/notificationService';
import { appointmentService } from '../../services/appointmentService';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';

import { useAuth } from '../../hooks/useAuth';
import { doctorSidebarItems } from './doctorNav';

const DEFAULT_SCHEDULE = {
  morning: false,
  afternoon: false,
  night: false,
};

const EMPTY_MEDICINE = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
};

const nextMedicineId = () => `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function PrescriptionWriting() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sidebarItems = doctorSidebarItems(t);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [patientName, setPatientName] = useState(searchParams.get('patientName') || '');
  const [patientList, setPatientList] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [current, setCurrent] = useState(EMPTY_MEDICINE);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [editingId, setEditingId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [draftSource, setDraftSource] = useState(null);
  const [postVisitSummary, setPostVisitSummary] = useState('');
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);

  const generateNewPatientId = () => {
    const newId = `JD-${Math.floor(1000 + Math.random() * 9000)}`;
    setPatientId(newId);
    toast.success(`Generated Patient ID: ${newId}`);
  };

  useEffect(() => {
    const draft = consumePrescriptionDraft();
    let hasDraft = false;
    if (draft) {
      hasDraft = true;
      if (draft.patientId) setPatientId(draft.patientId);
      if (draft.patientName) setPatientName(draft.patientName);
      if (draft.diagnosis) setDiagnosis(draft.diagnosis);
      if (draft.advice) setAdvice(draft.advice);
      if (Array.isArray(draft.medicines) && draft.medicines.length > 0) {
        setMedicines(draft.medicines);
      }
      setDraftSource(draft.fromConsultation || null);
      toast.success(t('prescription.consultationLoaded'));
    }

    const loadBookedPatients = async () => {
      try {
        const apts = await appointmentService.getAppointments({ status: 'upcoming' });
        if (Array.isArray(apts) && apts.length > 0) {
          setPatientList(apts);
          if (!hasDraft && !searchParams.get('patientId') && !searchParams.get('patientName')) {
            const active = apts[0];
            const pId = active.patientId || active.patient?.id || `JD-${Math.floor(1000 + Math.random() * 9000)}`;
            const pName = active.patientName || active.patient?.name || 'Patient';
            setPatientId(pId);
            setPatientName(pName);
          }
        } else if (!hasDraft && !searchParams.get('patientId')) {
          setPatientId(`JD-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } catch (err) {
        console.warn('[PrescriptionWriting] Failed to load booked patients:', err);
        if (!hasDraft && !searchParams.get('patientId')) {
          setPatientId(`JD-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      }
    };
    loadBookedPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleLabel = (value = {}) =>
    COMMON_MEDICINE_SCHEDULES.filter((slot) => value[slot.toLowerCase()])
      .map((slot) => t(`prescription.${slot.toLowerCase()}`))
      .join(', ');

  const validateMedicineInput = () => {
    const missing = [];
    if (!current.medicineName.trim()) missing.push(t('prescription.missingMedicineName'));
    if (!current.dosage.trim()) missing.push(t('prescription.missingDosage'));
    if (!current.frequency.trim()) missing.push(t('prescription.missingFrequency'));
    if (!current.duration.trim()) missing.push(t('prescription.missingDuration'));
    return missing;
  };

  const resetMedicineForm = () => {
    setCurrent(EMPTY_MEDICINE);
    setSchedule(DEFAULT_SCHEDULE);
    setEditingId(null);
  };

  const addMedicine = () => {
    if (!current.medicineName.trim()) {
      toast.error('Please enter a medicine name.');
      return;
    }

    const filledMed = {
      ...current,
      dosage: current.dosage.trim() || '1 Tablet',
      frequency: current.frequency.trim() || 'Once daily (1-0-0)',
      duration: current.duration.trim() || '5 days',
      schedule: schedule.morning || schedule.afternoon || schedule.night ? schedule : { morning: true, afternoon: false, night: false },
    };

    if (editingId) {
      setMedicines((prev) =>
        prev.map((med) => (med.id === editingId ? { ...med, ...filledMed } : med))
      );
      toast.success(t('prescription.medicineUpdated'));
    } else {
      setMedicines((prev) => [...prev, { id: nextMedicineId(), ...filledMed }]);
      toast.success(t('prescription.medicineAdded'));
    }

    resetMedicineForm();
  };

  const startEdit = (med) => {
    setEditingId(med.id);
    setCurrent({
      medicineName: med.medicineName,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
    });
    setSchedule(med.schedule || DEFAULT_SCHEDULE);
    toast.success(t('prescription.editing', { name: med.medicineName }));
  };

  const removeMedicine = (med) => {
    const confirmed = window.confirm(t('prescription.removeConfirm', { name: med.medicineName }));
    if (!confirmed) return;
    setMedicines((prev) => prev.filter((m) => m.id !== med.id));
    if (editingId === med.id) resetMedicineForm();
    toast.success(t('prescription.medicineRemoved'));
  };

  const buildData = () => ({
    patientId,
    patientName,
    doctorName: user?.name || 'Dr. Rajesh Sharma',
    medicines,
    diagnosis,
    advice,
    postVisitSummary,
  });

  const handleGenerateAiSummary = async () => {
    if (!diagnosis.trim() && !advice.trim() && medicines.length === 0) {
      toast.error('Please enter diagnosis, advice, or medicines first.');
      return;
    }
    setGeneratingAiSummary(true);
    try {
      const combinedNotes = `Clinical Diagnosis: ${diagnosis || 'General'}. Doctor Advice: ${advice || 'Follow standard precautions'}.`;
      const res = await aiService.generatePostVisitSummary(combinedNotes, medicines);
      setPostVisitSummary(res.patientFriendlySummary);
      toast.success('Patient-friendly summary generated by AI!');
    } catch {
      toast.error('Could not generate AI summary.');
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  const handleDownload = () => {
    const missingFields = validatePrescription(buildData());
    if (missingFields.length > 0) {
      toast.error(t('prescription.cannotDownloadMissing', { fields: missingFields.join(', ') }));
      return;
    }
    downloadPrescriptionPDF(buildData());
    toast.success(t('prescription.pdfDownloaded'));
  };

  const handleSave = async () => {
    const data = buildData();
    const result = savePrescription(data);
    if (result.success) {
      // Mark matching appointments as 'completed' so they show in Patient's Completed section
      try {
        const pId = (data.patientId || '').toLowerCase();
        const pName = (data.patientName || '').toLowerCase();
        const apts = await appointmentService.getAppointments();

        const matchingApts = apts.filter(
          (a) =>
            ((a.patientId && String(a.patientId).toLowerCase() === pId) ||
             (a.patientName && String(a.patientName).toLowerCase() === pName)) &&
            a.status === 'upcoming'
        );

        for (const apt of matchingApts) {
          await appointmentService.update(apt.id, {
            status: 'completed',
            postVisitSummary: data.postVisitSummary || 'Consultation completed. Prescription generated.',
          });
        }
      } catch (e) {
        console.warn('[PrescriptionWriting] Failed to update appointment status:', e);
      }

      try {
        notificationService.sendToUser(data.patientId || 'patient', {
          title: 'Prescription & Post-Visit Summary Issued',
          description: `Your doctor has completed your consultation and issued your prescription & AI post-visit summary.`,
          icon: 'prescriptions',
          tone: 'success',
        });
      } catch (e) {
        /* ignore */
      }

      toast.success('Prescription & Summary saved! Appointment completed.');
      setTimeout(() => {
        navigate('/doctor/queue');
      }, 1200);
    } else if (result.missingFields) {
      toast.error(t('prescription.cannotSaveMissing', { fields: result.missingFields.join(', ') }));
    } else {
      toast.error(result.error || t('prescription.couldNotSave'));
    }
  };

  const handlePrint = () => {
    const missingFields = validatePrescription(buildData());
    if (missingFields.length > 0) {
      toast.error(t('prescription.cannotPrintMissing', { fields: missingFields.join(', ') }));
      return;
    }
    printPrescription(buildData());
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('prescription.title'),
        subtitle: t('prescription.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {draftSource && (
        <div className="mb-6 flex items-center gap-3 bg-secondary-container text-on-secondary-container rounded-xl px-5 py-4">
          <span className="material-symbols-outlined">fact_check</span>
          <p className="font-bold">
            {t('prescription.prefilledBanner', { id: draftSource })}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={t('prescription.patientInformation')}
            icon="person"
            headerRight={
              patientList.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-label-sm text-on-surface-variant font-semibold">Booked Patient:</span>
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx) && patientList[idx]) {
                        const selected = patientList[idx];
                        setPatientId(selected.patientId || selected.patient?.id || `JD-${Math.floor(1000 + Math.random() * 9000)}`);
                        setPatientName(selected.patientName || selected.patient?.name || 'Patient');
                      }
                    }}
                    className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-label-md font-semibold text-primary focus:ring-2 focus:ring-primary"
                  >
                    {patientList.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        {p.patientName || p.patient?.name || 'Patient'} ({p.patientId || p.patient?.id})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <Button size="sm" variant="outline" icon="autorenew" onClick={generateNewPatientId}>
                  Auto-Generate ID
                </Button>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input label={t('prescription.patientId')} value={patientId} onChange={(e) => setPatientId(e.target.value)} icon="badge" required />
                </div>
                <Button type="button" variant="outline" size="sm" icon="refresh" onClick={generateNewPatientId} className="h-14">
                  New ID
                </Button>
              </div>
              <Input label={t('prescription.patientName')} value={patientName} onChange={(e) => setPatientName(e.target.value)} icon="person" required />
            </div>
          </Card>

          <Card
            title={editingId ? t('prescription.editMedicine') : t('prescription.addMedication')}
            icon="medication"
            subtitle={editingId ? t('prescription.updateDetailsBelow') : t('prescription.addOneAtATime')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('prescription.medicineName')}
                value={current.medicineName}
                onChange={(e) => setCurrent((c) => ({ ...c, medicineName: e.target.value }))}
                placeholder={t('prescription.placeholderMedicineName')}
                icon="medication"
              />
              <Input
                label={t('prescription.dosage')}
                value={current.dosage}
                onChange={(e) => setCurrent((c) => ({ ...c, dosage: e.target.value }))}
                placeholder={t('prescription.placeholderDosage')}
                icon="edit_note"
              />
              <Input
                label={t('prescription.frequency')}
                value={current.frequency}
                onChange={(e) => setCurrent((c) => ({ ...c, frequency: e.target.value }))}
                placeholder={t('prescription.placeholderFrequency')}
                icon="schedule"
              />
              <Input
                label={t('prescription.durationDays')}
                value={current.duration}
                onChange={(e) => setCurrent((c) => ({ ...c, duration: e.target.value }))}
                placeholder={t('prescription.placeholderDuration')}
                type="number"
                icon="calendar_today"
              />
            </div>

            <div className="mt-4">
              <p className="font-bold text-on-surface mb-2">{t('prescription.schedule')}</p>
              <div className="flex flex-wrap gap-3">
                {COMMON_MEDICINE_SCHEDULES.map((slot) => (
                  <label
                    key={slot}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer border transition-all ${
                      schedule[slot.toLowerCase()]
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={schedule[slot.toLowerCase()]}
                      onChange={() => setSchedule((s) => ({ ...s, [slot.toLowerCase()]: !s[slot.toLowerCase()] }))}
                    />
                    <span className="material-symbols-outlined text-sm">{schedule[slot.toLowerCase()] ? 'check' : 'add'}</span>
                    {t(`prescription.${slot.toLowerCase()}`)}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-wrap gap-2 flex-1">
                {MEDICATION_SUGGESTIONS.filter((s) => !medicines.some((m) => m.medicineName === s)).slice(0, 10).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCurrent((c) => ({ ...c, medicineName: s }))}
                    className="px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant text-label-md hover:bg-primary-container transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {editingId && (
                  <Button type="button" onClick={resetMedicineForm} icon="close" variant="outline">
                    {t('common.cancel')}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={addMedicine}
                  icon={editingId ? 'check' : 'add_circle'}
                  variant={editingId ? 'primary' : 'secondary'}
                >
                  {editingId ? t('prescription.updateMedicine') : t('prescription.addToPrescription')}
                </Button>
              </div>
            </div>
          </Card>

          {medicines.length > 0 && (
            <Card
              title={t('prescription.prescriptionItems')}
              icon="playlist_add_check"
              subtitle={t('prescription.medicinesAdded', { count: medicines.length })}
            >
              <Table
                rowKey="id"
                data={medicines}
                columns={[
                  { key: 'medicineName', header: t('prescription.medicine') },
                  { key: 'dosage', header: t('prescription.dosage') },
                  { key: 'frequency', header: t('prescription.frequency') },
                  {
                    key: 'duration',
                    header: t('common.duration'),
                    render: (row) => t('prescription.durationValue', { count: row.duration }),
                  },
                  {
                    key: 'schedule',
                    header: t('prescription.schedule'),
                    render: (row) => scheduleLabel(row.schedule) || '—',
                  },
                  {
                    key: 'actions',
                    header: t('common.actions'),
                    render: (row) => (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="p-2 rounded-full text-primary hover:bg-primary-container/30 transition-colors"
                          aria-label={t('prescription.editAria', { name: row.medicineName })}
                          title={t('prescription.editTitle')}
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMedicine(row)}
                          className="p-2 rounded-full text-error hover:bg-error-container transition-colors"
                          aria-label={t('prescription.deleteAria', { name: row.medicineName })}
                          title={t('prescription.deleteTitle')}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          <Card title={t('prescription.diagnosisAdvice')} icon="stethoscope">
            <div className="space-y-4">
              <Input
                label={t('prescription.diagnosis')}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder={t('prescription.placeholderDiagnosis')}
                icon="diagnosis"
              />
              <div>
                <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">{t('prescription.adviceForPatient')}</label>
                <textarea
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  rows={3}
                  placeholder={t('prescription.advicePlaceholder')}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </Card>

          <Card
            title="AI Post-Visit Summary"
            icon="auto_awesome"
            subtitle="Converts clinical notes into a patient-friendly summary with medication schedules"
            headerRight={
              <Button
                size="sm"
                variant="secondary"
                icon="auto_awesome"
                loading={generatingAiSummary}
                onClick={handleGenerateAiSummary}
              >
                Generate AI Summary
              </Button>
            }
          >
            <div>
              <textarea
                value={postVisitSummary}
                onChange={(e) => setPostVisitSummary(e.target.value)}
                rows={5}
                placeholder="Click 'Generate AI Summary' to automatically produce a patient-friendly explanation with dosage schedule and follow-up guidance..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-sm leading-relaxed"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t('common.actions')} icon="bolt">
            <div className="space-y-3">
              <p className="text-label-lg font-bold text-primary">
                {t('prescription.medicinesAdded', { count: medicines.length })}
              </p>
              <Button
                fullWidth
                onClick={handleSave}
                icon="save"
              >
                {t('prescription.savePrescription')}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={handleDownload}
                icon="download"
              >
                {t('prescription.downloadPdf')}
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={handlePrint}
                icon="print"
              >
                {t('common.print')}
              </Button>
            </div>
          </Card>
          <Card title={t('prescription.quickReference')} icon="tips_and_updates">
            <ul className="space-y-2 text-label-md text-on-surface-variant">
              <li>{t('prescription.quickRef1')}</li>
              <li>{t('prescription.quickRef2')}</li>
              <li>{t('prescription.quickRef3')}</li>
              <li>{t('prescription.quickRef4')}</li>
            </ul>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
