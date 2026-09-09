import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cards = [
    {
      id: 'card_saman_01',
      bankName: 'بانک سامان',
      accountHolder: 'شرکت خدمات مسافرت هوایی و جهانگردی فیروزو',
      cardNumber: '6219861912345678',
      iban: 'IR120560000000123456789012',
      isActive: true,
      sortOrder: 1,
      note: 'حساب اصلی شرکتی - واریز آنی و تایید سریع',
    },
    {
      id: 'card_pasargad_02',
      bankName: 'بانک پاسارگاد',
      accountHolder: 'شرکت سفرهای گردشگری فیروزو',
      cardNumber: '5022291087654321',
      iban: 'IR980570000000876543210987',
      isActive: true,
      sortOrder: 2,
      note: 'حساب پشتیبان - مناسب پایا و ساتنا',
    },
    {
      id: 'card_mellat_03',
      bankName: 'بانک ملت',
      accountHolder: 'فیروزو تراول (حساب بازرگانی)',
      cardNumber: '6104337890123456',
      iban: 'IR440120000000789012345678',
      isActive: true,
      sortOrder: 3,
      note: 'حساب ملت - واریز درون‌بانکی سریع',
    },
  ];

  for (const card of cards) {
    await prisma.destinationBankCard.upsert({
      where: { id: card.id },
      update: card,
      create: card,
    });
    console.log(`Bank card seeded: ${card.bankName} (${card.cardNumber})`);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding bank cards:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
