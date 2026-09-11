'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import {
  getMyTravelerProfilesAction,
  saveTravelerProfileAction,
  deleteTravelerProfileAction,
  saveTravelDocumentAction,
  deleteTravelDocumentAction,
} from '@/actions/travelers';
import { EnrichedTravelerProfile } from '@/domains/identity/TravelerProfileService';
import { lt } from '@/lib/lt';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  CreditCard,
  Loader2,
  X,
} from 'lucide-react';

export function TravelersClientPage() {
  const locale = useLocale();
  const [profiles, setProfiles] = useState<EnrichedTravelerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EnrichedTravelerProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    nationality: 'IR',
    passportNumber: '',
    passportExpiry: '',
  });

  // Doc Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [docFormData, setDocFormData] = useState({
    type: 'PASSPORT' as 'PASSPORT' | 'VISA' | 'NATIONAL_ID',
    documentNumber: '',
    issuingCountry: 'IR',
    expiresAt: '',
    holderName: '',
  });

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    const res = await getMyTravelerProfilesAction();
    if (res.success && res.data) {
      setProfiles(res.data);
    } else {
      setError(res.error || 'خطا در دریافت لیست مسافران');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const openAddModal = () => {
    setEditingProfile(null);
    setFormData({
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'MALE',
      nationality: 'IR',
      passportNumber: '',
      passportExpiry: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (profile: EnrichedTravelerProfile) => {
    setEditingProfile(profile);
    const pass = profile.primaryPassport;
    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      nationalId: profile.nationalId || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: (profile.gender as 'MALE' | 'FEMALE') || 'MALE',
      nationality: profile.nationality || 'IR',
      passportNumber: pass?.documentNumber || '',
      passportExpiry: pass?.expiresAt || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert(lt(locale, { fa: 'نام و نام خانوادگی الزامی است.', en: 'First and last name are required.' }));
      return;
    }

    setActionLoading(true);
    try {
      const res = await saveTravelerProfileAction({
        id: editingProfile?.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationalId: formData.nationalId || null,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        nationality: formData.nationality,
      });

      if (!res.success || !res.profile) {
        throw new Error(res.error || 'خطا در ذخیره مسافر');
      }

      // If passport is provided, save or update it
      if (formData.passportNumber.trim()) {
        await saveTravelDocumentAction(res.profile.id, {
          type: 'PASSPORT',
          documentNumber: formData.passportNumber.trim(),
          issuingCountry: formData.nationality || 'IR',
          expiresAt: formData.passportExpiry || null,
          holderName: `${formData.firstName} ${formData.lastName}`,
        });
      }

      setIsModalOpen(false);
      await loadProfiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'خطایی رخ داد.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    const confirmMsg = lt(locale, {
      fa: 'آیا از حذف این مسافر اطمینان دارید؟',
      en: 'Are you sure you want to delete this traveler profile?',
    });
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    const res = await deleteTravelerProfileAction(id);
    if (res.success) {
      await loadProfiles();
    } else {
      alert(res.error || 'خطا در حذف مسافر');
    }
    setActionLoading(false);
  };

  const handleOpenDocModal = (profileId: string) => {
    setTargetProfileId(profileId);
    setDocFormData({
      type: 'PASSPORT',
      documentNumber: '',
      issuingCountry: 'IR',
      expiresAt: '',
      holderName: '',
    });
    setIsDocModalOpen(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfileId || !docFormData.documentNumber.trim()) return;

    setActionLoading(true);
    try {
      const res = await saveTravelDocumentAction(targetProfileId, {
        type: docFormData.type,
        documentNumber: docFormData.documentNumber.trim(),
        issuingCountry: docFormData.issuingCountry,
        expiresAt: docFormData.expiresAt || null,
        holderName: docFormData.holderName || null,
      });
      if (res.success) {
        setIsDocModalOpen(false);
        await loadProfiles();
      } else {
        alert(res.error || 'خطا در ثبت مدرک');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDoc = async (profileId: string, docId: string) => {
    const confirmMsg = lt(locale, {
      fa: 'آیا از حذف این مدرک اطمینان دارید؟',
      en: 'Are you sure you want to delete this document?',
    });
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    const res = await deleteTravelDocumentAction(profileId, docId);
    if (res.success) {
      await loadProfiles();
    } else {
      alert(res.error || 'خطا در حذف مدرک');
    }
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-soft pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar */}
          <AccountSidebar activeSection="travelers" />

          {/* Main Content Area */}
          <main className="flex-1 w-full space-y-6">
            {/* Header Card */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-brand mb-1">
                  <Users size={22} className="shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider">Traveler Management</span>
                </div>
                <h1 className="text-2xl font-black text-ink">
                  {lt(locale, {
                    fa: 'مسافران و همراهان من',
                    en: 'My Travelers & Companions',
                  })}
                </h1>
                <p className="text-xs sm:text-sm text-sub mt-1">
                  {lt(locale, {
                    fa: 'ثبت و مدیریت مشخصات هویتی و گذرنامه‌های اعضای خانواده و همسفران جهت رزرو سریع و بدون خطا.',
                    en: 'Manage companion profiles and passports for quick and accurate flight/hotel checkout.',
                  })}
                </p>
              </div>

              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-sm shadow-brand active:scale-[0.98] transition-all shrink-0 min-h-[44px]"
              >
                <UserPlus size={18} />
                <span>{lt(locale, { fa: 'افزودن مسافر جدید', en: 'Add New Traveler' })}</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-sub">
                <Loader2 size={32} className="animate-spin text-brand" />
                <p className="text-sm font-bold">
                  {lt(locale, { fa: 'در حال بارگذاری مسافران...', en: 'Loading travelers...' })}
                </p>
              </div>
            ) : profiles.length === 0 ? (
              /* Empty State */
              <div className="bg-surface rounded-3xl p-12 border border-line text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-mint flex items-center justify-center text-brand mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-lg font-black text-ink mb-2">
                  {lt(locale, { fa: 'هنوز مسافری ثبت نشده است', en: 'No Travelers Saved Yet' })}
                </h3>
                <p className="text-sm text-sub max-w-md mb-6 leading-relaxed">
                  {lt(locale, {
                    fa: 'با ذخیره مشخصات همراهان، در هنگام خرید بلیت هواپیما و رزرو هتل نیازی به ورود مجدد کد ملی و شماره گذرنامه نخواهید داشت.',
                    en: 'Save your companion traveler profiles to auto-fill passport and ID details during flight and hotel bookings.',
                  })}
                </p>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-sm transition-all min-h-[44px]"
                >
                  <UserPlus size={18} />
                  <span>{lt(locale, { fa: 'ثبت اولین مسافر', en: 'Save First Traveler' })}</span>
                </button>
              </div>
            ) : (
              /* Traveler Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-xs flex flex-col justify-between hover:border-brand/40 transition-all group"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/15 to-mint text-brand-dark flex items-center justify-center font-black text-lg border border-brand/20">
                            {profile.firstName?.[0] || 'م'}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-ink">
                              {profile.firstName} {profile.lastName}
                            </h3>
                            <p className="text-xs text-sub font-mono">
                              {profile.nationality === 'IR' ? '🇮🇷 ایران' : `🌐 ${profile.nationality}`}
                              {profile.gender && (
                                <span className="ms-2 text-ink/70">
                                  ({profile.gender === 'MALE' ? 'مرد' : profile.gender === 'FEMALE' ? 'زن' : 'سایر'})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(profile)}
                            title={lt(locale, { fa: 'ویرایش', en: 'Edit' })}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sub hover:text-brand hover:bg-soft transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            title={lt(locale, { fa: 'حذف', en: 'Delete' })}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sub hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Identity Details */}
                      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-soft/70 text-xs mb-4">
                        <div className="flex items-center gap-2 text-sub">
                          <CreditCard size={14} className="text-brand shrink-0" />
                          <span>کد ملی:</span>
                          <span className="font-mono font-bold text-ink">
                            {profile.nationalId || 'ثبت نشده'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sub">
                          <Calendar size={14} className="text-brand shrink-0" />
                          <span>تاریخ تولد:</span>
                          <span className="font-mono font-bold text-ink">
                            {profile.dateOfBirth || 'ثبت نشده'}
                          </span>
                        </div>
                      </div>

                      {/* Travel Documents / Passports */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs font-black text-sub">
                          <span className="flex items-center gap-1.5">
                            <FileText size={13} className="text-brand" />
                            اسناد و گذرنامه‌ها ({profile.documents.length})
                          </span>
                          <button
                            onClick={() => handleOpenDocModal(profile.id)}
                            className="text-[11px] text-brand hover:underline font-bold flex items-center gap-0.5"
                          >
                            <Plus size={12} />
                            افزودن مدرک
                          </button>
                        </div>

                        {profile.documents.length === 0 ? (
                          <div className="p-3 rounded-xl border border-dashed border-line text-center text-xs text-sub">
                            گذرنامه یا ویزا ثبت نشده است
                          </div>
                        ) : (
                          profile.documents.map((doc) => {
                            const val = doc.validity;
                            const isExpired = val?.status === 'EXPIRED';
                            const isWarning = val?.status === 'INSUFFICIENT_SIX_MONTHS';
                            const isValid = val?.status === 'VALID';

                            return (
                              <div
                                key={doc.id}
                                className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                                  isExpired
                                    ? 'bg-rose-50/70 border-rose-200'
                                    : isWarning
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-surface border-line'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-ink text-sm">
                                      {doc.documentNumber}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-soft text-[10px] font-bold text-sub">
                                      {doc.type}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteDoc(profile.id, doc.id)}
                                    className="text-sub hover:text-rose-600 p-1"
                                    title="حذف مدرک"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                {doc.expiresAt && (
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-sub">
                                      انقضا: <strong className="font-mono text-ink">{doc.expiresAt}</strong>
                                    </span>

                                    {isValid && (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                        <CheckCircle2 size={12} />
                                        اعتبار مجاز ({val?.remainingDays} روز)
                                      </span>
                                    )}
                                    {isWarning && (
                                      <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                                        <AlertTriangle size={12} />
                                        هشدار: کمتر از ۶ ماه ({val?.remainingDays} روز)
                                      </span>
                                    )}
                                    {isExpired && (
                                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                        <XCircle size={12} />
                                        منقضی شده
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Bottom Status / Tag */}
                    <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[11.5px] text-sub">
                      <span>شناسه: {profile.id.slice(-6)}</span>
                      <span className="text-emerald-700 font-bold">آماده برای صدور بلیت</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Traveler Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-line shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 end-5 text-sub hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-soft"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-ink mb-1">
              {editingProfile
                ? lt(locale, { fa: 'ویرایش مشخصات مسافر', en: 'Edit Traveler Profile' })
                : lt(locale, { fa: 'افزودن مسافر جدید', en: 'Add New Traveler' })}
            </h2>
            <p className="text-xs text-sub mb-6">
              اطلاعات را دقیقاً مطابق با کارت ملی یا گذرنامه وارد نمایید.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">نام *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="مثال: سارا"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm text-ink focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="مثال: احمدی"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm text-ink focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">کد ملی (۱۰ رقم)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="0012345678"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm font-mono text-ink focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">جنسیت</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'MALE' | 'FEMALE' })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm text-ink focus:outline-none focus:border-brand"
                  >
                    <option value="MALE">مرد (Male)</option>
                    <option value="FEMALE">زن (Female)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">تاریخ تولد (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    placeholder="1995-05-12"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm font-mono text-ink focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">تابعیت</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm text-ink focus:outline-none focus:border-brand"
                  >
                    <option value="IR">ایران (IR)</option>
                    <option value="AE">امارات (AE)</option>
                    <option value="TR">ترکیه (TR)</option>
                    <option value="OTHER">سایر کشورها</option>
                  </select>
                </div>
              </div>

              {/* Passport Section */}
              <div className="p-4 rounded-2xl bg-soft/80 border border-line space-y-3">
                <span className="block text-xs font-black text-brand">اطلاعات گذرنامه (اختیاری برای سفرهای خارجی)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-sub mb-1">شماره گذرنامه</label>
                    <input
                      type="text"
                      placeholder="A12345678"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-mono text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-sub mb-1">تاریخ انقضای گذرنامه</label>
                    <input
                      type="text"
                      placeholder="2028-10-25"
                      value={formData.passportExpiry}
                      onChange={(e) => setFormData({ ...formData, passportExpiry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-mono text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
                <p className="text-[10.5px] text-sub">
                  توجه: حداقل ۶ ماه اعتبار از تاریخ سفر برای پروازهای بین‌المللی الزامی است.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-line text-sub font-bold text-sm hover:bg-soft"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-sm flex items-center gap-2 shadow-brand"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  <span>ذخیره مشخصات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 sm:p-8 border border-line shadow-2xl relative">
            <button
              onClick={() => setIsDocModalOpen(false)}
              className="absolute top-5 end-5 text-sub hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-soft"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-ink mb-1">ثبت مدرک مسافرتی</h2>
            <p className="text-xs text-sub mb-5">گذرنامه، ویزا یا کارت ملی جدید اضافه کنید.</p>

            <form onSubmit={handleSaveDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-ink mb-1">نوع مدرک</label>
                <select
                  value={docFormData.type}
                  onChange={(e) =>
                    setDocFormData({
                      ...docFormData,
                      type: e.target.value as 'PASSPORT' | 'VISA' | 'NATIONAL_ID',
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm text-ink"
                >
                  <option value="PASSPORT">گذرنامه (Passport)</option>
                  <option value="VISA">ویزا (Visa)</option>
                  <option value="NATIONAL_ID">کارت ملی (National ID)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1">شماره مدرک *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: N12345678"
                  value={docFormData.documentNumber}
                  onChange={(e) => setDocFormData({ ...docFormData, documentNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm font-mono text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1">تاریخ انقضا (YYYY-MM-DD)</label>
                <input
                  type="text"
                  placeholder="2027-12-30"
                  value={docFormData.expiresAt}
                  onChange={(e) => setDocFormData({ ...docFormData, expiresAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-sm font-mono text-ink"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-line text-sub font-bold text-sm hover:bg-soft"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-sm flex items-center gap-2 shadow-brand"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  <span>ثبت مدرک</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
