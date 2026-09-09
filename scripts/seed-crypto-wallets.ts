import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wallets = [
    {
      id: 'wallet_usdt_trc20',
      network: 'TRC20',
      currency: 'USDT',
      networkLabel: 'تتر شبکه ترون (TRC-20)',
      walletAddress: 'TEUmkCf2xGRCK6MioviueSPtgUBjUSK9M3',
      memoOrTag: null,
      isActive: true,
      sortOrder: 1,
      note: 'کیف پول اصلی دریافت تتر (TRC-20) فیروزو - کمترین کارمزد و بالاترین سرعت انتقال',
    },
    {
      id: 'wallet_usdt_solana',
      network: 'SOLANA',
      currency: 'USDT',
      networkLabel: 'تتر شبکه سولانا (Solana / SPL)',
      walletAddress: '4jp2BfZugv9ZnRFm4ggztBbN8MPt6Q2wRxoTeXskuZH2',
      memoOrTag: null,
      isActive: true,
      sortOrder: 2,
      note: 'کیف پول تتر بر بستر شبکه پرسرعت سولانا (SPL)',
    },
  ];

  // Remove any obsolete demo wallets
  await prisma.destinationCryptoWallet.deleteMany({
    where: {
      id: { notIn: wallets.map((w) => w.id) },
    },
  });

  for (const wallet of wallets) {
    await prisma.destinationCryptoWallet.upsert({
      where: { id: wallet.id },
      update: wallet,
      create: wallet,
    });
  }
}

main()
  .catch((e) => {
    console.error('Error seeding crypto wallets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
