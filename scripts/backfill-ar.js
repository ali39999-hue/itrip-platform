/**
 * One-shot: backfill missing `ar` keys (in fa.json key order) + fix 2 non-localized values.
 * Run once: node scripts/backfill-ar.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const fa = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'fa.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'ar.json'), 'utf8'));

const T = {
  'HotelDetail.backToResults': 'العودة إلى النتائج',
  'HotelDetail.capacityError': 'السعة المختارة غير كافية',
  'Flights.nonStop': 'بدون توقف',
  'Flights.filters': 'الفلاتر',
  'Flights.airlines': 'شركات الطيران',
  'Flights.flightFound': 'تم العثور على {count} رحلة',
  'Flights.noFlights': 'لا توجد رحلات مطابقة لهذه الفلاتر',
  'Flights.clearFilters': 'مسح جميع الفلاتر',
  'Tours.filterCategory': 'التصنيف',
  'Tours.filterSort': 'الترتيب حسب',
  'Tours.sortRecommended': 'الأكثر ملاءمة',
  'Tours.sortPriceLow': 'الأقل سعراً',
  'Tours.sortDuration': 'المدة',
  'Tours.emptyTours': 'لا توجد جولات متاحة في هذه الفئة',
  'Tours.days': 'أيام',
  'Tours.startsFrom': 'تبدأ من',
  'Visa.processingTime': 'مدة الإصدار',
  'Visa.guarantee': 'دعم وضمان استرداد الأموال',
  'Insurance.coverage': 'التغطيات الرئيسية',
  'Transfers.subtitle': 'سيارات خاصة وشاحنات VIP وخدمات نقل جماعية مع سائقين معتمدين',
  'Transfers.airportTransfer': 'نقل المطار',
  'Transfers.search': 'البحث عن خدمة النقل',
  'Transfers.reserve': 'حجز النقل',
  'Trains.filters': 'الفلاتر',
  'Trains.noTickets': 'لا توجد تذاكر مطابقة لبحثك',
  'Trains.origin': 'محطة الانطلاق',
  'Trains.destination': 'محطة الوصول',
  'Trains.searchTickets': 'البحث عن تذاكر',
  'Auth.welcome': 'مرحباً بك في فيروزو',
  'Auth.phoneLabel': 'رقم الجوال',
  'Auth.otpLabel': 'رمز التحقق لمرة واحدة',
  'Auth.verifyOtp': 'تحقق وتسجيل الدخول',
  'Auth.identityInfo': 'معلومات الهوية',
  'Auth.passportScan': 'ماسح جوازات ذكي',
  'Auth.googleLogin': 'تسجيل الدخول السريع عبر Google',
  'Account.editProfile': 'تعديل البيانات الشخصية',
  'Account.security': 'الأمان وكلمة المرور',
  'Account.notifications': 'تنبيهات الرسائل النصية والبريد الإلكتروني',
  'Account.saveChanges': 'حفظ التغييرات',
  'MyTrips.digitalCard': 'بطاقة السفر الرقمية',
  'MyTrips.refund': 'طلب استرداد التذكرة',
  'MyTrips.downloadVoucher': 'تحميل القسيمة',
  'MyTrips.completed': 'الرحلات المنتهية',
  'Wallet.balance': 'الرصيد المتاح',
  'Wallet.withdraw': 'طلب سحب الأموال',
  'Support.categories': 'فئات المساعدة',
  'Support.faq': 'الأسئلة الشائعة',
  'Support.onlineChat': 'دعم مباشر على مدار الساعة',
  'Support.online': 'متصل وجاهز',
  'Support.typeMessage': 'اكتب رسالتك هنا...',
  'Support.send': 'إرسال',
  'Snapp.customPackages': 'باقات مخصصة لكل مسافر',
  'Snapp.quickTopup': 'شحن سريع',
  'Snapp.floatWallet': 'محفظة مرنة',
  'Snapp.simAndSnapp': 'باقة شريحة + سناب',
  'Snapp.buyPackage': 'شراء باقة سناب',
  'Destinations.popular': 'وجهات رائجة',
  'Destinations.citiesOf': 'مدن {country}',
  'Destinations.smartPlanner': 'مخطط الرحلات الذكي',
  'Destinations.readyTours': 'جولات جاهزة',
  'Destinations.travelGuide': 'دليل السفر',
  'Book.addons': 'خدمات إضافية للسفر',
  'Services.catalog': 'دليل الخدمات الكامل',
  'Services.specialForDest': 'مخصص لوجهتك',
  'Services.exclusivePackage': 'باقة سفر حصرية إلى {country}',
  // non-localized fixes (were identical to fa)
  'Interpreter.sos': 'مترجم الطوارئ',
  'Flights.stops': 'توقفات',
};

// Rebuild ar mirroring fa's key order exactly.
function build(faNode, arNode, prefix) {
  const out = {};
  for (const k of Object.keys(faNode)) {
    const p = prefix ? prefix + '.' + k : k;
    const fv = faNode[k];
    if (typeof fv === 'object' && fv !== null) {
      out[k] = build(fv, arNode ? arNode[k] : undefined, p);
    } else {
      const av = arNode ? arNode[k] : undefined;
      if (av !== undefined) out[k] = T[p] !== undefined ? T[p] : av;
      else if (T[p] !== undefined) out[k] = T[p];
      else throw new Error('NO TRANSLATION FOR ' + p);
    }
  }
  // ar may hold extra keys fa lacks — detect instead of dropping silently
  if (arNode) {
    for (const k of Object.keys(arNode)) {
      if (!(k in faNode)) throw new Error('EXTRA KEY IN AR: ' + (prefix ? prefix + '.' : '') + k);
    }
  }
  return out;
}

const merged = build(fa, ar, '');
fs.writeFileSync(path.join(ROOT, 'messages', 'ar.json'), JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log('ar.json rebuilt: ' + Object.keys(T).length + ' keys backfilled/fixed, order mirrors fa.json');
