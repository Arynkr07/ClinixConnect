/**
 * Shared navigation for the JeevanDoot Patient Portal.
 */
export const PATIENT_NAV = [
  { labelKey: 'dashboard', defaultLabel: 'Dashboard', to: '/patient/dashboard', icon: 'dashboard', end: true },
  { labelKey: 'findDoctors', defaultLabel: 'Find Doctors & Book', to: '/patient/doctors', icon: 'person_search' },
  { labelKey: 'myAppointments', defaultLabel: 'My Appointments', to: '/patient/appointments', icon: 'calendar_month' },
  { labelKey: 'prescriptions', defaultLabel: 'My Prescriptions', to: '/patient/prescriptions', icon: 'prescriptions' },
  { labelKey: 'medicationReminders', defaultLabel: 'Medication Reminders', to: '/patient/medications', icon: 'alarm_on' },
];

export const patientSidebarItems = (t) =>
  PATIENT_NAV.map((item) => {
    const keyStr = `nav.${item.labelKey}`;
    const translated = t ? t(keyStr) : null;
    const isMissing = !translated || translated === keyStr;
    return {
      ...item,
      label: isMissing ? item.defaultLabel : translated,
    };
  });
