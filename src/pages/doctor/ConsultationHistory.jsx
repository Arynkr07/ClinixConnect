import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConsultationSummary from '../../components/consultation/ConsultationSummary';
import RecordingPlayer from '../../components/consultation/RecordingPlayer';
import {
  getAllConsultations,
  deleteConsultation,
  storePrescriptionDraft,
} from '../../utils/consultationUtils';
import { downloadConsultationSummaryPDF } from '../../utils/pdfUtils';
import { getAllRecordings, deleteRecording } from '../../utils/recordingUtils';
import { formatDateTime, formatDuration } from '../../utils/formatDate';

import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import { doctorSidebarItems } from './doctorNav';

export default function ConsultationHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sidebarItems = doctorSidebarItems(t);
  const [consultations, setConsultations] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedRecordings, setSelectedRecordings] = useState([]);

  const loadConsultations = () => setConsultations(getAllConsultations());

  useEffect(() => {
    loadConsultations();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return consultations;
    return consultations.filter((c) =>
      [c.patientName, c.patientId, c.consultationId, c.doctorName].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [consultations, query]);

  const openDetail = async (consultation) => {
    setSelected(consultation);
    const all = await getAllRecordings();
    setSelectedRecordings(all.filter((r) => r.consultationId === consultation.consultationId));
  };

  const handleDownload = (consultation) => {
    downloadConsultationSummaryPDF(consultation);
    toast.success(t('history.summaryPdfDownloaded'));
  };

  const handlePrescription = (consultation) => {
    storePrescriptionDraft(consultation);
    toast.success(t('history.openingPrescriptionEditor'));
    navigate('/doctor/prescription');
  };

  const handleDelete = (consultation) => {
    const confirmed = window.confirm(t('history.deleteConfirm', { id: consultation.consultationId }));
    if (!confirmed) return;
    const result = deleteConsultation(consultation.consultationId);
    if (result.success) {
      toast.success(t('history.deleted'));
      setSelected(null);
      loadConsultations();
    } else {
      toast.error(t('history.couldNotDelete'));
    }
  };

  const handleDeleteRecording = async (id) => {
    const result = await deleteRecording(id);
    if (result.success) {
      toast.success(t('consultation.recordingDeleted'));
      setSelectedRecordings((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(t('consultation.couldNotDeleteRecording'));
    }
  };

  const columns = [
    {
      key: 'patientName',
      header: t('history.patient'),
      render: (row) => (
        <div>
          <p className="font-bold text-on-surface">{row.patientName}</p>
          <p className="text-label-sm text-on-surface-variant">{row.patientId}</p>
        </div>
      ),
    },
    { key: 'consultationId', header: t('history.consultation'), render: (row) => <span className="font-mono text-label-md">{row.consultationId}</span> },
    { key: 'date', header: t('common.date'), render: (row) => formatDateTime(row.date) },
    { key: 'duration', header: t('common.duration'), render: (row) => formatDuration(row.duration || 0) },
    {
      key: 'diagnosis',
      header: t('common.diagnosis'),
      render: (row) =>
        row.diagnosis ? (
          <Badge variant="primary">{row.diagnosis}</Badge>
        ) : (
          <span className="text-on-surface-variant">—</span>
        ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openDetail(row)}
            className="p-2 rounded-full text-primary hover:bg-primary-container/30 transition-colors"
            title={t('history.viewSummary')}
            aria-label={t('history.viewSummaryAria', { id: row.consultationId })}
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload(row)}
            className="p-2 rounded-full text-primary hover:bg-primary-container/30 transition-colors"
            title={t('prescription.downloadPdf')}
            aria-label={t('history.downloadAria', { id: row.consultationId })}
          >
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrescription(row)}
            className="p-2 rounded-full text-primary hover:bg-primary-container/30 transition-colors"
            title={t('history.generatePrescription')}
            aria-label={t('history.generatePrescriptionAria', { id: row.consultationId })}
          >
            <span className="material-symbols-outlined text-lg">prescriptions</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="p-2 rounded-full text-error hover:bg-error-container transition-colors"
            title={t('history.deleteConsultation')}
            aria-label={t('history.deleteAria', { id: row.consultationId })}
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('history.title'),
        subtitle: t('history.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <Card
        title={t('history.pastConsultations')}
        icon="video_library"
        subtitle={t('history.completedSessions', { count: consultations.length })}
        headerRight={
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('history.search')}
            icon="search"
            wrapperClassName="w-full md:w-80"
            className="!h-12"
          />
        }
      >
        <Table
          columns={columns}
          data={filtered}
          rowKey="consultationId"
          emptyState={
            <div className="text-center py-14">
              <span className="material-symbols-outlined text-5xl text-outline">video_library</span>
              <p className="font-bold text-on-surface mt-3">
                {query ? t('history.noMatch') : t('history.noneYet')}
              </p>
              <p className="text-on-surface-variant text-label-md mt-1">
                {t('history.willAppearHere')}
              </p>
              {!query && (
                <Button className="mt-5" icon="call" onClick={() => navigate('/doctor/consultation')}>
                  {t('history.startConsultation')}
                </Button>
              )}
            </div>
          }
        />
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('history.consultationSummary')}
        icon="fact_check"
        size="lg"
      >
        {selected && (
          <ConsultationSummary
            summary={selected}
            onDownload={() => handleDownload(selected)}
            onPrescription={() => handlePrescription(selected)}
            onClose={() => setSelected(null)}
          />
        )}

        {selectedRecordings.length > 0 && (
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">videocam</span>
              <p className="font-headline text-headline-sm font-bold text-on-surface">
                {t('history.sessionRecordings')}
              </p>
              <Badge variant="neutral">{selectedRecordings.length}</Badge>
            </div>
            <div className="divide-y divide-outline-variant">
              {selectedRecordings.map((rec) => (
                <RecordingPlayer
                  key={rec.id}
                  recording={rec}
                  onDelete={handleDeleteRecording}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
