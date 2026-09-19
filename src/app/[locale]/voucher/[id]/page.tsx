import React from 'react';
import { notFound } from 'next/navigation';
import { VoucherService } from '@/domains/booking/VoucherService';
import Image from 'next/image';

interface VoucherPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function VoucherPage({ params }: VoucherPageProps) {
  const { locale, id } = await params;
  const voucher = await VoucherService.generateVoucher(id);

  if (!voucher) {
    notFound();
  }

  const isRtl = locale === 'fa' || locale === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="min-h-dvh bg-neutral-100 p-4 sm:p-8 print:p-0 print:bg-white text-neutral-900 font-sans">
      {/* Top action bar - hidden on print */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-500">
            {isRtl ? 'تأییدیه رسمی بلیت و رزرو سفر' : 'Official Booking Confirmation & E-Ticket'}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
            {voucher.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium bg-teal-700 text-white rounded-lg shadow hover:bg-teal-800 transition cursor-pointer"
            id="print-btn"
          >
            {isRtl ? 'چاپ یا ذخیره PDF' : 'Print / Save as PDF'}
          </button>
        </div>
      </div>

      {/* Main A4 Printable Document Container */}
      <main className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-xl p-4 sm:p-8 shadow-lg print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Header Block */}
        <header className="border-b border-neutral-200 pb-6 mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold tracking-tight text-teal-700">FIRUZO</span>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                TRAVEL OPERATING LAYER
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isRtl ? 'سامانه یکپارچه رزرواسیون گردشگری و سفر' : 'Unified Travel & Hospitality Operating Platform'}
            </p>
            <div className="mt-3 text-sm text-neutral-600">
              <span className="font-semibold text-neutral-900">{isRtl ? 'کد رهگیری سیستم:' : 'Booking Ref:'} </span>
              <span className="font-mono text-base font-bold text-teal-800">{voucher.bookingReference}</span>
              {voucher.pnr && (
                <span className="ms-4 font-mono text-sm bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
                  PNR: <strong>{voucher.pnr}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Verification QR Code */}
          <div className="text-center">
            <div className="border border-neutral-200 p-1.5 rounded-lg bg-white inline-block shadow-sm">
              <Image
                src={voucher.qrCodeDataUrl}
                alt="Ticket Verification QR"
                width={110}
                height={110}
                className="w-24 h-24 sm:w-28 sm:h-28"
              />
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 font-mono">
              {isRtl ? 'اسکن جهت استعلام اصالت' : 'Scan to Verify Authenticity'}
            </div>
          </div>
        </header>

        {/* Service & Itinerary Summary */}
        <section className="mb-6 bg-neutral-50 rounded-lg p-5 border border-neutral-200">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            {isRtl ? 'مشخصات سفر و رزرواسیون' : 'Trip & Service Details'}
          </div>
          <div className="text-lg font-bold text-neutral-900 mb-4">{voucher.service.title}</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-neutral-500 mb-0.5">{isRtl ? 'نوع خدمت' : 'Service Type'}</div>
              <div className="font-medium">{voucher.service.type}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-0.5">{isRtl ? 'تأمین‌کننده / شرکت' : 'Operator / Carrier'}</div>
              <div className="font-medium">{voucher.service.supplierName}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-0.5">{isRtl ? 'تاریخ رفت / ورود' : 'Travel / Check-in'}</div>
              <div className="font-medium font-mono">{voucher.service.travelDate || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-0.5">{isRtl ? 'تاریخ برگشت / خروج' : 'Return / Check-out'}</div>
              <div className="font-medium font-mono">{voucher.service.returnDate || '-'}</div>
            </div>
          </div>

          {(voucher.service.origin || voucher.service.destination) && (
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center gap-4 text-sm">
              <span className="text-neutral-500">{isRtl ? 'مسیر:' : 'Route:'}</span>
              <span className="font-semibold text-neutral-800">
                {voucher.service.origin} ➔ {voucher.service.destination}
              </span>
              {voucher.service.flightNumber && (
                <span className="ms-auto font-mono text-xs bg-white px-2 py-0.5 rounded border border-neutral-200">
                  Flight {voucher.service.flightNumber}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Dedicated CIP Lounge Voucher Block (if applicable) */}
        {voucher.service.cipDetails && (
          <section className="mb-6 rounded-xl p-5 border-2 border-amber-300 bg-amber-50/60 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">★</span>
                <h3 className="text-base font-bold text-amber-950">
                  {isRtl ? 'واچر تشریفات اختصاصی جایگاه CIP فرودگاه' : 'Airport Executive CIP Lounge Voucher'}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                {voucher.service.cipDetails.airportCode} CIP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-800">
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'فرودگاه و جایگاه' : 'Airport & Terminal'}</div>
                <div className="font-bold">{voucher.service.cipDetails.airportName}</div>
                <div className="text-[11px] text-neutral-600">{voucher.service.cipDetails.terminal}</div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'نوع پرواز مسافر' : 'Flight Direction'}</div>
                <div className="font-bold">
                  {voucher.service.cipDetails.flightDirection === 'DEPARTURE'
                    ? (isRtl ? 'پرواز خروجی (Departure)' : 'Departure')
                    : voucher.service.cipDetails.flightDirection === 'ARRIVAL'
                    ? (isRtl ? 'پرواز ورودی (Arrival)' : 'Arrival')
                    : (isRtl ? 'پرواز ترانزیت (Transit)' : 'Transit')}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'ترانسفر باند پرواز' : 'Tarmac Transfer'}</div>
                <div className="font-bold text-emerald-800">
                  {isRtl ? 'خودروی تشریفاتی اختصاصی باند' : 'Private Apron Limousine'}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'همراهان / خدمات ویژه' : 'Guests & Extras'}</div>
                <div className="font-bold">
                  {voucher.service.cipDetails.accompanyingGuests > 0
                    ? `${voucher.service.cipDetails.accompanyingGuests} ${isRtl ? 'نفر همراه' : 'Guest(s)'}`
                    : (isRtl ? 'پذیرایی کامل سلف‌سرویس' : 'All-inclusive buffet')}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dedicated Travel Insurance Certificate Block (if applicable) */}
        {voucher.service.insuranceDetails && (
          <section className="mb-6 rounded-xl p-5 border-2 border-emerald-300 bg-emerald-50/60 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
                <h3 className="text-base font-bold text-emerald-950">
                  {isRtl ? 'گواهی رسمی بیمه‌نامه مسافرتی بین‌المللی' : 'Official Travel Insurance Certificate'}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                {isRtl ? 'مورد تایید سفارتخانه‌ها' : 'Embassy Approved'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-800 mb-3">
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'شماره بیمه‌نامه' : 'Policy Number'}</div>
                <div className="font-mono font-bold text-emerald-900">{voucher.service.insuranceDetails.policyNumber}</div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'شرکت بیمه‌گر' : 'Insurer Company'}</div>
                <div className="font-bold">{voucher.service.insuranceDetails.companyName}</div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'شرکت کمک‌رسان بین‌المللی' : 'Assistance Partner'}</div>
                <div className="font-bold">{voucher.service.insuranceDetails.assistancePartner}</div>
                <div className="text-[11px] font-mono text-neutral-600">{voucher.service.insuranceDetails.assistancePhone}</div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">{isRtl ? 'سقف تعهدات خسارت' : 'Coverage Limit'}</div>
                <div className="font-bold text-emerald-800 font-mono">
                  €{voucher.service.insuranceDetails.coverageEur.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-800 bg-white/70 p-2.5 rounded-lg border border-emerald-200">
              <span>{voucher.service.insuranceDetails.validityNotice}</span>
            </div>
          </section>
        )}

        {/* Travelers Manifest Section */}
        <section className="mb-6">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            {isRtl ? 'اسامی مسافران و مشخصات شناسایی' : 'Passenger & Guest Manifest'}
          </div>
          <div className="hidden md:block border border-neutral-200 rounded-lg overflow-hidden print:block">
            <table className="w-full text-start text-sm">
              <thead className="bg-neutral-100 border-b border-neutral-200 text-xs font-semibold text-neutral-600">
                <tr>
                  <th className="py-2.5 px-4 text-start">#</th>
                  <th className="py-2.5 px-4 text-start">{isRtl ? 'نام مسافر' : 'Full Name'}</th>
                  <th className="py-2.5 px-4 text-start">{isRtl ? 'کد ملی / پاسپورت' : 'ID / Passport No'}</th>
                  <th className="py-2.5 px-4 text-start">{isRtl ? 'شماره صندلی / اتاق' : 'Seat / Room'}</th>
                  <th className="py-2.5 px-4 text-start">{isRtl ? 'رده' : 'Type'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {voucher.travelers.map((t, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-neutral-900">{t.fullName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700">
                      {t.passportNumber || t.nationalId || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-800">{t.seat || t.room || '-'}</td>
                    <td className="py-3 px-4 text-xs text-neutral-500">{t.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* فهرست کارتی موبایل — جدول در ۳۹۰px له می‌شد */}
          <div className="md:hidden print:hidden space-y-2">
            {voucher.travelers.map((t, idx) => (
              <div key={idx} className="border border-neutral-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-neutral-900">{t.fullName}</span>
                  <span className="text-xs text-neutral-500">{t.type}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-700">
                  <span className="font-mono">{t.passportNumber || t.nationalId || '-'}</span>
                  <span className="font-mono">{t.seat || t.room || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Policies & Baggage Allowance */}
        <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-600">
          <div className="border border-neutral-200 rounded-lg p-4">
            <div className="font-semibold text-neutral-800 mb-1">{isRtl ? 'بار مجاز مسافر' : 'Baggage Allowance'}</div>
            <p>{voucher.service.baggage}</p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-4">
            <div className="font-semibold text-neutral-800 mb-1">{isRtl ? 'قوانین لغو و تغییرات' : 'Cancellation & Modification'}</div>
            <p>{voucher.service.cancellationPolicy}</p>
          </div>
        </section>

        {/* Financial & Settlement Block */}
        <section className="border-t border-neutral-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
          <div>
            <span className="text-neutral-500">{isRtl ? 'مبلغ کل پرداخت‌شده:' : 'Total Amount Paid:'} </span>
            <span className="font-mono text-lg font-bold text-neutral-900">
              {voucher.pricing.totalAmount.toLocaleString()} {voucher.pricing.currency}
            </span>
          </div>
          <div className="text-xs text-neutral-500 text-end">
            <div>{isRtl ? 'تاریخ صدور سند:' : 'Issued At:'} {new Intl.DateTimeFormat(isRtl ? 'fa-IR-u-ca-persian' : locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(voucher.issuedAt))}</div>
            <div>{isRtl ? 'پشتیبانی ۲۴ ساعته سفر:' : '24/7 Support:'} +98 21 8888 0000 | support@firuzo.com</div>
          </div>
        </section>
      </main>

      {/* Inline Print Script for Browser Execution */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('print-btn')?.addEventListener('click', function() {
              window.print();
            });
          `,
        }}
      />
    </div>
  );
}
