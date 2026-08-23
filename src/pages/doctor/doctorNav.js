/**
 * Shared navigation for the Doctor Portal.
 * Aligned strictly with Healthcare Appointment & Follow-up Manager specification.
 */
export const DOCTOR_NAV = [
  { labelKey: 'dashboard', defaultLabel: 'Dashboard', to: '/doctor/dashboard', icon: 'dashboard', end: true },
  { labelKey: 'patientQueue', defaultLabel: 'Patient Queue & Pre-Visit AI', to: '/doctor/queue', icon: 'groups' },
  { labelKey: 'prescription', defaultLabel: 'Prescriptions & Notes', to: '/doctor/prescription', icon: 'prescriptions' },
  { labelKey: 'applyLeave', defaultLabel: 'Apply for Leave', to: '/doctor/apply-leave', icon: 'event_busy' },
];

export const doctorSidebarItems = (t) =>
  DOCTOR_NAV.map((item) => {
    const keyStr = `nav.${item.labelKey}`;
    const translated = t ? t(keyStr) : null;
    const isMissing = !translated || translated === keyStr;
    return {
      ...item,
      label: isMissing ? item.defaultLabel : translated,
    };
  });
