export type ERPPermission =
  // Booking Domain
  | 'booking:view'
  | 'booking:view:all'
  | 'booking:create'
  | 'booking:modify'
  | 'booking:cancel'
  | 'booking:confirm:on-request'
  | 'booking:refund:approve'
  // Payment & Refund Domain
  | 'payment:view'
  | 'payment:capture'
  | 'payment:refund'
  | 'refund:request'
  | 'refund:approve'
  // Finance & Accounting
  | 'finance:view'
  | 'finance:post'
  | 'finance:reconcile'
  | 'finance:reports:view'
  | 'finance:settlement:match'
  // Supplier & Inventory
  | 'supplier:view'
  | 'supplier:manage'
  | 'supplier:contract:manage'
  | 'inventory:view'
  | 'inventory:modify'
  | 'inventory:manage'
  | 'catalog:hotels:edit'
  | 'catalog:flights:edit'
  // Identity, Admin & Ops
  | 'user:manage'
  | 'role:manage'
  | 'audit:view'
  | 'ops:override:cancel'
  | 'ops:notify'
  | 'traveler:pii:view';

/** Role names that grant ERP back-office access (checked relationally via UserRole). */
export const ERP_STAFF_ROLES = ['SUPER_ADMIN', 'FINANCE', 'OPS', 'OPERATOR'] as const;

export const ROLE_DEFAULT_PERMISSIONS: Record<string, ERPPermission[]> = {
  SUPER_ADMIN: [
    'booking:view',
    'booking:view:all',
    'booking:create',
    'booking:modify',
    'booking:cancel',
    'booking:confirm:on-request',
    'booking:refund:approve',
    'payment:view',
    'payment:capture',
    'payment:refund',
    'refund:request',
    'refund:approve',
    'finance:view',
    'finance:post',
    'finance:reconcile',
    'finance:reports:view',
    'finance:settlement:match',
    'supplier:view',
    'supplier:manage',
    'supplier:contract:manage',
    'inventory:view',
    'inventory:modify',
    'inventory:manage',
    'catalog:hotels:edit',
    'catalog:flights:edit',
    'user:manage',
    'role:manage',
    'audit:view',
    'ops:override:cancel',
    'ops:notify',
    'traveler:pii:view',
  ],
  FINANCE: [
    'booking:view',
    'booking:view:all',
    'booking:refund:approve',
    'payment:view',
    'payment:refund',
    'refund:approve',
    'finance:view',
    'finance:post',
    'finance:reconcile',
    'finance:reports:view',
    'finance:settlement:match',
    'audit:view',
  ],
  OPS: [
    'booking:view',
    'booking:view:all',
    'booking:modify',
    'booking:cancel',
    'booking:confirm:on-request',
    'supplier:view',
    'supplier:manage',
    'inventory:view',
    'inventory:modify',
    'inventory:manage',
    'catalog:hotels:edit',
    'catalog:flights:edit',
    'ops:override:cancel',
    'ops:notify',
    'audit:view',
  ],
  /**
   * OPERATOR — front-line booking-processing staff (اپراتور رزرو). Works the
   * daily queue: confirm on-request bookings, issue tickets, clear exceptions.
   * Deliberately NO finance settlement, NO user/role management, NO catalog
   * writes and NO supplier contract management.
   */
  OPERATOR: [
    'booking:view',
    'booking:view:all',
    'booking:modify',
    'booking:cancel',
    'booking:confirm:on-request',
    'payment:view',
    'refund:request',
    'supplier:view',
    'inventory:view',
    'ops:override:cancel',
    'ops:notify',
    'audit:view',
    'traveler:pii:view',
  ],
  SUPPORT: [
    'booking:view',
    'booking:view:all',
    'payment:view',
    'refund:request',
  ],
  AGENT: [
    'booking:view',
    'booking:create',
    'booking:modify',
    'booking:cancel',
    'payment:view',
  ],
  CUSTOMER: [
    'booking:view',
    'booking:create',
  ],
};
