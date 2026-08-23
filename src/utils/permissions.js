import { ROLES } from './constants';

/**
 * Permission matrix for the JeevanDoot platform.
 * Role hierarchy: admin > doctor
 */
const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'view:dashboard',
    'view:analytics',
    'view:audit',
    'view:reports',
    'view:surveillance',
    'view:map',
    'view:workers',
    'view:doctors',
    'view:patients',
    'manage:users',
    'manage:doctors',
    'manage:workers',
    'manage:config',
    'refer:patients',
    'consult:patients',
    'prescribe:medication',
    'schedule:followup',
    'export:data',
  ],
  [ROLES.DOCTOR]: [
    'view:dashboard',
    'view:queue',
    'view:analytics',
    'view:case-summary',
    'view:patients',
    'view:consultation',
    'consult:patients',
    'prescribe:medication',
    'refer:patients',
    'schedule:followup',
    'export:data',
  ],
};

export const can = (role, permission) =>
  Boolean(PERMISSIONS[role]?.includes(permission));

export const hasAny = (role, permissions) =>
  permissions.some((permission) => can(role, permission));

/**
 * Portal scoping for the Admin surface.
 * Only the Admin portal is active today; NGO & Government scopes are reserved
 * so region/block-scoped views can be switched on without reworking the layer.
 */
export const PORTAL_SCOPES = {
  admin: { label: 'Full Platform', scope: 'all' },
  ngo: { label: 'Regional (NGO)', scope: 'region' },
  government: { label: 'District (Government)', scope: 'district' },
};

export const PORTAL_ROLES = Object.keys(PORTAL_SCOPES);

export const canAccessPortal = (role) => role === ROLES.ADMIN;

export const adminScopeFor = (role) =>
  PORTAL_SCOPES[role] ?? { label: 'Restricted', scope: 'none' };

export const canManageUsers = (role) => can(role, 'manage:users');

export const canConsult = (role) => can(role, 'consult:patients');

export const canPrescribe = (role) => can(role, 'prescribe:medication');

export const canRefer = (role) => can(role, 'refer:patients');
