import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { patientService } from '../../services/patientService';
import { caseFileService } from '../../services/caseFileService';
import { RISK_STYLES } from '../../utils/constants';

const SIDEBAR = {
  items: [
    { labelKey: 'dashboard', to: '/doctor/dashboard', icon: 'dashboard', end: true },
    { labelKey: 'patientQueue', to: '/doctor/queue', icon: 'groups' },
    { labelKey: 'liveConsultation', to: '/doctor/consultation', icon: 'call' },
    { labelKey: 'followUp', to: '/doctor/followup', icon: 'event_repeat' },
    { labelKey: 'consultationHistory', to: '/doctor/consultation-history', icon: 'video_library' },
    { labelKey: 'performanceAnalytics', to: '/doctor/performance', icon: 'query_stats' },
  ],
};

function VitalCard({ label, value, unit, icon, numeric = false }) {
  const displayValue = (() => {
    if (value === null || value === undefined || value === '') return '—';
    if (numeric) {
      const num = Number(value);
      return Number.isFinite(num) ? String(num) : '—';
    }
    return String(value);
  })();

  return (
    <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3 min-w-0">
      <span className="material-symbols-outlined text-primary shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-label-md text-on-surface-variant truncate">{label}</p>
        <p className="font-headline font-bold text-on-surface truncate">
          {displayValue} <span className="text-sm font-normal text-on-surface-variant whitespace-nowrap">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3 min-w-0">
      <span className="material-symbols-outlined text-primary shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-label-md text-on-surface-variant truncate">{label}</p>
        <p className="font-headline font-bold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

function ReportSection({ icon, title, children }) {
  return (
    <section>
      <h4 className="flex items-center gap-2 font-bold text-on-surface mb-3">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export default function PatientCaseSummary() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const sidebarItems = SIDEBAR.items.map((item) => ({ ...item, label: t(`nav.${item.labelKey}`) }));
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await patientService.getById(id);
      setPatient(data);
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!patient) return undefined;
    let active = true;
    setAiLoading(true);
    setAiSummary(null);
    caseFileService
      .getAiSummary(patient)
      .then((summary) => {
        if (active) setAiSummary(summary);
      })
      .finally(() => {
        if (active) setAiLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patient]);

  const headerRight = (
    <>
      <NotificationBell />
      <ProfileMenu />
    </>
  );

  const likelihoodVariant = (likelihood) =>
    likelihood === 'High' ? 'critical' : likelihood === 'Moderate' ? 'warning' : 'secondary';

  const formatGeneratedOn = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? '');
    return date.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const triageLabel = (level) => {
    if (level === 'priority') return t('case.triagePriority');
    if (level === 'standard') return t('case.triageStandard');
    if (level === 'routine') return t('case.triageRoutine');
    return aiSummary?.status ?? '—';
  };

  return (
    <DashboardLayout sidebarProps={{ items: sidebarItems }} headerProps={{ title: t('case.title'), subtitle: id ? t('case.patientId', { id }) : t('case.selectPatient'), right: headerRight }}>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : !patient ? (
        <Card className="p-10 text-center">
          <p className="text-on-surface-variant">{t('case.notFound')}</p>
          <Link to="/doctor/queue">
            <Button className="mt-4">{t('case.backToQueue')}</Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-2xl font-bold">
                  {patient.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-headline text-headline-md font-bold text-on-surface">{patient.name}</h3>
                  <p className="text-on-surface-variant">
                    {patient.id} · {patient.age} {t('case.yrs')} · {patient.gender} · {patient.village}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={RISK_STYLES[patient.risk] ? patient.risk === 'Critical' ? 'critical' : patient.risk === 'Moderate' ? 'warning' : 'success' : 'neutral'} uppercase>
                  {t('case.riskBadge', { risk: patient.risk })}
                </Badge>
                <Link to="/doctor/prescription">
                  <Button icon="edit_note">{t('case.writePrescription')}</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card
            className="mb-6"
            title={t('case.reportTitle')}
            subtitle={t('case.reportDescription')}
            icon="auto_awesome"
            borderLeft="primary"
          >
            {aiLoading || !aiSummary ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetaItem icon="fact_check" label={t('case.reportStatus')} value={aiSummary.status} />
                  <MetaItem icon="monitoring" label={t('case.reportConfidence')} value={`${Math.round(aiSummary.confidence * 100)}%`} />
                  <MetaItem icon="schedule" label={t('case.reportGeneratedOn')} value={formatGeneratedOn(aiSummary.generatedAt)} />
                  <MetaItem icon="priority_high" label={t('case.triageLevel')} value={triageLabel(aiSummary.triageLevel)} />
                </div>

                <ReportSection icon="article" title={t('case.reportClinicalSummary')}>
                  <p className="text-body-lg text-on-surface leading-relaxed">{aiSummary.clinicalSummary}</p>
                </ReportSection>

                <ReportSection icon="checklist" title={t('case.reportSymptoms')}>
                  {(aiSummary.reportedSymptoms?.length || aiSummary.negativeFindings?.length) ? (
                    <ul className="space-y-2">
                      {(aiSummary.reportedSymptoms ?? []).map((s) => (
                        <li key={s} className="flex items-start gap-2 text-on-surface">
                          <span className="material-symbols-outlined text-sm text-primary mt-0.5">check_circle</span>
                          {s}
                        </li>
                      ))}
                      {(aiSummary.negativeFindings ?? []).map((n) => (
                        <li key={n} className="flex items-start gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm text-error mt-0.5">block</span>
                          <span>{n}</span>
                          <Badge variant="neutral">{t('case.reportNegativeFinding')}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-on-surface-variant">{t('case.reportNoSymptoms')}</p>
                  )}
                </ReportSection>

                <ReportSection icon="diagnosis" title={t('case.reportConditions')}>
                  <p className="text-sm text-on-surface-variant mb-4">{t('case.reportConditionsNote')}</p>
                  <ul className="space-y-3">
                    {(aiSummary.differentials ?? []).map((d) => (
                      <li key={d.condition} className="bg-surface-container-low rounded-lg p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-on-surface">{d.condition}</p>
                          <Badge variant={likelihoodVariant(d.likelihood)}>
                            {d.likelihood} {t('case.reportPriorityLabel')}
                          </Badge>
                        </div>
                        {d.note && <p className="mt-1 text-sm text-on-surface-variant">{d.note}</p>}
                      </li>
                    ))}
                  </ul>
                </ReportSection>

                <ReportSection icon="warning" title={t('case.reportWarningSigns')}>
                  <p className="text-sm text-on-surface-variant mb-4">{t('case.reportWarningSignsNote')}</p>
                  <ul className="space-y-3">
                    {(aiSummary.warningSigns ?? []).map((w) => (
                      <li key={w.finding} className="flex items-start gap-3 border border-error/25 bg-error/5 rounded-lg p-3">
                        <span className="material-symbols-outlined text-error shrink-0">error</span>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{w.finding}</p>
                          {w.reason && <p className="mt-0.5 text-sm text-on-surface-variant">{w.reason}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </ReportSection>

                <ReportSection icon="quiz" title={t('case.reportQuestions')}>
                  <ul className="space-y-2">
                    {(aiSummary.followupQuestions ?? []).map((q) => (
                      <li key={q} className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary text-base shrink-0">help</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </ReportSection>

                <section className="rounded-lg border-l-4 border-l-primary bg-primary-container p-4">
                  <h4 className="flex items-center gap-2 font-bold text-on-primary-container mb-2">
                    <span className="material-symbols-outlined">flag</span>
                    {t('case.reportNextStep')}
                  </h4>
                  <p className="text-sm text-on-primary-container leading-relaxed">{aiSummary.nextStep}</p>
                </section>

                <ReportSection icon="local_hospital" title={t('case.reportDoctorInfo')}>
                  <div className="bg-surface-container-low rounded-lg p-4">
                    <p className="flex items-center gap-2 font-bold text-on-surface mb-2">
                      <span className="material-symbols-outlined text-primary">stethoscope</span>
                      {t('case.reportAssignedDoctor')}
                    </p>
                    {aiSummary.doctor ? (
                      <ul className="space-y-1 text-sm text-on-surface-variant">
                        <li className="font-semibold text-on-surface">{aiSummary.doctor.name}</li>
                        {aiSummary.doctor.specialization && <li>{aiSummary.doctor.specialization}</li>}
                        {aiSummary.doctor.facility && <li>{aiSummary.doctor.facility}</li>}
                      </ul>
                    ) : (
                      <p className="text-sm text-on-surface-variant">{t('case.reportNoDoctorAssigned')}</p>
                    )}
                  </div>
                </ReportSection>

                <p className="text-sm text-on-surface-variant italic">{t('case.reportDisclaimer')}</p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card title={t('case.chiefComplaint')} icon="description" className="lg:col-span-1">
              <p className="text-body-lg text-on-surface">{patient.complaint}</p>
              <div className="mt-4 space-y-2">
                {(patient.summary ?? []).map((line, i) => (
                  <p key={i} className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm text-primary mt-0.5">check_circle</span>
                    {line}
                  </p>
                ))}
              </div>
            </Card>

            <Card title={t('case.vitalSigns')} icon="favorite" className="lg:col-span-1">
              {patient.vitals && (patient.vitals.bp || patient.vitals.temp || patient.vitals.pulse || patient.vitals.weight) ? (
                <div className="grid grid-cols-2 gap-3">
                  <VitalCard label={t('case.bloodPressure')} value={patient.vitals?.bp} unit="mmHg" icon="blood_pressure" />
                  <VitalCard label={t('case.temperature')} value={patient.vitals?.temp} unit="°F" icon="device_thermostat" />
                  <VitalCard label={t('case.pulse')} value={patient.vitals?.pulse} unit="bpm" icon="ecg_heart" numeric />
                  <VitalCard label={t('case.weight')} value={patient.vitals?.weight} unit="kg" icon="monitor_weight" />
                </div>
              ) : (
                <div className="text-center py-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl opacity-60 mb-2 block">favorite_border</span>
                  <p className="text-body-sm font-semibold">No vital signs recorded for this patient.</p>
                </div>
              )}
            </Card>

            <Card title={t('case.recommendation')} icon="medical_services" className="lg:col-span-1">
              <div className="bg-primary-container rounded-lg p-4">
                <p className="text-sm text-on-primary-container">
                  {patient.recommendation || 'No specific clinical recommendation issued yet.'}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/doctor/prescription">
                  <Button variant="primary" fullWidth icon="edit_note">Write Prescription</Button>
                </Link>
                <Link to="/doctor/followup">
                  <Button variant="outline" fullWidth icon="event_available">{t('case.scheduleFollowUp')}</Button>
                </Link>
              </div>
            </Card>
          </div>

          <Card title={t('case.medicalHistory')} icon="history">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  titleKey: 'diagnosis',
                  title: t('case.diagnosis'),
                  items: Array.isArray(patient.medicalHistory) && patient.medicalHistory.length > 0 ? patient.medicalHistory : [],
                  emptyText: 'No prior diagnoses recorded',
                  icon: 'diagnosis',
                },
                {
                  titleKey: 'medications',
                  title: t('case.medications'),
                  items: Array.isArray(patient.medications) && patient.medications.length > 0 ? patient.medications : [],
                  emptyText: 'No active medications',
                  icon: 'medication',
                },
                {
                  titleKey: 'allergies',
                  title: t('case.allergies'),
                  items: Array.isArray(patient.allergies) && patient.allergies.length > 0 ? patient.allergies.map((a) => typeof a === 'string' ? a : `${a.name}${a.severity ? ` (${a.severity})` : ''}`) : [],
                  emptyText: 'No known allergies',
                  icon: 'warning',
                },
              ].map((section) => (
                <div key={section.titleKey} className="bg-surface-container-low rounded-lg p-4">
                  <p className="flex items-center gap-2 font-bold text-on-surface mb-3">
                    <span className="material-symbols-outlined text-primary text-lg">{section.icon}</span>
                    {section.title}
                  </p>
                  {section.items.length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic">{section.emptyText}</p>
                  ) : (
                    <ul className="space-y-1 text-on-surface-variant">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
