import { prisma } from '../src/lib/prisma';

async function seedBusiness() {
  console.log('Seeding Business Tour Packages...');

  const packagesData = [
    {
      slug: 'canton-fair',
      vertical: 'technology',
      title: 'نمایشگاه کانتون فر + بازار موبایل گوانگژو',
      titleEn: 'Canton Fair & Guangzhou Electronics Market',
      destination: 'گوانگژو، چین',
      destinationEn: 'Guangzhou, China',
      durationDays: 7,
      basePrice: 145_000_000,
      includes: [
        'پرواز رفت و برگشت با بار مجاز',
        'هتل ۴ ستاره نزدیک محل نمایشگاه با صبحانه',
        'ویزای تجاری و دعوت‌نامه نمایشگاه',
        'ترانسفر فرودگاهی و جابه‌جایی روزانه گروه',
        'مترجم گروهی در روزهای نمایشگاه',
        'بیمه مسافرتی و سرپرست تور',
      ],
      requiredDocs: [
        'پاسپورت با اعتبار حداقل ۶ ماه',
        'روزنامه رسمی یا آگهی تاسیس شرکت',
        'معرفی‌نامه شرکت برای نفرات اعزامی',
        'کارت بازرگانی (در صورت وجود)',
        'عکس پرسنلی با پس‌زمینه سفید',
      ],
      status: 'PUBLISHED',
      departures: [
        { departDate: new Date('2026-10-07T00:00:00Z'), returnDate: new Date('2026-10-14T00:00:00Z'), capacity: 30, bookedCount: 18 },
        { departDate: new Date('2026-10-21T00:00:00Z'), returnDate: new Date('2026-10-28T00:00:00Z'), capacity: 30, bookedCount: 7 },
        { departDate: new Date('2026-11-04T00:00:00Z'), returnDate: new Date('2026-11-11T00:00:00Z'), capacity: 30, bookedCount: 2 },
      ],
      addons: [
        { code: 'cf-translator', title: 'مترجم اختصاصی', price: 12_000_000, unit: 'per_group' },
        { code: 'cf-legal', title: 'مشاور حقوقی و قرارداد', price: 8_000_000, unit: 'per_group' },
        { code: 'cf-booth', title: 'غرفه یا میز نمایشگاهی', price: 25_000_000, unit: 'per_group' },
        { code: 'cf-driver', title: 'خودرو و راننده اختصاصی', price: 9_000_000, unit: 'per_group' },
      ],
    },
    {
      slug: 'shenzhen-factory',
      vertical: 'technology',
      title: 'بازدید کارخانه و تامین‌کننده‌یابی شنژن',
      titleEn: 'Shenzhen Factory Visit & Supplier Sourcing',
      destination: 'شنژن، چین',
      destinationEn: 'Shenzhen, China',
      durationDays: 6,
      basePrice: 128_000_000,
      includes: [
        'پرواز رفت و برگشت با بار مجاز',
        'هتل ۴ ستاره با صبحانه',
        'ویزای تجاری و دعوت‌نامه شرکتی',
        'ترانسفر و جابه‌جایی برنامه بازدیدها',
        'مترجم فنی در جلسات کارخانه',
        'بیمه مسافرتی و سرپرست تور',
      ],
      requiredDocs: [
        'پاسپورت با اعتبار حداقل ۶ ماه',
        'روزنامه رسمی یا آگهی تاسیس شرکت',
        'معرفی‌نامه شرکت برای نفرات اعزامی',
        'عکس پرسنلی با پس‌زمینه سفید',
      ],
      status: 'PUBLISHED',
      departures: [
        { departDate: new Date('2026-10-14T00:00:00Z'), returnDate: new Date('2026-10-20T00:00:00Z'), capacity: 20, bookedCount: 5 },
        { departDate: new Date('2026-10-27T00:00:00Z'), returnDate: new Date('2026-11-02T00:00:00Z'), capacity: 20, bookedCount: 3 },
      ],
      addons: [
        { code: 'sz-translator', title: 'مترجم فنی اختصاصی', price: 12_000_000, unit: 'per_group' },
        { code: 'sz-legal', title: 'مشاور حقوقی و قرارداد', price: 8_000_000, unit: 'per_group' },
        { code: 'sz-inspection', title: 'بازرسی پیش از حمل', price: 9_500_000, unit: 'per_group' },
      ],
    },
    {
      slug: 'moscow-delegation',
      vertical: 'technology',
      title: 'هیئت تجاری صنعت و تجهیزات مسکو',
      titleEn: 'Moscow Industrial & Technology Delegation',
      destination: 'مسکو، روسیه',
      destinationEn: 'Moscow, Russia',
      durationDays: 5,
      basePrice: 169_000_000,
      includes: [
        'پرواز رفت و برگشت با بار مجاز',
        'هتل ۴ ستاره مرکزی با صبحانه',
        'ویزای تجاری و دعوت‌نامه رسمی',
        'ترانسفر فرودگاهی و جابه‌جایی گروه',
        'مترجم گروهی',
        'بیمه مسافرتی و سرپرست تور',
      ],
      requiredDocs: [
        'پاسپورت با اعتبار حداقل ۶ ماه',
        'روزنامه رسمی یا آگهی تاسیس شرکت',
        'معرفی‌نامه شرکت برای نفرات اعزامی',
        'تاییدیه تشکل یا اتاق بازرگانی',
        'عکس پرسنلی با پس‌زمینه سفید',
      ],
      status: 'PUBLISHED',
      departures: [
        { departDate: new Date('2026-11-01T00:00:00Z'), returnDate: new Date('2026-11-06T00:00:00Z'), capacity: 25, bookedCount: 9 },
        { departDate: new Date('2026-11-15T00:00:00Z'), returnDate: new Date('2026-11-20T00:00:00Z'), capacity: 25, bookedCount: 4 },
      ],
      addons: [
        { code: 'mo-translator', title: 'مترجم اختصاصی', price: 13_000_000, unit: 'per_group' },
        { code: 'mo-b2b', title: 'هماهنگی جلسات B2B با اتاق بازرگانی', price: 16_000_000, unit: 'per_group' },
      ],
    },
    {
      // §36 scale layer: second vertical seeded to prove multi-vertical catalog.
      slug: 'istanbul-wellness',
      vertical: 'health_wellness',
      title: 'سفر سلامت‌محور استانبول — چکاپ و بازتوانی',
      titleEn: 'Istanbul Wellness & Checkup Retreat',
      destination: 'استانبول، ترکیه',
      destinationEn: 'Istanbul, Turkey',
      durationDays: 5,
      basePrice: 96_000_000,
      includes: [
        'پرواز رفت و برگشت با بار مجاز',
        'هتل ۴ ستاره با اقلام سلامت‌محور',
        'چکاپ کامل در بیمارستان طرف قرارداد (JCI)',
        'ترانسفر‌های درمان و بازدید',
        'همراه مترجم بیمارستان',
        'بیمه مسافرتی با پوشش درمانی',
      ],
      requiredDocs: [
        'پاسپورت با اعتبار حداقل ۶ ماه',
        'شرح‌حال پزشکی (در صورت وجود)',
        'لیست داروهای مصرفی فعلی',
      ],
      status: 'PUBLISHED',
      departures: [
        { departDate: new Date('2026-11-10T00:00:00Z'), returnDate: new Date('2026-11-15T00:00:00Z'), capacity: 12, bookedCount: 2 },
        { departDate: new Date('2026-12-01T00:00:00Z'), returnDate: new Date('2026-12-06T00:00:00Z'), capacity: 12, bookedCount: 0 },
      ],
      addons: [
        { code: 'wl-interpreter', title: 'مترجم پزشکی اختصاصی', price: 7_000_000, unit: 'per_group' },
        { code: 'wl-nurse', title: 'مراقبت پرستاری در هتل', price: 11_000_000, unit: 'per_person' },
      ],
    },
  ];

  for (const pkg of packagesData) {
    const { departures, addons, ...pkgDetails } = pkg;
    const existing = await prisma.businessTourPackage.findUnique({
      where: { slug: pkg.slug },
    });

    if (existing) {
      console.log(`Package ${pkg.slug} already exists, updating...`);
      await prisma.businessTourPackage.update({
        where: { slug: pkg.slug },
        data: pkgDetails,
      });
      for (const a of addons) {
        await prisma.businessAddon.upsert({
          where: { code: a.code },
          update: { price: a.price, title: a.title, unit: a.unit },
          create: { ...a, packageId: existing.id },
        });
      }
    } else {
      console.log(`Creating package ${pkg.slug}...`);
      const created = await prisma.businessTourPackage.create({
        data: {
          ...pkgDetails,
          departures: {
            create: departures,
          },
          addons: {
            create: addons,
          },
        },
      });
      console.log(`Created ${created.title} (${created.id})`);
    }
  }

  console.log('Business seeding completed successfully.');
}

seedBusiness()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
