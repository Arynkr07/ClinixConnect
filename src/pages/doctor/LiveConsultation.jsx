import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConsultationVideo from '../../components/consultation/ConsultationVideo';
import ChatPanel from '../../components/consultation/ChatPanel';
import TranscriptPanel from '../../components/consultation/TranscriptPanel';
import ConsultationSummary from '../../components/consultation/ConsultationSummary';
import RecordingPlayer from '../../components/consultation/RecordingPlayer';
import { consultationService } from '../../services/consultationService';
import { patientService } from '../../services/patientService';
import { caseFileService } from '../../services/caseFileService';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import { saveScribeNotes, loadScribeNotes } from '../../utils/scribeNotesUtils';
import {
  SIMULATED_TRANSCRIPT,
  createScribeSections,
  sectionsToText,
} from '../../utils/transcriptUtils';
import {
  generateSummary,
  saveConsultationSummary,
  storePrescriptionDraft,
  getMedicineRecommendations,
} from '../../utils/consultationUtils';
import { downloadConsultationSummaryPDF } from '../../utils/pdfUtils';
import {
  getAllRecordings,
  saveRecording,
  deleteRecording,
  sanitizeRecordingName,
} from '../../utils/recordingUtils';

const ACTIVE_SESSION_KEY = 'jd_active_session_id';
const FALLBACK_CONSULTATION_ID = 'sess-demo';

const AI_ASSISTANTS = [
  { id: 'medicine', labelKey: 'consultation.medicineAi', icon: 'medication', status: 'ready', statusKey: 'consultation.statusActive', noteKey: 'consultation.aiMedicineNote' },
  { id: 'disease', labelKey: 'consultation.diseaseAi', icon: 'biotech', status: 'alert', statusKey: 'consultation.statusHighRisk', noteKey: 'consultation.aiDiseaseNote' },
  { id: 'interaction', labelKey: 'consultation.interactionAi', icon: 'warning', status: 'ok', statusKey: 'consultation.statusClear', noteKey: 'consultation.aiInteractionNote' },
  { id: 'risk', labelKey: 'consultation.riskAi', icon: 'priority_high', status: 'critical', statusKey: 'consultation.statusCritical', noteKey: 'consultation.aiRiskNote' },
  { id: 'emergency', labelKey: 'consultation.emergencyAi', icon: 'emergency', status: 'idle', statusKey: 'consultation.statusMonitoring', noteKey: 'consultation.aiEmergencyNote' },
];

const AI_STATUS_VARIANT = {
  ready: 'success',
  alert: 'warning',
  ok: 'success',
  critical: 'error',
  idle: 'neutral',
};

import { doctorSidebarItems } from './doctorNav';

