'use client';

import { useState } from 'react';
import {
  Users, UserCheck, UserPlus, Shield, RefreshCw,
  Search, CheckCircle2, XCircle,
  Loader2, Phone, Mail, UserCog
} from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  AdminUserListItem,
  getAdminUsers,
  createAdminStaffUser,
  updateAdminUserRole,
  toggleAdminUserActive,
} from '@/actions/admin-users';
import {
  ErpAlert, ErpBadge, ErpEmptyState, ErpModal,
  ErpPageHeader, ErpSectionCard, ErpStatCard,
  erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls,
} from '@/components/admin/erp-ui';

type StaffRole = 'OPS' | 'FINANCE' | 'SUPER_ADMIN';
type UserRoleChoice = StaffRole | 'CUSTOMER';

export function UsersClientPage({
  locale,
  initialUsers,
  initialTotal,
}: {
  locale: string;
  initialUsers: AdminUserListItem[];
  initialTotal: number;
}) {
  const [users, setUsers] = useState<AdminUserListItem[]>(initialUsers);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STAFF' | 'SUPER_ADMIN' | 'FINANCE' | 'OPS' | 'CUSTOMER'>('ALL');

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'OPS' | 'FINANCE' | 'SUPER_ADMIN'>('OPS');
  const [staffPassword, setStaffPassword] = useState('');

  // Role Edit Modal
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'SUPER_ADMIN' | 'FINANCE' | 'OPS' | 'CUSTOMER'>('OPS');
  const [savingRole, setSavingRole] = useState(false);

  // Toggle active loading map
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadUsers(querySearch = search, queryRole = roleFilter) {
    setLoading(true);
    setFeedback(null);
    try {
      let roleParam: string | undefined = queryRole;
      if (queryRole === 'ALL') roleParam = undefined;
      else if (queryRole === 'STAFF') roleParam = undefined; // handled client-side or multi-filter

      const res = await getAdminUsers({
        search: querySearch,
        role: roleParam,
        limit: 50,
      });

      if (res.success) {
        let filtered = res.users || [];
        if (queryRole === 'STAFF') {
          filtered = filtered.filter((u) => u.roles.some((r) => ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(r)));
        }
        setUsers(filtered);
        setTotal(res.total || 0);
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در بارگذاری کاربران' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staffName.trim() || creating) return;
    setCreating(true);
    setFeedback(null);
    try {
      const res = await createAdminStaffUser({
        name: staffName,
        email: staffEmail || undefined,
        phone: staffPhone || undefined,
        role: staffRole,
        password: staffPassword || undefined,
      });

      if (res.success) {
        setFeedback({
          tone: 'success',
          msg: lt(locale, {
            fa: `همکار جدید «${staffName}» با نقش ${staffRole} با موفقیت ایجاد شد.`,
            en: `Staff member "${staffName}" created with role ${staffRole}.`,
          }),
        });
        setShowAddModal(false);
        setStaffName('');
        setStaffEmail('');
        setStaffPhone('');
        setStaffPassword('');
        await loadUsers();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در ثبت همکار جدید' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser || savingRole) return;
    setSavingRole(true);
    setFeedback(null);
    try {
      const res = await updateAdminUserRole({
        userId: editingUser.id,
        roleName: selectedNewRole,
      });

      if (res.success) {
        setFeedback({
          tone: 'success',
          msg: lt(locale, {
            fa: `نقش کاربر «${editingUser.name}» به ${selectedNewRole} تغییر یافت.`,
            en: `Role updated to ${selectedNewRole}.`,
          }),
        });
        setEditingUser(null);
        await loadUsers();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در ویرایش دسترسی' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setSavingRole(false);
    }
  }

  async function handleToggleActive(user: AdminUserListItem) {
    if (togglingId) return;
    setTogglingId(user.id);
    setFeedback(null);
    try {
      const nextActive = !user.isActive;
      const res = await toggleAdminUserActive(user.id, nextActive);
      if (res.success) {
        setFeedback({
          tone: 'success',
          msg: nextActive
            ? lt(locale, { fa: `حساب کاربری «${user.name}» فعال شد.`, en: 'User activated.' })
            : lt(locale, { fa: `حساب کاربری «${user.name}» غیرفعال گردید.`, en: 'User deactivated.' }),
        });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: nextActive } : u)));
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در تغییر وضعیت کاربر' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setTogglingId(null);
    }
  }

  const staffCount = users.filter((u) => u.roles.some((r) => ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(r))).length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'هویت · دسترسی‌ها', en: 'Identity & Access (IAM)', ar: 'الهوية والصلاحيات', zh: '身份与权限', ru: 'Идентификация и доступ' })}
        title={lt(locale, { fa: 'مدیریت کاربران و همکاران پلتفرم', en: 'User & Staff Management', ar: 'إدارة المستخدمين والموظفين', zh: '员工与用户管理', ru: 'Сотрудники и пользователи' })}
        description={lt(locale, {
          fa: 'تعریف همکاران عملیات، مالی و مدیران ارشد با نقش‌های رابطه‌ای RBAC، تعیین سطح دسترسی و نظارت بر کاربران',
          en: 'Define staff members, assign relational RBAC roles (Super Admin, Finance, Ops), and manage platform users',
        })}
        icon={<UserCheck size={20} aria-hidden="true" />}
        actions={
          <>
            <button type="button" onClick={() => loadUsers()} className={erpGhostBtnCls}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>{lt(locale, { fa: 'به‌روزرسانی', en: 'Refresh' })}</span>
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} className={erpPrimaryBtnCls}>
              <UserPlus size={15} aria-hidden="true" />
              <span>{lt(locale, { fa: 'افزودن همکار جدید', en: 'Add Staff User' })}</span>
            </button>
          </>
        }
      />

      {feedback && (
        <ErpAlert tone={feedback.tone} onDismiss={() => setFeedback(null)}>
          {feedback.msg}
        </ErpAlert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ErpStatCard
          icon={<Users size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'کل کاربران ثبت‌شده', en: 'Total Users' })}
          value={total.toLocaleString()}
          tone="brand"
        />
        <ErpStatCard
          icon={<Shield size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'تعداد همکاران و اپراتورها', en: 'Staff & Operators' })}
          value={staffCount}
          hint={lt(locale, { fa: 'نقش‌های ERP', en: 'ERP Roles' })}
          tone="gold"
        />
        <ErpStatCard
          icon={<CheckCircle2 size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'کاربران فعال', en: 'Active Accounts' })}
          value={activeCount}
          tone="green"
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'STAFF', 'SUPER_ADMIN', 'FINANCE', 'OPS', 'CUSTOMER'] as const).map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => {
                setRoleFilter(rf);
                loadUsers(search, rf);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                roleFilter === rf ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-ink hover:bg-mint/40'
              }`}
            >
              {rf === 'ALL'
                ? lt(locale, { fa: 'همه', en: 'All' })
                : rf === 'STAFF'
                  ? lt(locale, { fa: 'فقط همکاران ERP', en: 'Staff Only' })
                  : rf}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadUsers(search, roleFilter);
            }}
            placeholder={lt(locale, { fa: 'جستجو با نام، ایمیل، موبایل…', en: 'Search name, email, phone…' })}
            className={`${erpFieldCls} ps-9 text-xs`}
          />
        </div>
      </div>

      {/* Users Table */}
      <ErpSectionCard
        title={lt(locale, { fa: 'فهرست کاربران و همکاران', en: 'Users & Operators List' })}
        subtitle={lt(locale, { fa: 'سطح دسترسی بر اساس زنجیره رابطه کاربری به نقش (RBAC) تعیین می‌شود', en: 'Authority derived strictly from UserRole relational chain' })}
        icon={<Users size={16} aria-hidden="true" />}
      >
        {users.length === 0 ? (
          <ErpEmptyState
            icon={<Users size={32} className="text-line" aria-hidden="true" />}
            title={lt(locale, { fa: 'کاربری با این مشخصات یافت نشد', en: 'No users found' })}
            description={lt(locale, { fa: 'می‌توانید فیلتر جستجو را تغییر دهید یا با دکمه بالا همکار جدید اضافه کنید.', en: 'Try changing your search query or add a staff member.' })}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-line bg-soft/50 text-sub font-black text-[11px]">
                <tr>
                  <th className="p-3 text-start">{lt(locale, { fa: 'کاربر / همکار', en: 'Name' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'اطلاعات تماس', en: 'Contact' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'نقش‌های سازمانی (RBAC)', en: 'Role' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'وضعیت حساب', en: 'Status' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'تاریخ عضویت', en: 'Joined' })}</th>
                  <th className="p-3 text-end">{lt(locale, { fa: 'عملیات', en: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {users.map((u) => {
                  const isStaff = u.roles.some((r) => ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(r));

                  return (
                    <tr key={u.id} className="hover:bg-soft/30 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full grid place-items-center font-black text-xs ${isStaff ? 'bg-brand/15 text-brand-dark' : 'bg-soft text-sub'}`}>
                            {u.name?.slice(0, 1) || 'U'}
                          </div>
                          <div>
                            <span className="font-black text-ink block">{u.name}</span>
                            <span className="font-mono text-[10px] text-sub block">{u.id.slice(0, 12)}…</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          {u.email && (
                            <div className="flex items-center gap-1 text-ink" dir="ltr">
                              <Mail size={11} className="text-sub shrink-0" />
                              <span>{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1 text-sub" dir="ltr">
                              <Phone size={11} className="text-sub shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {!u.email && !u.phone && <span className="text-sub">—</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <ErpBadge
                              key={r}
                              tone={
                                r === 'SUPER_ADMIN'
                                  ? 'rose'
                                  : r === 'FINANCE'
                                    ? 'gold'
                                    : r === 'OPS'
                                      ? 'green'
                                      : 'neutral'
                              }
                            >
                              {r}
                            </ErpBadge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-black ${u.isActive ? 'text-success' : 'text-destructive'}`}>
                          {u.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{u.isActive ? lt(locale, { fa: 'فعال', en: 'Active' }) : lt(locale, { fa: 'غیرفعال', en: 'Inactive' })}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-sub text-[11px]">
                        {u.createdAt.slice(0, 10)}
                      </td>
                      <td className="p-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              const currentRole = u.roles[0];
                              setSelectedNewRole(
                                currentRole === 'SUPER_ADMIN' || currentRole === 'FINANCE' || currentRole === 'OPS' || currentRole === 'CUSTOMER'
                                  ? currentRole
                                  : 'OPS'
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark px-2.5 py-1 text-xs font-black transition cursor-pointer"
                            title={lt(locale, { fa: 'تغییر نقش سازمانی', en: 'Change Role' })}
                          >
                            <UserCog size={13} />
                            <span>{lt(locale, { fa: 'نقش', en: 'Role' })}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black transition cursor-pointer disabled:opacity-60 ${
                              u.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-mint text-brand-dark hover:bg-mint/80'
                            }`}
                          >
                            {togglingId === u.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : u.isActive ? (
                              <span>{lt(locale, { fa: 'غیرفعال‌سازی', en: 'Deactivate' })}</span>
                            ) : (
                              <span>{lt(locale, { fa: 'فعال‌سازی', en: 'Activate' })}</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ErpSectionCard>

      {/* Modal 1: Add Staff */}
      {showAddModal && (
        <ErpModal
          title={lt(locale, { fa: 'افزودن همکار جدید به پرتال ERP', en: 'Add New Staff Member' })}
          subtitle={lt(locale, { fa: 'برای همکار خود دسترسی متناسب (عملیات، مالی، مدیر ارشد) تعیین نمایید', en: 'Assign appropriate RBAC staff role and initial credentials' })}
          onClose={() => setShowAddModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowAddModal(false)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel' })}
              </button>
              <button type="submit" form="add-staff-form" disabled={creating} className={erpPrimaryBtnCls}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                <span>{lt(locale, { fa: 'ثبت همکار و صدور دسترسی', en: 'Create Staff Member' })}</span>
              </button>
            </>
          }
        >
          <form id="add-staff-form" onSubmit={handleCreateStaff} className="space-y-3.5">
            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'نام و نام خانوادگی:', en: 'Full Name:' })}</label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="مثال: سارا حسینی"
                className={erpFieldCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={erpLabelCls}>{lt(locale, { fa: 'ایمیل سازمانی:', en: 'Email:' })}</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="sara@firuzo.com"
                  className={erpFieldCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={erpLabelCls}>{lt(locale, { fa: 'شماره تماس:', en: 'Phone:' })}</label>
                <input
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="09123456789"
                  className={erpFieldCls}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'نقش و سطح دسترسی سازمانی (RBAC):', en: 'Assigned Role:' })}</label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                className={erpFieldCls}
              >
                <option value="OPS">عملیات و پشتیبانی (OPS) — مدیریت سفرها، رزروها، کنسلی و کاتالوگ</option>
                <option value="FINANCE">امور مالی (FINANCE) — بررسی فیش‌ها، تسویه‌حساب‌ها و تطبیق دفتر کل</option>
                <option value="SUPER_ADMIN">مدیر ارشد (SUPER_ADMIN) — دسترسی نامحدود به تمامی بخش‌های ERP</option>
              </select>
            </div>

            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'کلمه عبور اولیه (اختیاری — پیش‌فرض سیستم):', en: 'Initial Password (optional):' })}</label>
              <input
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="حداقل ۸ کاراکتر (خالی = پیش‌فرض Staff@Firuzo2026!)"
                className={erpFieldCls}
                dir="ltr"
              />
            </div>
          </form>
        </ErpModal>
      )}

      {/* Modal 2: Edit Role */}
      {editingUser && (
        <ErpModal
          title={lt(locale, { fa: 'تغییر نقش سازمانی کاربر', en: 'Change User Role' })}
          subtitle={lt(locale, { fa: `کاربر: ${editingUser.name}`, en: `User: ${editingUser.name}` })}
          onClose={() => setEditingUser(null)}
          footer={
            <>
              <button type="button" onClick={() => setEditingUser(null)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel' })}
              </button>
              <button type="submit" form="edit-role-form" disabled={savingRole} className={erpPrimaryBtnCls}>
                {savingRole ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
                <span>{lt(locale, { fa: 'ذخیره تغییرات دسترسی', en: 'Save Role' })}</span>
              </button>
            </>
          }
        >
          <form id="edit-role-form" onSubmit={handleSaveRole} className="space-y-3">
            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'انتخاب نقش جدید:', en: 'New Role:' })}</label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRoleChoice)}
                className={erpFieldCls}
              >
                <option value="OPS">عملیات و پشتیبانی (OPS)</option>
                <option value="FINANCE">امور مالی (FINANCE)</option>
                <option value="SUPER_ADMIN">مدیر ارشد (SUPER_ADMIN)</option>
                <option value="CUSTOMER">کاربر مسافر عادی (CUSTOMER — سلب دسترسی ERP)</option>
              </select>
            </div>
          </form>
        </ErpModal>
      )}
    </div>
  );
}
