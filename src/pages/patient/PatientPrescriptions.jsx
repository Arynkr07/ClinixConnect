import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { downloadPrescriptionPDF, printPrescription } from '../../utils/prescriptionUtils';
import { patientSidebarItems } from './patientNav';

export default function PatientPrescriptions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const sidebarItems = patientSidebarItems(t);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('savedPrescriptions') || '[]');
        const pid = (user?.patientId || user?.id || '').toLowerCase();
        const uname = (user?.name || '').toLowerCase();

        let filtered = Array.isArray(stored) ? stored : [];

        if (pid || uname) {
          const matching = filtered.filter(
            (rx) =>
              (rx.patientId && String(rx.patientId).toLowerCase() === pid) ||
              (rx.patientName && String(rx.patientName).toLowerCase() === uname) ||
              (rx.patientName && uname && rx.patientName.toLowerCase().includes(uname)) ||
              (!rx.patientId && !rx.patientName)
          );
          // If matching prescriptions found for current user, display them; otherwise show all stored prescriptions as fallback
          if (matching.length > 0) {
            filtered = matching;
          }
        }

        setPrescriptions(filtered);
      } catch (err) {
        console.error('Failed to load prescriptions:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleDownload = (rx) => {
    downloadPrescriptionPDF({
      patientId: rx.patientId,
      patientName: rx.patientName,
      diagnosis: rx.diagnosis,
      advice: rx.advice,
      medicines: rx.medicines,
    });
  };

  const handlePrint = (rx) => {
    printPrescription({
      patientId: rx.patientId,
      patientName: rx.patientName,
      diagnosis: rx.diagnosis,
      advice: rx.advice,
      medicines: rx.medicines,
    });
  };

  const handleAddToReminders = (rx) => {
    try {
      const existing = JSON.parse(localStorage.getItem('jd_custom_med_reminders') || '[]');
      const addedNames = [];

      (rx.medicines || []).forEach((med) => {
        const item = {
          id: `rx-rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          medicine: med.medicineName || 'Prescribed Medicine',
          slot: med.schedule?.morning ? 'Morning' : med.schedule?.afternoon ? 'Afternoon' : 'Night',
          time: med.schedule?.morning ? '08:30 AM' : med.schedule?.afternoon ? '01:30 PM' : '09:00 PM',
          instructions: `${med.dosage || '1 Dose'} (${med.duration ? `${med.duration} days` : 'Daily'})`,
          purpose: rx.diagnosis || 'Prescribed Medication',
          prescribedBy: rx.doctorName || 'Attending Physician',
        };
        existing.push(item);
        addedNames.push(med.medicineName);
      });

      localStorage.setItem('jd_custom_med_reminders', JSON.stringify(existing));
      notify({ type: 'success', message: `Added ${addedNames.join(', ')} to Medication Reminders!` });
    } catch {
      notify({ type: 'error', message: 'Could not add to reminders.' });
    }
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('patient.myPrescriptions'),
        subtitle: 'Digital electronic prescriptions verified by your doctors',
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : prescriptions.length === 0 ? (
        <Card className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-4xl">prescriptions</span>
          </div>
          <h3 className="font-headline text-title-lg font-bold text-on-surface">No Prescriptions Issued Yet</h3>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto mt-2">
            You do not have any active or past medical prescriptions. Once you complete a consultation and your doctor prescribes medication, your verified digital prescription will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="hover:border-primary/40 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-primary text-title-md">{rx.prescriptionId || rx.id}</span>
                    <Badge variant="success">Verified Digital Prescription</Badge>
                  </div>
                  <p className="text-body-md text-on-surface-variant mt-1">
                    Prescribed by <strong className="text-on-surface">{rx.doctorName || 'Attending Physician'}</strong> ({rx.specialty || 'General Medicine'})
                  </p>
                  <p className="text-label-sm text-outline mt-0.5">{rx.facility || 'Health Center'} · Issued on {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : rx.date}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" icon="alarm_on" onClick={() => handleAddToReminders(rx)}>
                    Add to Reminders
                  </Button>
                  <Button size="sm" variant="outline" icon="print" onClick={() => handlePrint(rx)}>
                    Print
                  </Button>
                  <Button size="sm" icon="download" onClick={() => handleDownload(rx)}>
                    Download PDF
                  </Button>
                </div>
              </div>

              {rx.diagnosis && (
                <div className="bg-surface-container-low rounded-xl p-4 mb-5 border border-outline-variant/20">
                  <p className="text-label-sm font-bold text-primary uppercase tracking-wider mb-1">Clinical Diagnosis & Notes</p>
                  <p className="text-body-md text-on-surface font-semibold">{rx.diagnosis}</p>
                  {rx.advice && <p className="text-body-sm text-on-surface-variant mt-1">Advice: {rx.advice}</p>}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/40 text-on-surface-variant text-label-sm uppercase">
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Daily Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {(rx.medicines || []).map((med, idx) => (
                      <tr key={med.id || idx} className="hover:bg-surface-container-lowest font-medium">
                        <td className="py-3 px-3 text-on-surface font-bold">{med.medicineName}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{med.dosage}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{med.frequency}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{med.duration}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {med.schedule?.morning && <span className="px-2 py-0.5 rounded text-label-sm bg-warning-container text-on-warning-container">Morning</span>}
                            {med.schedule?.afternoon && <span className="px-2 py-0.5 rounded text-label-sm bg-secondary-container text-on-secondary-container">Afternoon</span>}
                            {med.schedule?.night && <span className="px-2 py-0.5 rounded text-label-sm bg-primary-container text-on-primary-container">Night</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
