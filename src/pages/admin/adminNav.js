/**
 * Shared navigation for the JeevanDoot Admin Portal.
 * Keeps Information Architecture in one place so every admin page
 * (which renders its own Sidebar) stays consistent.
 */
export const ADMIN_NAV = [
  { labelKey: 'dashboard', defaultLabel: 'Admin Dashboard', to: '/admin/dashboard', icon: 'dashboard', end: true },
  { labelKey: 'doctorManagement', defaultLabel: 'Doctor Management', to: '/admin/doctors', icon: 'medical_services' },
  { labelKey: 'alertsEscalations', defaultLabel: 'Alerts & Escalations', to: '/admin/alerts', icon: 'notifications_active' },
  { labelKey: 'auditLog', defaultLabel: 'Audit Trail & Case Handling', to: '/admin/audit-log', icon: 'verified_user' },
];

export const adminSidebarItems = (t) =>
  ADMIN_NAV.map((item) => {
    const keyStr = `nav.${item.labelKey}`;
    const translated = t ? t(keyStr) : null;
    const isMissing = !translated || translated === keyStr;
    return {
      ...item,
      label: isMissing ? item.defaultLabel : translated,
    };
  });