export default function LiveConsultation() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify } = useNotification();
  const { user } = useAuth();
  const sidebarItems = doctorSidebarItems(t);
  const [patient, setPatient] = useState(null);
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingMode, setRecordingMode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [ended, setEnded] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const sessionStartRef = useRef(Date.now());

  const getConsultationId = () =>
    session?.sessionId ||
    sessionStorage.getItem(ACTIVE_SESSION_KEY) ||
    FALLBACK_CONSULTATION_ID;

  useEffect(() => {
    const init = async () => {
      const [p, t] = await Promise.all([
        patientService.getById('JD-9921'),
        consultationService.getTranscript('sess-demo'),
      ]);
      setPatient(p);
      const consultationId =
        sessionStorage.getItem(ACTIVE_SESSION_KEY) || FALLBACK_CONSULTATION_ID;
      const initialNotes = loadScribeNotes(consultationId) || t.scribe;
      setNotes(initialNotes);
      setSections(createScribeSections(initialNotes));
      setLiveTranscript(SIMULATED_TRANSCRIPT);
      const all = await getAllRecordings();
      setRecordings(all.filter((r) => r.consultationId === consultationId));
    };
    init();
  }, []);

  const startSession = async () => {
    const s = await consultationService.createSession(patient.id);
    setSession(s);
    sessionStartRef.current = Date.now();
    sessionStorage.setItem(ACTIVE_SESSION_KEY, s.sessionId);
    setLiveTranscript(SIMULATED_TRANSCRIPT);
    notify({ type: 'info', message: t('consultation.sessionStarted', { id: s.sessionId }) });
  };

  const endSession = async () => {
    const consultationId = getConsultationId();
    if (session) await consultationService.endSession(session.sessionId, notes);

    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const diagnosis = sections.find((s) => s.id === 'assessment')?.content || '';
    const summaryData = generateSummary({
      consultationId,
      patient,
      doctorId: user?.id || user?.email || 'doctor',
      doctorName: user?.name || 'Dr. Rajesh Khanna',
      duration,
      diagnosis,
      vitals: patient.vitals || {},
      medicines: getMedicineRecommendations(),
      scribeSections: sections,
      notes,
    });
    saveConsultationSummary(summaryData);
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    setSummary(summaryData);
    setEnded(true);
    notify({ type: 'success', message: t('consultation.endedSaved') });
  };

  const updateSection = (id, value) => {
    const next = sections.map((s) => (s.id === id ? { ...s, content: value } : s));
    setSections(next);
    setNotes(sectionsToText(next));
  };

  const regenerateSections = () => {
    setSections(createScribeSections(notes));
    toast.success(t('consultation.regenerated'));
  };

  const handleSaveNotes = () => {
    if (!notes.trim()) {
      toast.error(t('consultation.enterNotesFirst'));
      return;
    }
    const result = saveScribeNotes({
      consultationId: getConsultationId(),
      patientId: patient.id,
      doctorId: user?.id || user?.email || 'doctor',
      notes: notes.trim(),
    });
    if (result.success) {
      toast.success(t('consultation.notesSaved'));
    } else {
      toast.error(t('consultation.couldNotSaveNotes'));
    }
  };

  const handleRecordingComplete = async ({ videoBlob, mimeType, duration }) => {
    const recording = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      consultationId: getConsultationId(),
      patientId: patient.id,
      doctorId: user?.id || user?.email || 'doctor',
      recordingName: sanitizeRecordingName(t('consultation.recordingName', { name: patient.name })),
      duration,
      recordingDate: new Date().toISOString(),
      videoBlob,
      mimeType,
    };
    const result = await saveRecording(recording);
    if (result.success) {
      toast.success(
        videoBlob
          ? t('consultation.recordingSaved')
          : t('consultation.recordingSavedDemo')
      );
      setRecordings((prev) => [recording, ...prev]);
    } else {
      toast.error(t('consultation.couldNotSaveRecording'));
    }
  };

  const handleRecordingStatus = ({ active, mode }) => {
    setRecordingActive(active);
    setRecordingMode(mode);
  };

  const handleDeleteRecording = async (id) => {
    const result = await deleteRecording(id);
    if (result.success) {
      toast.success(t('consultation.recordingDeleted'));
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(t('consultation.couldNotDeleteRecording'));
    }
  };

  const handleDownloadSummary = () => {
    downloadConsultationSummaryPDF(summary);
    toast.success(t('history.summaryPdfDownloaded'));
  };

  const handleGeneratePrescription = () => {
    storePrescriptionDraft(summary);
    toast.success(t('history.openingPrescriptionEditor'));
    navigate('/doctor/prescription');
  };

  const handleApproveSummary = async (draftSummary) => {
    setApproving(true);
    try {
      await caseFileService.saveApprovedSummary(patient, {
        diagnosis: draftSummary.diagnosis || '',
        consultationSummary:
          draftSummary.advice ||
          sectionsToText(draftSummary.scribeSections) ||
          '',
        consultationNotes: draftSummary.notes || '',
        approvedBy: user?.name || user?.email || 'Doctor',
      });
      setApproved(true);
      notify({ type: 'success', message: t('consultation.summaryApproved') });
    } catch (error) {
      notify({
        type: 'error',
        message: error?.message || t('consultation.approveFailed'),
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('consultation.title'),
        subtitle: t('consultation.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {!patient ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : !session ? (
        <Card className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-3xl font-bold mb-4">
              {patient.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <h3 className="font-headline text-headline-md font-bold text-on-surface">{patient.name}</h3>
            <p className="text-on-surface-variant mb-2">{patient.id} · {patient.village}</p>
            <Badge variant="critical" uppercase>{t('case.riskBadge', { risk: patient.risk })}</Badge>
            <div className="bg-surface-container-low rounded-lg p-4 mt-6 text-left w-full max-w-md">
              <p className="text-label-md text-on-surface-variant mb-1">{t('consultation.complaint')}</p>
              <p className="text-on-surface font-medium">{patient.complaint}</p>
            </div>
            <div className="mt-8 flex gap-3">
              <Button size="lg" icon="videocam" onClick={startSession}>
                {t('consultation.startSession')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/doctor/queue')}>
                {t('consultation.backToQueue')}
              </Button>
            </div>
          </div>
        </Card>
      ) : ended ? (
        <Card className="max-w-4xl mx-auto">
          <ConsultationSummary
            summary={summary}
            editable
            approved={approved}
            approving={approving}
            onApprove={handleApproveSummary}
            onDownload={handleDownloadSummary}
            onPrescription={handleGeneratePrescription}
            onClose={() => navigate('/doctor/dashboard')}
          />
        </Card>
      ) : (
        <>
          <ConsultationVideo
            patient={patient}
            onEnd={endSession}
            onRecordingComplete={handleRecordingComplete}
            onRecordingStatusChange={handleRecordingStatus}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              <TranscriptPanel messages={liveTranscript} />
              <Card
                title={t('consultation.aiScribeNotes')}
                icon="auto_awesome"
                subtitle={t('consultation.scribeSubtitle')}
                headerRight={
                  <Button size="sm" variant="outline" icon="refresh" onClick={regenerateSections}>
                    {t('consultation.regenerate')}
                  </Button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sections.map((section) => (
                    <div key={section.id}>
                      <label className="flex items-center gap-2 text-label-md font-bold text-on-surface mb-1">
                        <span className="material-symbols-outlined text-primary text-base">
                          {section.icon}
                        </span>
                        {t(`scribe.${section.id}`)}
                      </label>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button variant="secondary" icon="save" onClick={handleSaveNotes}>
                    {t('consultation.saveScribeNotes')}
                  </Button>
                  <Button variant="outline" icon="assignment_turned_in" onClick={endSession}>
                    {t('consultation.endConsultation')}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <ChatPanel onSend={() => {}} />
              <Card title={t('consultation.aiAssistants')} icon="smart_toy" subtitle={t('consultation.cloudAiBackend')}>
                <div className="space-y-3">
                  {AI_ASSISTANTS.map((ai) => (
                    <div key={ai.id} className="flex items-start gap-3 rounded-lg bg-surface-container-low p-3">
                      <span className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">{ai.icon}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-on-surface text-label-md">{t(ai.labelKey)}</p>
                          <Badge variant={AI_STATUS_VARIANT[ai.status]}>{t(ai.statusKey)}</Badge>
                        </div>
                        <p className="text-label-md text-on-surface-variant mt-0.5">{t(ai.noteKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title={t('consultation.consultationRecording')} icon="videocam" subtitle={t('consultation.recordingSubtitle')}>
                <div className="flex items-center gap-2 mb-4">
                  {recordingActive ? (
                    <Badge variant="warning" dot dotColor="bg-error">
                      {recordingMode === 'real' ? t('consultation.recordingInProgress') : t('consultation.recordingDemo')}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">{t('consultation.notRecording')}</Badge>
                  )}
                </div>
                {recordings.length === 0 ? (
                  <p className="text-on-surface-variant text-label-md">
                    {t('consultation.noRecordingsYet')}
                  </p>
                ) : (
                  <div className="divide-y divide-outline-variant">
                    {recordings.map((rec) => (
                      <RecordingPlayer key={rec.id} recording={rec} compact onDelete={handleDeleteRecording} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
