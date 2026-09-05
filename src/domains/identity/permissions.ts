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
  | 'ops:override:cancel';

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
    'audit:view',
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
