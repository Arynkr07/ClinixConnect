import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '../../utils/helpers';
import { formatDateTime, formatDuration } from '../../utils/formatDate';
import { SCRIBE_SECTIONS } from '../../utils/transcriptUtils';
import Badge from '../common/Badge';
import Button from '../common/Button';

/**
 * ConsultationSummary - human-readable view of a completed consultation.
 * Props:
 *  - summary: object produced by generateSummary / saved consultation
 *  - onDownload, onPrescription, onClose: action callbacks
 *  - editable: render editable fields + "Approve & Save to Case Record" action
 *  - approved, approving, onApprove: approval-flow state + callback
 */
export default function ConsultationSummary({
  summary,
  onDownload,
  onPrescription,
  onClose,
  showActions = true,
  editable = false,
  approved = false,
  approving = false,
  onApprove,
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => ({
    diagnosis: summary?.diagnosis || '',
    advice: summary?.advice || '',
    notes: summary?.notes || '',
    sections: (Array.isArray(summary?.scribeSections) ? summary.scribeSections : []).reduce(
      (acc, s) => ({ ...acc, [s.id]: s.content || '' }),
      {}
    ),
  }));
  if (!summary) return null;

  const initials = (summary.patientName || 'P')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const vitals = summary.vitals || {};
  const vitalsChips = [
    vitals.bp && { label: 'BP', value: vitals.bp },
    vitals.pulse && { label: 'Pulse', value: `${vitals.pulse} bpm` },
    vitals.temp && { label: 'Temp', value: `${vitals.temp}°F` },
    vitals.spo2 && { label: 'SpO2', value: `${vitals.spo2}%` },
  ].filter(Boolean);

  const medicines = Array.isArray(summary.medicines) ? summary.medicines : [];

  const sectionMeta = SCRIBE_SECTIONS.reduce((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {});

  const sections = Array.isArray(summary.scribeSections)
    ? summary.scribeSections.filter((s) => String(s.content || '').trim())
    : [];

  const meta = [
    { label: t('consultation.consultationId'), value: summary.consultationId || '—' },
    { label: t('consultation.dateTime'), value: summary.date ? formatDateTime(summary.date) : '—' },
    { label: t('common.duration'), value: formatDuration(summary.duration || 0) },
    { label: t('consultation.doctor'), value: summary.doctorName || '—' },
    { label: t('common.village'), value: summary.patientVillage || '—' },
  ];

  const updateSection = (id, value) =>
    setDraft((d) => ({ ...d, sections: { ...d.sections, [id]: value } }));

  const handleApprove = () => {
    if (!onApprove) return;
    onApprove({
      ...summary,
      diagnosis: draft.diagnosis,
      advice: draft.advice,
      notes: draft.notes,
      scribeSections: (Array.isArray(summary.scribeSections) ? summary.scribeSections : []).map(
        (s) => ({ ...s, content: draft.sections[s.id] ?? s.content })
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-2xl font-bold">
            {initials}
          </div>
          <div>
            <p className="font-headline text-headline-md font-bold text-on-surface">
              {summary.patientName}
            </p>
            <p className="text-on-surface-variant text-label-md">
              {summary.patientId}
              {summary.patientAge && ` · ${summary.patientAge} yrs`}
              {summary.patientGender && ` · ${summary.patientGender}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          {approved ? (
            <Badge variant="success" icon="verified">{t('consultation.approvedBadge')}</Badge>
          ) : (
            <Badge variant="primary" icon="fact_check">{t('consultation.summaryBadge')}</Badge>
          )}
          {!editable && summary.diagnosis && (
            <p className="text-label-md text-primary font-bold mt-2">{summary.diagnosis}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {meta.map((item) => (
          <div key={item.label} className="bg-surface-container-low rounded-lg px-4 py-3">
            <p className="text-label-sm text-on-surface-variant">{item.label}</p>
            <p className="font-bold text-on-surface truncate" title={item.value}>{item.value}</p>
          </div>
        ))}
      </div>

      {summary.complaint && (
        <div>
          <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide mb-1">{t('consultation.complaint')}</p>
          <p className="text-on-surface font-medium">{summary.complaint}</p>
        </div>
      )}

      {editable && (
        <div>
          <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide mb-1">{t('common.diagnosis')}</p>
          <textarea
            value={draft.diagnosis}
            onChange={(e) => setDraft((d) => ({ ...d, diagnosis: e.target.value }))}
            rows={2}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        </div>
      )}

      {vitalsChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vitalsChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant"
            >
              <span className="text-label-sm text-on-surface-variant">{chip.label}</span>
              <span className="font-bold text-on-surface">{chip.value}</span>
            </span>
          ))}
        </div>
      )}

      {medicines.length > 0 && (
        <div>
          <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide mb-2">
            {t('consultation.medicinesRecommended', { count: medicines.length })}
          </p>
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            {medicines.map((med, i) => (
              <div
                key={med.id || i}
                className={cx(
                  'px-4 py-3 flex items-center justify-between gap-4',
                  i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
                )}
              >
                <div>
                  <p className="font-bold text-on-surface">{med.medicineName || med.name || '—'}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {med.dosage || '—'} · {med.frequency || '—'}
                    {med.duration ? ` · ${med.duration} days` : ''}
                  </p>
                </div>
                <span className="material-symbols-outlined text-primary">medication</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const metaInfo = sectionMeta[section.id] || {};
          return (
            <div key={section.id} className="bg-surface-container-low rounded-lg p-4">
              <p className="flex items-center gap-2 text-label-md font-bold text-primary uppercase tracking-wide mb-1">
                {metaInfo.icon && (
                  <span className="material-symbols-outlined text-base">{metaInfo.icon}</span>
                )}
                {section.title || metaInfo.title || section.id}
              </p>
              {editable ? (
                <textarea
                  value={draft.sections[section.id] ?? section.content}
                  onChange={(e) => updateSection(section.id, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
                />
              ) : (
                <p className="text-on-surface text-body-md leading-relaxed">{section.content}</p>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide mb-1">{t('consultation.advice')}</p>
        {editable ? (
          <textarea
            value={draft.advice}
            onChange={(e) => setDraft((d) => ({ ...d, advice: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        ) : (
          <p className="text-on-surface leading-relaxed">{summary.advice || '—'}</p>
        )}
      </div>

      <div>
        <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide mb-1">{t('consultation.doctorNotes')}</p>
        {editable ? (
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        ) : (
          <p className="text-on-surface leading-relaxed whitespace-pre-line">{summary.notes || '—'}</p>
        )}
      </div>

      {showActions && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-outline-variant">
          {onClose && (
            <Button variant="outline" icon="close" onClick={onClose}>
              {t('common.close')}
            </Button>
          )}
          {editable && onApprove && !approved && (
            <Button icon="verified" onClick={handleApprove} disabled={approving}>
              {approving ? t('consultation.approving') : t('consultation.approveAndSave')}
            </Button>
          )}
          {onDownload && (
            <Button variant="secondary" icon="download" onClick={onDownload}>
              {t('common.download')}
            </Button>
          )}
          {onPrescription && (
            <Button icon="prescriptions" onClick={onPrescription}>
              {t('history.generatePrescription')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
