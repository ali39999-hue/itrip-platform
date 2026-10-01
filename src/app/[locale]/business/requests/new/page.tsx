'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { UploadBox, type UploadState } from '@/components/business/UploadBox';
import { BizPrice, BizFieldError } from '@/components/business/BizText';
import { businessApi } from '@/services/business-client';
import { num } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';

/* قواعد اعتبارسنجی سند تحویل — پیام‌ها از messages (نه هاردکد) */
const RULES = {
  nationalId: /^\d{11}$/,
  mobile: /^09\d{9}$/,
  latinName: /^[A-Za-z\s'-]{3,}$/,
  passport: /^[A-Za-z0-9]{6,9}$/,
} as const;

interface TravelerRow {
  fullNameLatin: string;
  passportNo: string;
  passportExpiry: string;
}

interface CompanyForm {
  name: string;
  nationalId: string;
  field: string;
  economicCode: string;
  repName: string;
  repPhone: string;
}

const DRAFT_KEY = 'fzb-draft';
const AUTOSAVE_MS = 30_000; // سند: هر ۳۰ ثانیه

const EMPTY_COMPANY: CompanyForm = {
  name: '',
  nationalId: '',
  field: '',
  economicCode: '',
  repName: '',
  repPhone: '',
};

export default function NewRequestPage() {
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [travelers, setTravelers] = useState<TravelerRow[]>([
    { fullNameLatin: '', passportNo: '', passportExpiry: '' },
  ]);
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(false);

  const [docStates, setDocStates] = useState<Record<string, { state: UploadState; file?: string | null; reason?: string | null }>>({
    passport: { state: 'empty', file: null, reason: null },
    registration: { state: 'empty', file: null, reason: null },
    intro_letter: { state: 'empty', file: null, reason: null },
    photo: { state: 'empty', file: null, reason: null },
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ---------- ذخیره خودکار draft هر ۳۰ ثانیه — بستن صفحه داده را از بین نمی‌برد ---------- */
  useEffect(() => {
    const restore = window.localStorage.getItem(DRAFT_KEY);
    if (restore) {
      try {
        const d = JSON.parse(restore) as {
          company?: CompanyForm;
          travelers?: TravelerRow[];
          note?: string;
        };
        if (d.company) setCompany(d.company);
        if (d.travelers?.length) setTravelers(d.travelers);
        if (d.note) setNote(d.note);
      } catch {
        // draft خراب — نادیده
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ company, travelers, note, savedAt: new Date().toISOString() })
      );
      setSavedAt(new Date().toLocaleTimeString(locale));
    }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [company, travelers, note, locale]);

  const saveDraftNow = useCallback(() => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ company, travelers, note, savedAt: new Date().toISOString() })
    );
    setSavedAt(new Date().toLocaleTimeString(locale));
  }, [company, travelers, note, locale]);

  /* ---------- اعتبارسنجی سند تحویل ---------- */
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!company.name.trim()) errs['company.name'] = t('form.errors.required');
    if (!company.nationalId.trim()) errs['company.nationalId'] = t('form.errors.required');
    else if (!RULES.nationalId.test(company.nationalId.trim()))
      errs['company.nationalId'] = t('form.errors.nationalId');
    if (!company.repName.trim()) errs['company.repName'] = t('form.errors.required');
    if (!company.repPhone.trim()) errs['company.repPhone'] = t('form.errors.required');
    else if (!RULES.mobile.test(company.repPhone.trim())) errs['company.repPhone'] = t('form.errors.mobile');

    travelers.forEach((tr, i) => {
      if (!tr.fullNameLatin.trim()) errs[`travelers.${i}.fullNameLatin`] = t('form.errors.required');
      else if (!RULES.latinName.test(tr.fullNameLatin.trim()))
        errs[`travelers.${i}.fullNameLatin`] = t('form.errors.latinName');
      if (!tr.passportNo.trim()) errs[`travelers.${i}.passportNo`] = t('form.errors.required');
      else if (!RULES.passport.test(tr.passportNo.trim()))
        errs[`travelers.${i}.passportNo`] = t('form.errors.passport');
      if (!tr.passportExpiry.trim()) errs[`travelers.${i}.passportExpiry`] = t('form.errors.required');
      // «انقضای پاسپورت حداقل ۶ ماه بعد از تاریخ برگشت» — سمت سرور هم کنترل می‌شود
    });

    if (!terms) errs.terms = t('form.errors.terms');
    return errs;
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async () => {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      return;
    }

    setSubmitting(true);
    setNetworkError(false);
    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      let targetId = searchParams?.get('id') || searchParams?.get('requestId');

      if (!targetId) {
        const pkgs = await businessApi.listPackages();
        const firstSlug = pkgs[0]?.slug || 'canton-fair';
        const pkgDetail = await businessApi.getPackage(firstSlug);
        const departureId = pkgDetail.departures[0]?.id;

        if (!departureId) {
          throw new Error('No departure available');
        }

        const draft = await businessApi.createRequest({
          packageId: pkgDetail.id,
          departureId,
          paxCount: travelers.length,
          companyName: company.name,
          nationalId: company.nationalId,
          repName: company.repName,
          repPhone: company.repPhone,
          field: company.field || 'Technology',
        });
        targetId = draft.id;
      }

      await businessApi.updateRequest(targetId, {
        company: {
          name: company.name,
          nationalId: company.nationalId,
          economicCode: company.economicCode,
          field: company.field,
          repName: company.repName,
          repPhone: company.repPhone,
        },
        travelers: travelers.map((t) => ({
          fullNameLatin: t.fullNameLatin,
          passportNo: t.passportNo,
          passportExpiry: t.passportExpiry,
        })),
        note,
      });

      await businessApi.submitRequest(targetId, true);
      saveDraftNow();
      router.push(`/business/requests/${targetId}/deposit`);
    } catch (err) {
      console.error('Submit failed in requests/new:', err);
      setNetworkError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const setTraveler = (i: number, patch: Partial<TravelerRow>) => {
    setTravelers((prev) => prev.map((tr, idx) => (idx === i ? { ...tr, ...patch } : tr)));
  };

  const removeTraveler = (i: number) => {
    setTravelers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const handleFile = async (docType: string, file: File) => {
    // JPG/PNG/PDF تا ۵ مگابایت (سند)
    const ok = /\.(jpe?g|png|pdf)$/i.test(file.name) && file.size <= 5 * 1024 * 1024;
    if (!ok) {
      setDocStates((prev) => ({
        ...prev,
        [docType]: { state: 'rejected', file: file.name, reason: t('form.errors.fileFormat') },
      }));
      return;
    }
    setDocStates((prev) => ({ ...prev, [docType]: { state: 'uploading', file: file.name, reason: null } }));
    try {
      const fd = new FormData();
      fd.set('type', docType);
      fd.set('fileName', file.name);
      fd.set('file', file);
      await businessApi.uploadDocument('draft', fd);
      setDocStates((prev) => ({ ...prev, [docType]: { state: 'done', file: file.name, reason: null } }));
    } catch {
      setDocStates((prev) => ({
        ...prev,
        [docType]: { state: 'rejected', file: file.name, reason: t('common.networkErrorBody') },
      }));
    }
  };

  const fieldErr = (key: string) => fieldErrors[key];

  const inputCls = (key: string) =>
    `fz-input${fieldErrors[key] ? '' : ''}`;

  const companyField = (
    key: keyof CompanyForm,
    label: string,
    opts: {
      rule?: keyof typeof RULES;
      inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
      placeholder?: string;
      required?: boolean;
    }
  ) => {
    const fullKey = `company.${key}`;
    return (
      <div className="fz-field" data-field={fullKey}>
        <label className="fz-label" htmlFor={`company-${key}`}>{label}</label>
        <input
          id={`company-${key}`}
          className={inputCls(fullKey)}
          value={company[key]}
          inputMode={opts.inputmode}
          placeholder={opts.placeholder}
          aria-invalid={fieldErr(fullKey) ? true : undefined}
          onChange={(e) => setCompany((c) => ({ ...c, [key]: e.target.value }))}
        />
        <BizFieldError>{fieldErr(fullKey)}</BizFieldError>
      </div>
    );
  };

  return (
    <>
      <BizHeader requestCode="FZB-1405-0001" />
      <RequestStepper activeStep={1} />

      <main className="fz-container fz-main">
        <div ref={formRef} className="fz-split" style={{ display: 'block' }}>
          <div className="fz-split">
            <div className="fz-split__main">
              <h1>{t('form.title')}</h1>

              {networkError && (
                <div className="fz-card fz-card--warn" role="alert">
                  <span className="fz-strong">{t('common.networkErrorTitle')}</span>
                  <span style={{ fontSize: 14 }}>{t('form.dataPreserved')}</span>
                  <button type="button" className="fz-btn fz-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={handleSubmit}>
                    {t('common.retry')}
                  </button>
                </div>
              )}

              {/* ۱) شرکت */}
              <section className="fz-card">
                <h2>۱. {t('form.companySection')}</h2>
                <div className="fz-grid fz-grid--2">
                  {companyField('name', t('form.companyName'), { required: true, placeholder: t('form.companyNamePh') })}
                  {companyField('nationalId', t('form.nationalId'), { rule: 'nationalId', inputmode: 'numeric', placeholder: t('form.nationalIdPh') })}
                  {companyField('field', t('form.field'), { placeholder: t('form.fieldPh') })}
                  {companyField('economicCode', t('form.economicCode'), { inputmode: 'numeric', placeholder: t('form.optional') })}
                  {companyField('repName', t('form.repName'), { required: true, placeholder: t('form.repNamePh') })}
                  {companyField('repPhone', t('form.repPhone'), { rule: 'mobile', inputmode: 'tel', placeholder: t('form.repPhonePh') })}
                </div>
                <p
                  className="fz-card--tint"
                  style={{ padding: '16px 18px', borderRadius: 'var(--fz-r-card-sm)', fontSize: 13, margin: 0, color: 'var(--fz-brand-deep)' }}
                >
                  {t('form.grantNote')}
                </p>
              </section>

              {/* ۲) مسافران */}
              <section className="fz-card">
                <div className="fz-row">
                  <h2>۲. {t('form.travelersSection')}</h2>
                  <button type="button" className="fz-btn" onClick={() => setTravelers((p) => [...p, { fullNameLatin: '', passportNo: '', passportExpiry: '' }])}>
                    <Plus size={16} aria-hidden="true" /> {t('form.addTraveler')}
                  </button>
                </div>

                <div className="fz-stack">
                  {travelers.map((tr, i) => (
                    <div key={i} className="fz-card fz-card--sub">
                      <div className="fz-row">
                        <span className="fz-strong" style={{ color: 'var(--fz-brand-deep)' }}>
                          {t('form.travelerN', { n: num(i + 1, locale) })}
                        </span>
                        {travelers.length > 1 && (
                          <button
                            type="button"
                            className="fz-btn fz-btn--ghost fz-btn--sm"
                            style={{ color: 'var(--fz-danger)' }}
                            aria-label={t('form.removeTraveler')}
                            onClick={() => removeTraveler(i)}
                          >
                            <Trash2 size={16} aria-hidden="true" /> {t('form.removeTraveler')}
                          </button>
                        )}
                      </div>
                      <div className="fz-grid fz-grid--3">
                        <div className="fz-field" data-field={`travelers.${i}.fullNameLatin`}>
                          <label className="fz-label" htmlFor={`tr-${i}-name`}>{t('form.latinName')}</label>
                          <input
                            id={`tr-${i}-name`}
                            className="fz-input"
                            dir="ltr"
                            value={tr.fullNameLatin}
                            placeholder={t('form.latinNamePh')}
                            aria-invalid={fieldErr(`travelers.${i}.fullNameLatin`) ? true : undefined}
                            onChange={(e) => setTraveler(i, { fullNameLatin: e.target.value })}
                          />
                          <BizFieldError>{fieldErr(`travelers.${i}.fullNameLatin`)}</BizFieldError>
                        </div>
                        <div className="fz-field" data-field={`travelers.${i}.passportNo`}>
                          <label className="fz-label" htmlFor={`tr-${i}-passport`}>{t('form.passportNo')}</label>
                          <input
                            id={`tr-${i}-passport`}
                            className="fz-input"
                            dir="ltr"
                            value={tr.passportNo}
                            placeholder={t('form.passportNoPh')}
                            aria-invalid={fieldErr(`travelers.${i}.passportNo`) ? true : undefined}
                            onChange={(e) => setTraveler(i, { passportNo: e.target.value })}
                          />
                          <BizFieldError>{fieldErr(`travelers.${i}.passportNo`)}</BizFieldError>
                        </div>
                        <div className="fz-field" data-field={`travelers.${i}.passportExpiry`}>
                          <label className="fz-label" htmlFor={`tr-${i}-expiry`}>{t('form.passportExpiry')}</label>
                          <input
                            id={`tr-${i}-expiry`}
                            className="fz-input"
                            value={tr.passportExpiry}
                            placeholder={t('form.passportExpiryPh')}
                            aria-invalid={fieldErr(`travelers.${i}.passportExpiry`) ? true : undefined}
                            onChange={(e) => setTraveler(i, { passportExpiry: e.target.value })}
                          />
                          <BizFieldError>{fieldErr(`travelers.${i}.passportExpiry`)}</BizFieldError>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ۳) مدارک */}
              <section className="fz-card">
                <h2>۳. {t('form.docsSection')}</h2>
                <div className="fz-grid fz-grid--4">
                  {(['passport', 'registration', 'intro_letter', 'photo'] as const).map((doc) => (
                    <div key={doc}>
                      <UploadBox
                        docType={doc}
                        state={docStates[doc].state}
                        file={docStates[doc].file}
                        rejectReason={docStates[doc].reason}
                        accept={doc === 'photo' ? '.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.pdf'}
                        onFileSelected={(f) => handleFile(doc, f)}
                        onRetry={() => setDocStates((prev) => ({ ...prev, [doc]: { state: 'empty', file: null, reason: null } }))}
                      />
                      <span className="fz-strong" style={{ display: 'block', marginTop: 8, fontSize: 14 }}>
                        {t(`form.docTypes.${doc}`)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="fz-field">
                  <label className="fz-label" htmlFor="request-note">{t('form.note')}</label>
                  <textarea
                    id="request-note"
                    className="fz-textarea"
                    value={note}
                    placeholder={t('form.notePh')}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </section>
            </div>

            {/* خلاصه درخواست */}
            <aside className="fz-split__aside">
              <div className="fz-card fz-card--raised">
                <h2 style={{ fontSize: 18 }}>{t('form.summaryTitle')}</h2>
                <dl className="fz-stack fz-muted" style={{ margin: 0, fontSize: 14 }}>
                  <div className="fz-row"><dt>{t('form.summaryPackage')}</dt><dd className="fz-strong" style={{ margin: 0, color: 'var(--fz-text)' }}>{t('form.summaryPackageValue')}</dd></div>
                  <div className="fz-row"><dt>{t('form.summaryDeparture')}</dt><dd className="fz-strong fz-num" style={{ margin: 0, color: 'var(--fz-text)' }}>۱۵ مهر ۱۴۰۵</dd></div>
                  <div className="fz-row"><dt>{t('form.summaryPax')}</dt><dd className="fz-strong fz-num" style={{ margin: 0, color: 'var(--fz-text)' }}>{num(travelers.length, locale)} {t('form.paxUnit')}</dd></div>
                </dl>
                <div className="fz-card fz-card--tint" style={{ padding: 18, gap: 10 }}>
                  <div className="fz-row fz-muted" style={{ fontSize: 14 }}>
                    <span>{t('form.summaryTotal')}</span>
                    <span className="fz-strong"><BizPrice rial={125_600_000_0} locale={locale} /></span>
                  </div>
                  <div className="fz-row fz-strong" style={{ color: 'var(--fz-brand-deep)' }}>
                    <span>{t('form.summaryDeposit')}</span>
                    <span className="fz-num"><BizPrice rial={37_680_000_0} locale={locale} /></span>
                  </div>
                </div>

                <label className="fz-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} data-field="terms">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    style={{ width: 20, height: 20, marginTop: 4, accentColor: 'var(--fz-brand)' }}
                    aria-invalid={fieldErr('terms') ? true : undefined}
                  />
                  <span className="fz-muted" style={{ fontSize: 13 }}>{t('form.terms')}</span>
                </label>
                <BizFieldError>{fieldErr('terms')}</BizFieldError>

                <div className="fz-cta-sticky">
                  <button type="button" className="fz-btn fz-btn--action" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? t('form.submitting') : t('form.submitCta')}
                  </button>
                </div>
                <button type="button" className="fz-btn fz-btn--ghost" onClick={saveDraftNow}>
                  {t('form.saveDraft')} {savedAt ? `— ${savedAt}` : ''}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
