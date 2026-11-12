/**
 * Role -> allowed modules, in one place.
 *
 * Kept in its own module (rather than inside AuthContext.jsx) because a file
 * exporting both components and plain values defeats Vite Fast Refresh. This
 * table is the single source of truth on the client and MUST stay in step with
 * the server's RBAC in server/src/middleware/rbac.js.
 *
 * Reports is a management module (report Section 1.11), so only Admin and
 * BillingClerk may open it.
 */
export const NAV_BY_ROLE = {
  Doctor: ['dashboard', 'patients', 'appointments', 'prescriptions', 'labs'],
  Nurse: ['dashboard', 'patients', 'appointments', 'labs', 'pharmacy'],
  Pharmacist: ['dashboard', 'pharmacy', 'prescriptions', 'patients'],
  Admin: [
    'dashboard', 'patients', 'appointments', 'prescriptions', 'labs',
    'pharmacy', 'billing', 'reports', 'staff',
  ],
  BillingClerk: ['dashboard', 'patients', 'appointments', 'billing', 'reports'],
  LabTech: ['dashboard', 'labs', 'patients'],
};

export default NAV_BY_ROLE;
