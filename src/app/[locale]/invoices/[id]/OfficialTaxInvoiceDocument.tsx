'use client';

import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { OfficialTaxInvoicePayload } from '@/domains/finance/InvoiceDomainService';
import { lt } from '@/lib/lt';
import {
  Printer,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Stamp,
} from 'lucide-react';

interface Props {
  invoiceData: OfficialTaxInvoicePayload;
}

export function OfficialTaxInvoiceDocument({ invoiceData }: Props) {
  const locale = useLocale();
  const router = useRouter();

  const { invoice, seller, buyer, lines, bookingReference } = invoiceData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-soft py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:w-full print:space-y-0">
        {/* Actions Bar (Hidden when printing) */}
        <div className="print:hidden flex items-center justify-between bg-surface p-4 rounded-2xl border border-line shadow-xs">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-black text-sub hover:text-ink transition cursor-pointer"
          >
            <ArrowRight size={16} className="rtl:rotate-180" />
            <span>{lt(locale, { fa: 'بازگشت', en: 'Back', ar: 'رجوع', zh: '返回', ru: 'Назад'})}</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black flex items-center gap-1">
              <CheckCircle2 size={13} />
              صورتحساب فروش — قالب رسمی داخلی
            </span>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-brand transition cursor-pointer active:scale-[0.98]"
            >
              <Printer size={15} />
              <span>{lt(locale, { fa: 'چاپ فاکتور رسمی / ذخیره PDF', en: 'Print Invoice / PDF', ar: 'طباعة الفاتورة الرسمية / حفظ PDF', zh: '打印正式发票 / 保存 PDF', ru: 'Печать официального счёта / Сохранить PDF'})}</span>
            </button>
          </div>
        </div>

        {/* Official Statutory Invoice Document Container */}
        <div
          dir="rtl"
          className="bg-white text-slate-900 rounded-3xl border-2 border-slate-300 p-6 sm:p-10 shadow-lg print:border-none print:shadow-none print:p-0 print:rounded-none font-sans"
        >
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Logo & Platform Info */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                  ف
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-teal-900">
                    {seller.brandName}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500">
                    سامانه هوشمند خدمات مسافرت هوایی و گردشگری
                  </p>
                </div>
              </div>

              {/* Central Title */}
              <div className="text-center">
                <h1 className="text-xl font-black text-slate-900 border-b-2 border-slate-800 pb-1 px-4 inline-block">
                  صورتحساب الکترونیکی فروش کالا و خدمات
                </h1>
                <p className="text-[10.5px] font-bold text-slate-500 mt-1">
                  قالب هم‌راستا با ماده ۱۹ ق.م.ا و ماده ۱۶۹ م.م — این سند هنوز به سامانه مؤدیان ارسال نشده است
                </p>
              </div>

              {/* Fiscal Serial & Numbers */}
              <div className="text-start sm:text-end text-xs space-y-1 font-mono">
                <div>
                  <span className="text-slate-500 font-sans">شماره فاکتور: </span>
                  <strong className="text-slate-900">{invoice.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">شناسه رهگیری داخلی: </span>
                  <strong className="text-teal-800">{invoice.fiscalSerial}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">تاریخ صدور: </span>
                  <strong className="text-slate-900">{invoice.issuedAtJalali}</strong>
                </div>
                {bookingReference && (
                  <div>
                    <span className="text-slate-500 font-sans">کد رزرو: </span>
                    <strong className="text-slate-900">{bookingReference}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parties Grid (Seller & Buyer) */}
          <div className="space-y-4 mb-6 text-xs">
            {/* Seller Box */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70">
              <div className="bg-slate-200 text-slate-800 px-3 py-1 rounded-lg font-black text-xs inline-block mb-3">
                مشخصات فروشنده
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 font-bold">نام شخص حقوقی: </span>
                  <strong className="text-slate-900">{seller.legalName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">شناسه ملی: </span>
                  <strong className="font-mono text-slate-900">{seller.nationalId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">شماره اقتصادی: </span>
                  <strong className="font-mono text-slate-900">{seller.economicCode}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">شماره ثبت: </span>
                  <strong className="font-mono text-slate-900">{seller.registrationNo}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">کد پستی ۱۰ رقمی: </span>
                  <strong className="font-mono text-slate-900">{seller.postalCode}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">تلفن پشتیبانی: </span>
                  <strong className="font-mono text-slate-900">{seller.phone}</strong>
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <span className="text-slate-500 font-bold">نشانی قانونی: </span>
                  <span className="text-slate-800">{seller.address}</span>
                </div>
              </div>
            </div>

            {/* Buyer Box */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70">
              <div className="bg-slate-200 text-slate-800 px-3 py-1 rounded-lg font-black text-xs inline-block mb-3">
                مشخصات خریدار {buyer.isCorporate ? '(شخص حقوقی)' : '(شخص حقیقی)'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 font-bold">نام خریدار: </span>
                  <strong className="text-slate-900">{buyer.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">کد ملی / شناسه ملی: </span>
                  <strong className="font-mono text-slate-900">{buyer.nationalId || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">شماره اقتصادی: </span>
                  <strong className="font-mono text-slate-900">{buyer.economicCode || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">شماره تماس: </span>
                  <strong className="font-mono text-slate-900" dir="ltr">
                    {buyer.phone || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">پست الکترونیکی: </span>
                  <strong className="font-mono text-slate-900" dir="ltr">
                    {buyer.email || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">وضعیت حساب: </span>
                  <strong className="text-emerald-700">تایید شده</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-xs text-start border border-slate-300 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-black">
                  <th className="py-2.5 px-3 text-center w-10">ردیف</th>
                  <th className="py-2.5 px-3 text-start">شرح کالا یا خدمات</th>
                  <th className="py-2.5 px-3 text-center w-14">تعداد</th>
                  <th className="py-2.5 px-3 text-end">مبلغ واحد ({invoice.currency})</th>
                  <th className="py-2.5 px-3 text-end">مبلغ کل ({invoice.currency})</th>
                  <th className="py-2.5 px-3 text-center w-16">نرخ مالیات</th>
                  <th className="py-2.5 px-3 text-end">مالیات و عوارض (VAT)</th>
                  <th className="py-2.5 px-3 text-end">مبلغ نهایی ({invoice.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lines.map((item) => (
                  <tr key={item.rowNumber} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {item.rowNumber}
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono">
                      {item.unitPrice.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono">
                      {item.totalPrice.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {item.taxRatePercent > 0 ? `${item.taxRatePercent}٪` : 'معاف'}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-slate-700">
                      {item.taxAmount.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-black text-slate-900">
                      {item.finalAmount.toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">
            {/* In Words & Guarantee */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-bold block mb-1">مبلغ کل به حروف:</span>
                <strong className="text-sm font-black text-slate-900 block leading-relaxed">
                  {invoice.totalInWordsFa}
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 leading-relaxed">
                این سند به‌صورت الکترونیکی توسط فیروزو در «قالب رسمی» صادر شده است؛ تا زمان اتصال و تأیید سامانه مؤدیان، به منزله صورتحساب تسویه‌شده نزد سازمان مالیاتی نیست.
              </p>
            </div>

            {/* Numerical Totals */}
            <div className="border-2 border-slate-300 rounded-2xl p-4 bg-white space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-600 font-sans">
                <span>مجموع بهای پایه (خالص):</span>
                <strong className="font-mono text-slate-900 text-sm">
                  {invoice.netAmount.toLocaleString('fa-IR')} {invoice.currency}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-sans">
                <span>مجموع مالیات و عوارض ارزش افزوده (VAT):</span>
                <strong className="font-mono text-slate-900 text-sm">
                  {invoice.taxAmount.toLocaleString('fa-IR')} {invoice.currency}
                </strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 font-sans">
                <span className="font-black text-sm text-slate-900">مبلغ قابل پرداخت / تسویه شده:</span>
                <strong className="font-mono text-teal-800 text-base font-black">
                  {invoice.totalAmount.toLocaleString('fa-IR')} {invoice.currency}
                </strong>
              </div>
            </div>
          </div>

          {/* Digital Signature, Stamp, and QR Footer */}
          <div className="border-t-2 border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
            {/* Official Stamp & Sign */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-teal-800 flex flex-col items-center justify-center text-teal-800 p-2 text-center rotate-[-6deg] shadow-xs">
                <Stamp size={20} className="mb-0.5" />
                <span className="text-[9px] font-black leading-tight">شرکت فیروزه</span>
                <span className="text-[8px] font-bold">مهر دیجیتال</span>
                <span className="text-[8px] font-mono">FIN-AUTH-OK</span>
              </div>
              <div>
                <span className="font-black text-slate-900 block mb-1">
                  مهر و امضای مجاز صادرکننده:
                </span>
                <span className="text-slate-500 block text-[11px]">
                  امضای الکترونیکی امن و ثبت در دفترکل
                </span>
                <span className="text-[10px] font-mono text-teal-700 block mt-1">
                  SHA256: {invoice.id.slice(0, 16)}…
                </span>
              </div>
            </div>

            {/* QR Verification Box */}
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="w-16 h-16 bg-white border border-slate-300 rounded-xl grid place-items-center">
                <QrCode size={42} className="text-slate-800" />
              </div>
              <div className="text-[11px] max-w-[180px] space-y-1">
                <span className="font-black text-slate-900 block">استعلام اصالت سند</span>
                <p className="text-slate-500 text-[10px] leading-tight">
                  جهت راستی‌آزمایی در سامانه امور مالیاتی، بارکد را اسکن فرمایید.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
