import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROLE_DEFAULT_PERMISSIONS } from '../src/domains/identity/permissions';
import { DETAILED_TOURS } from '../src/services/tours-service';
import { COUNTRIES } from '../src/lib/countries';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'FiruzoAdmin2026!@#';
  const userPassword = process.env.USER_PASSWORD || 'FiruzoUser2026!@#';

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash(userPassword, 10);

  // 1. Seed Core Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@firuzo.com' },
    update: {
      passwordHash: adminPasswordHash,
      phone: '09120000000',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_123',
      email: 'admin@firuzo.com',
      phone: '09120000000',
      name: 'Firuzo Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const testAdmin = await prisma.user.upsert({
    where: { phone: '09123456789' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_test_123',
      phone: '09123456789',
      name: 'Firuzo Test Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@firuzo.com' },
    update: {
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      phone: '09120000001',
      isActive: true,
    },
    create: {
      id: 'clr_mock_user_123',
      email: 'user@firuzo.com',
      phone: '09120000001',
      name: 'Firuzo User',
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  // 2. Seed Relational Permissions and Roles (IAM-001)
  const allPermissions = new Set<string>();
  Object.values(ROLE_DEFAULT_PERMISSIONS).forEach((perms) => {
    perms.forEach((p) => allPermissions.add(p));
  });

  for (const permCode of Array.from(allPermissions)) {
    const parts = permCode.split(':');
    const moduleName = (parts[0] || 'GENERAL').toUpperCase();
    await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: {
        code: permCode,
        name: permCode.replace(/:/g, ' ').toUpperCase(),
        module: moduleName,
      },
    });
  }

  for (const [roleName, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        permissions: '[]',
        description: `${roleName} Role`,
      },
    });

    for (const permCode of perms) {
      const p = await prisma.permission.findUnique({ where: { code: permCode } });
      if (p) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    }
  }

  for (const [u, roleName] of [
    [admin, 'SUPER_ADMIN'],
    [testAdmin, 'SUPER_ADMIN'],
    [user, 'CUSTOMER'],
  ] as const) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: role.id } },
        update: {},
        create: { userId: u.id, roleId: role.id },
      });
    }
  }

  // 3. Seed Canonical Chart of Accounts (FIN-001)
  const chartAccounts = [
    { code: '1010', name: 'Operating Cash & Bank', category: 'ASSET' },
    { code: '1020', name: 'Customer Wallet Liability', category: 'LIABILITY' },
    { code: '1030', name: 'FX Liquidity Pool', category: 'ASSET' },
    { code: '2010', name: 'Platform Customer Escrow', category: 'LIABILITY' },
    { code: '2020', name: 'Supplier Accounts Payable', category: 'LIABILITY' },
    { code: '2030', name: 'Tax & VAT Payable', category: 'LIABILITY' },
    { code: '4010', name: 'Platform Service Revenue', category: 'REVENUE' },
    { code: '4020', name: 'Fee Revenue', category: 'REVENUE' },
    { code: '5010', name: 'Supplier Travel Expense', category: 'EXPENSE' },
  ];

  for (const acc of chartAccounts) {
    await prisma.chartOfAccounts.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        currency: 'IRR',
        isActive: true,
      },
    });
  }

  // 3b. Seed User Wallet
  const userWalletAcc = await prisma.account.upsert({
    where: {
      ownerType_ownerId_currency: { ownerType: 'USER', ownerId: user.id, currency: 'IRR' },
    },
    update: {},
    create: { ownerType: 'USER', ownerId: user.id, currency: 'IRR' },
  });
  const gatewayAcc = await prisma.account.upsert({
    where: {
      ownerType_ownerId_currency: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: 'PLATFORM', currency: 'IRR' },
    },
    update: {},
    create: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: 'PLATFORM', currency: 'IRR' },
  });
  const existingSeedTopup = await prisma.ledgerEntry.findFirst({
    where: { groupId: 'seed_wallet_topup_user' },
  });
  if (!existingSeedTopup) {
    const seedAmount = new Prisma.Decimal('500000000'); // 500,000,000 IRR (~50M Tomans)
    await prisma.ledgerEntry.createMany({
      data: [
        {
          groupId: 'seed_wallet_topup_user',
          accountId: gatewayAcc.id,
          direction: 'DEBIT',
          amount: seedAmount,
          currency: 'IRR',
          referenceType: 'TOPUP',
          referenceId: 'SEED_INITIAL',
        },
        {
          groupId: 'seed_wallet_topup_user',
          accountId: userWalletAcc.id,
          direction: 'CREDIT',
          amount: seedAmount,
          currency: 'IRR',
          referenceType: 'TOPUP',
          referenceId: 'SEED_INITIAL',
        },
      ],
    });
  }

  // 4. Seed Versioned Tax Jurisdictions & Rules (MONEY-003)
  const irJurisdiction = await prisma.taxJurisdiction.upsert({
    where: { code: 'IR' },
    update: {},
    create: { code: 'IR', name: 'Iran National Tax Authority', countryCode: 'IR' },
  });

  await prisma.taxJurisdiction.upsert({
    where: { code: 'CN' },
    update: {},
    create: { code: 'CN', name: 'China State Taxation Administration', countryCode: 'CN' },
  });

  await prisma.taxJurisdiction.upsert({
    where: { code: 'AE' },
    update: {},
    create: { code: 'AE', name: 'UAE Federal Tax Authority', countryCode: 'AE' },
  });

  const irTaxRules = [
    { category: 'GENERAL', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'FLIGHT', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'HOTEL', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'TOUR', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'TRANSFER', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'VISA', ratePercentage: new Prisma.Decimal('0.00') },
    { category: 'ESIM', ratePercentage: new Prisma.Decimal('0.00') },
    { category: 'INSURANCE', ratePercentage: new Prisma.Decimal('0.00') },
  ];

  for (const rule of irTaxRules) {
    const existingRule = await prisma.taxRule.findFirst({
      where: { jurisdictionId: irJurisdiction.id, category: rule.category },
    });
    if (!existingRule) {
      await prisma.taxRule.create({
        data: {
          jurisdictionId: irJurisdiction.id,
          category: rule.category,
          ratePercentage: rule.ratePercentage,
          effectiveFrom: new Date('2020-01-01'),
          isActive: true,
        },
      });
    }
  }

  // 5. Seed Real Suppliers and Inventory Items (for Grounding & Catalog)
  const mahanSupplier = await prisma.supplier.upsert({
    where: { id: 'sup_mahan' },
    update: {},
    create: {
      id: 'sup_mahan',
      name: 'هواپیمایی ماهان (Mahan Air)',
      type: 'AIRLINE',
      mode: 'ALLOTMENT',
      contact: 'info@mahan.aero',
      isActive: true,
    },
  });

  const abbasiSupplier = await prisma.supplier.upsert({
    where: { id: 'sup_abbasi' },
    update: {},
    create: {
      id: 'sup_abbasi',
      name: 'هتل ۵ ستاره عباسی اصفهان',
      type: 'HOTEL',
      mode: 'ALLOTMENT',
      contact: 'reservation@abbasihotel.ir',
      isActive: true,
    },
  });

  // Inventory Items: Flights & Hotel Rooms
  const flightItem = await prisma.inventoryItem.upsert({
    where: { id: 'inv_flight_thr_mhd' },
    update: {},
    create: {
      id: 'inv_flight_thr_mhd',
      supplierId: mahanSupplier.id,
      type: 'FLIGHT_SEAT',
      code: 'W5-102',
      name: 'پرواز تهران به مشهد ماهان ایر',
      basePrice: new Prisma.Decimal('31000000'),
      currency: 'IRR',
    },
  });

  const hotelItem = await prisma.inventoryItem.upsert({
    where: { id: 'inv_hotel_abbasi_suite' },
    update: {},
    create: {
      id: 'inv_hotel_abbasi_suite',
      supplierId: abbasiSupplier.id,
      type: 'HOTEL_ROOM',
      code: 'ABBASI-ROYAL-SUITE',
      name: 'اتاق دبل سنتی هتل عباسی اصفهان',
      basePrice: new Prisma.Decimal('38000000'),
      currency: 'IRR',
    },
  });

  // Seed Allotments for next 30 days
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    await prisma.allotment.upsert({
      where: { inventoryItemId_date: { inventoryItemId: flightItem.id, date: dateStr } },
      update: {},
      create: {
        inventoryItemId: flightItem.id,
        date: dateStr,
        total: 20,
        booked: 2,
        stopSell: false,
      },
    });

    await prisma.allotment.upsert({
      where: { inventoryItemId_date: { inventoryItemId: hotelItem.id, date: dateStr } },
      update: {},
      create: {
        inventoryItemId: hotelItem.id,
        date: dateStr,
        total: 10,
        booked: 1,
        stopSell: false,
      },
    });
  }

  // 6. Seed Live Tours and Itinerary into MySQL
  for (const tour of DETAILED_TOURS) {
    const createdTour = await prisma.tour.upsert({
      where: { id: tour.id },
      update: {
        title: tour.title,
        titleEn: tour.titleEn || tour.title,
        city: tour.city,
        cityEn: tour.cityEn || null,
        country: tour.country || 'ایران',
        countryEn: tour.countryEn || 'Iran',
        durationDays: tour.durationDays,
        durationNights: tour.durationNights || Math.max(1, tour.durationDays - 1),
        price: new Prisma.Decimal(tour.price),
        childPrice: tour.childPrice ? new Prisma.Decimal(tour.childPrice) : null,
        rating: tour.rating || 5.0,
        reviewsCount: tour.reviewsCount || 0,
        category: tour.category || 'cultural',
        heroImage: tour.heroImage || null,
        gallery: (tour.gallery || []) as unknown as Prisma.InputJsonValue,
        summary: tour.summary || '',
        summaryEn: tour.summaryEn || '',
        description: tour.description || '',
        descriptionEn: tour.descriptionEn || '',
        highlights: (tour.highlights || []) as unknown as Prisma.InputJsonValue,
        includes: (tour.includes || []) as unknown as Prisma.InputJsonValue,
        excludes: (tour.excludes || []) as unknown as Prisma.InputJsonValue,
        hotelName: tour.hotelName || null,
        hotelStars: tour.hotelStars || 5,
        transportType: tour.transportType || null,
        transportTypeEn: tour.transportTypeEn || null,
        groupSize: tour.groupSize || null,
        groupSizeEn: tour.groupSizeEn || null,
        guideLanguages: (tour.guideLanguages || ['فارسی', 'English']) as unknown as Prisma.InputJsonValue,
        isPublished: true,
      },
      create: {
        id: tour.id,
        title: tour.title,
        titleEn: tour.titleEn || tour.title,
        city: tour.city,
        cityEn: tour.cityEn || null,
        country: tour.country || 'ایران',
        countryEn: tour.countryEn || 'Iran',
        durationDays: tour.durationDays,
        durationNights: tour.durationNights || Math.max(1, tour.durationDays - 1),
        price: new Prisma.Decimal(tour.price),
        childPrice: tour.childPrice ? new Prisma.Decimal(tour.childPrice) : null,
        rating: tour.rating || 5.0,
        reviewsCount: tour.reviewsCount || 0,
        category: tour.category || 'cultural',
        heroImage: tour.heroImage || null,
        gallery: (tour.gallery || []) as unknown as Prisma.InputJsonValue,
        summary: tour.summary || '',
        summaryEn: tour.summaryEn || '',
        description: tour.description || '',
        descriptionEn: tour.descriptionEn || '',
        highlights: (tour.highlights || []) as unknown as Prisma.InputJsonValue,
        includes: (tour.includes || []) as unknown as Prisma.InputJsonValue,
        excludes: (tour.excludes || []) as unknown as Prisma.InputJsonValue,
        hotelName: tour.hotelName || null,
        hotelStars: tour.hotelStars || 5,
        transportType: tour.transportType || null,
        transportTypeEn: tour.transportTypeEn || null,
        groupSize: tour.groupSize || null,
        groupSizeEn: tour.groupSizeEn || null,
        guideLanguages: (tour.guideLanguages || ['فارسی', 'English']) as unknown as Prisma.InputJsonValue,
        isPublished: true,
      },
    });

    // Departure dates
    if (tour.departureDates && tour.departureDates.length > 0) {
      await prisma.tourDepartureDate.deleteMany({ where: { tourId: createdTour.id } });
      for (const dep of tour.departureDates) {
        await prisma.tourDepartureDate.create({
          data: {
            tourId: createdTour.id,
            startDate: dep.startDate,
            endDate: dep.endDate,
            price: new Prisma.Decimal(dep.price),
            childPrice: dep.childPrice ? new Prisma.Decimal(dep.childPrice) : null,
            availableSeats: dep.availableSeats ?? 10,
            guaranteed: dep.guaranteed ?? true,
          },
        });
      }
    }

    // Itinerary days
    if (tour.itinerary && tour.itinerary.length > 0) {
      await prisma.tourItineraryDay.deleteMany({ where: { tourId: createdTour.id } });
      for (const day of tour.itinerary) {
        await prisma.tourItineraryDay.create({
          data: {
            tourId: createdTour.id,
            day: day.day,
            title: day.title,
            titleEn: day.titleEn || day.title,
            description: day.description,
            activities: (day.activities || []) as unknown as Prisma.InputJsonValue,
            breakfast: day.meals?.breakfast ?? false,
            lunch: day.meals?.lunch ?? false,
            dinner: day.meals?.dinner ?? false,
            accommodation: day.accommodation || null,
          },
        });
      }
    }
  }

  // 7. Seed Signature Experiences
  for (const [countryKey, config] of Object.entries(COUNTRIES)) {
    for (const exp of config.signatureExperiences || []) {
      const existing = await prisma.signatureExperience.findFirst({
        where: {
          countryId: countryKey,
          title: exp.title,
        },
      });

      if (!existing) {
        await prisma.signatureExperience.create({
          data: {
            countryId: countryKey,
            category: exp.category,
            title: exp.title,
            titleEn: exp.titleEn,
            desc: exp.desc,
            descEn: exp.descEn,
            where: exp.where,
            whereEn: exp.whereEn,
            when: exp.when,
            whenEn: exp.whenEn,
            fromPrice: new Prisma.Decimal(exp.fromPrice),
            image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=800',
            isActive: true,
          },
        });
      }
    }
  }

  // 8. Seed Travelogues
  const traveloguesData = [
    {
      countryId: 'turkey',
      titleFa: 'سفر سه روزه به استانبول',
      titleEn: '3-Day Istanbul Journey',
      destFa: 'استانبول، ترکیه',
      destEn: 'Istanbul, Turkey',
      userName: 'Ali Ahmadi',
      image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80',
      contentFa: 'استانبول شهری است که نیمی از آن در آسیا و نیمی دیگر در اروپا قرار دارد. در این سفر سه روزه، از مسجد ایاصوفیه، بازار بزرگ و تنگه بسفر دیدن کردیم. تجربه‌ای بی‌نظیر از تقابل سنت و مدرنیته بود. غذاهای ترکی مانند کباب و باقلوا واقعاً خوشمزه بودند.',
      contentEn: 'Istanbul is a magical metropolis where Asia meets Europe. During this 3-day trip, we explored Hagia Sophia, Grand Bazaar, and the Bosphorus strait. The blend of ancient heritage and vibrant modern life was unforgettable.',
    },
    {
      countryId: 'uae',
      titleFa: 'خاطرات سفر به دبی و برج خلیفه',
      titleEn: 'Dubai Memories & Burj Khalifa',
      destFa: 'دبی، امارات',
      destEn: 'Dubai, UAE',
      userName: 'Sara Mohammadi',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80',
      contentFa: 'دبی شهر آسمان‌خراش‌ها و تفریحات مدرن است. بازدید از برج خلیفه و سافاری در صحرا از بهترین بخش‌های این سفر بود. همچنین خرید در دبی مال و دیدن آب‌نمای دبی تجربه‌ای فراموش‌نشدنی بود.',
      contentEn: 'Dubai is the city of futuristic architecture and desert adventures. Visiting Burj Khalifa and the desert dune safari were the highlights of our journey.',
    },
    {
      countryId: 'georgia',
      titleFa: 'پاییز در کوچه‌های تاریخی تفلیس',
      titleEn: 'Autumn in Historic Tbilisi',
      destFa: 'تفلیس، گرجستان',
      destEn: 'Tbilisi, Georgia',
      userName: 'Nima Karimi',
      image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop&q=80',
      contentFa: 'تفلیس در پاییز حال و هوای دلنشینی دارد. قدم زدن در بافت تاریخی شهر قدیم، تله‌کابین ناریکالا و چشمه‌های آب گرم گوگردی از زیباترین لحظات سفر من بود.',
      contentEn: 'Tbilisi during autumn is utterly charming. Walking through the Old Town, taking the Narikala cable car, and relaxing in sulfur baths made it an incredible experience.',
    },
    {
      countryId: 'iran',
      titleFa: 'سفر به نصف جهان؛ شکوه نقش جهان و آرامش هتل عباسی',
      titleEn: 'Journey to Half the World: Naqsh-e Jahan & Abbasi Garden',
      destFa: 'اصفهان، ایران',
      destEn: 'Isfahan, Iran',
      userName: 'Reza Tehrani',
      image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
      contentFa: 'اصفهان همیشه برای من نماد اوج زیبایی هنر ایرانی بوده است. اقامت در کاروانسرای تاریخی عباسی و قدم زدن شبانه در میدان نقش جهان، احساسی بی‌همتا از آرامش به همراه دارد.',
      contentEn: 'Isfahan has always symbolized the peak of Iranian artistic elegance. Staying at the historic Abbasi caravansary and evening strolls around Naqsh-e Jahan Square offer pure tranquility.',
    },
  ];

  for (const trv of traveloguesData) {
    const existing = await prisma.travelogue.findFirst({
      where: { titleFa: trv.titleFa },
    });
    if (!existing) {
      await prisma.travelogue.create({
        data: {
          countryId: trv.countryId,
          titleFa: trv.titleFa,
          titleEn: trv.titleEn,
          destFa: trv.destFa,
          destEn: trv.destEn,
          userName: trv.userName,
          image: trv.image,
          contentFa: trv.contentFa,
          contentEn: trv.contentEn,
          likesCount: 12,
          isPublished: true,
        },
      });
    }
  }

  // 9. Seed Guide Articles
  const guideArticlesData = [
    {
      categoryFa: 'ویزا',
      categoryEn: 'Visa',
      titleFa: 'چک‌لیست سفر به ترکیه',
      titleEn: 'Turkey Travel Checklist',
      readTime: '۵ دقیقه',
      excerptFa: 'از بیمه مسافرتی اجباری تا رزرو هتل قابل استعلام — همه مدارکی که برای ورود به ترکیه لازم دارید.',
      excerptEn: 'From mandatory travel insurance to a verifiable hotel booking — every document you need to enter Turkey.',
      bodyFa: 'برای سفر به ترکیه علاوه بر پاسپورت با حداقل ۵ ماه اعتبار، توصیه می‌کنیم بیمه مسافرتی معتبر تهیه کنید. رزرو هتل و بلیت برگشت نیز ممکن است در گیت ورودی بررسی شود.',
      bodyEn: 'For travel to Turkey, besides a passport with at least 5 months of validity, we recommend holding valid travel insurance. Hotel reservations and a return ticket may also be checked at immigration.',
      image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=800',
    },
    {
      categoryFa: 'مالی',
      categoryEn: 'Finance',
      titleFa: 'راهنمای کیف پول چندارزی فیروز',
      titleEn: 'Firuzo Multi-Currency Wallet Guide',
      readTime: '۷ دقیقه',
      excerptFa: 'شارژ ریالی با شتاب، نگهداری تتر و درهم، و تبدیل لحظه‌ای با قفل نرخ ۳۰ ثانیه‌ای چگونه کار می‌کند؟',
      excerptEn: 'How Shetab rial top-ups, USDT & AED balances, and instant exchange with a 30-second rate lock work.',
      bodyFa: 'کیف پول فیروز از سه ارز ریال، تتر و درهم پشتیبانی می‌کند. شارژ ریالی از طریق درگاه شتاب انجام می‌شود و تبدیل بین ارزها با نرخ لحظه‌ای و قفل ۳۰ ثانیه‌ای صورت می‌گیرد.',
      bodyEn: 'The Firuzo wallet supports three currencies: IRR, USDT and AED. Rial top-ups go through the Shetab gateway, and exchanges between currencies use live rates with a 30-second lock.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=75&w=800',
    },
  ];

  for (const guide of guideArticlesData) {
    const existing = await prisma.guideArticle.findFirst({
      where: { titleFa: guide.titleFa },
    });
    if (!existing) {
      await prisma.guideArticle.create({
        data: {
          categoryFa: guide.categoryFa,
          categoryEn: guide.categoryEn,
          titleFa: guide.titleFa,
          titleEn: guide.titleEn,
          readTime: guide.readTime,
          excerptFa: guide.excerptFa,
          excerptEn: guide.excerptEn,
          bodyFa: guide.bodyFa,
          bodyEn: guide.bodyEn,
          image: guide.image,
          isPublished: true,
        },
      });
    }
  }

  console.log('Seed completed successfully:', {
    admin: admin.email,
    user: user.email,
    chartAccountsCount: chartAccounts.length,
    taxRulesCount: irTaxRules.length,
    permissionsCount: allPermissions.size,
    toursCount: DETAILED_TOURS.length,
    experiencesCount: Object.values(COUNTRIES).flatMap((c) => c.signatureExperiences || []).length,
  });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
