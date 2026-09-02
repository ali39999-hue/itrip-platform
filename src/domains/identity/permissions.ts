export type ERPPermission =
  | 'booking:view:all'
  | 'booking:create'
  | 'booking:confirm:on-request'
  | 'booking:refund:approve'
  | 'finance:reports:view'
  | 'finance:settlement:match'
  | 'catalog:hotels:edit'
  | 'catalog:flights:edit'
  | 'inventory:manage'
  | 'ops:override:cancel';

export const ROLE_DEFAULT_PERMISSIONS: Record<string, ERPPermission[]> = {
  SUPER_ADMIN: [
    'booking:view:all',
    'booking:create',
    'booking:confirm:on-request',
    'booking:refund:approve',
    'finance:reports:view',
    'finance:settlement:match',
    'catalog:hotels:edit',
    'catalog:flights:edit',
    'inventory:manage',
    'ops:override:cancel',
  ],
  FINANCE: [
    'booking:view:all',
    'booking:refund:approve',
    'finance:reports:view',
    'finance:settlement:match',
  ],
  OPS: [
    'booking:view:all',
    'booking:confirm:on-request',
    'catalog:hotels:edit',
    'catalog:flights:edit',
    'inventory:manage',
    'ops:override:cancel',
  ],
  SUPPORT: [
    'booking:view:all',
  ],
  CUSTOMER: [
    'booking:create',
  ],
};
