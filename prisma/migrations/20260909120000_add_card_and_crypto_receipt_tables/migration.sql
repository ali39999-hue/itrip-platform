-- CreateTable
CREATE TABLE "DestinationBankCard" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "iban" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationBankCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTransferReceipt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "bankCardId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "trackingCode" TEXT,
    "paymentDate" TIMESTAMP(3),
    "customerNote" TEXT,
    "receiptImages" TEXT NOT NULL,
    "nationalIdImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTransferReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationCryptoWallet" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "walletAddress" TEXT NOT NULL,
    "networkLabel" TEXT NOT NULL,
    "memoOrTag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationCryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoPaymentReceipt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "cryptoWalletId" TEXT,
    "network" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "amountUsdt" DECIMAL(65,30) NOT NULL,
    "amountIrr" DECIMAL(65,30) NOT NULL,
    "fxRate" DECIMAL(65,30) NOT NULL,
    "txHash" TEXT NOT NULL,
    "senderAddress" TEXT,
    "receiptImage" TEXT,
    "onChainVerified" BOOLEAN NOT NULL DEFAULT false,
    "onChainData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoPaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestinationBankCard_isActive_idx" ON "DestinationBankCard"("isActive");

-- CreateIndex
CREATE INDEX "CardTransferReceipt_bookingId_idx" ON "CardTransferReceipt"("bookingId");

-- CreateIndex
CREATE INDEX "CardTransferReceipt_status_idx" ON "CardTransferReceipt"("status");

-- CreateIndex
CREATE INDEX "DestinationCryptoWallet_isActive_idx" ON "DestinationCryptoWallet"("isActive");

-- CreateIndex
CREATE INDEX "DestinationCryptoWallet_network_idx" ON "DestinationCryptoWallet"("network");

-- CreateIndex
CREATE INDEX "CryptoPaymentReceipt_bookingId_idx" ON "CryptoPaymentReceipt"("bookingId");

-- CreateIndex
CREATE INDEX "CryptoPaymentReceipt_txHash_idx" ON "CryptoPaymentReceipt"("txHash");

-- CreateIndex
CREATE INDEX "CryptoPaymentReceipt_status_idx" ON "CryptoPaymentReceipt"("status");

-- AddForeignKey
ALTER TABLE "CardTransferReceipt" ADD CONSTRAINT "CardTransferReceipt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransferReceipt" ADD CONSTRAINT "CardTransferReceipt_bankCardId_fkey" FOREIGN KEY ("bankCardId") REFERENCES "DestinationBankCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoPaymentReceipt" ADD CONSTRAINT "CryptoPaymentReceipt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoPaymentReceipt" ADD CONSTRAINT "CryptoPaymentReceipt_cryptoWalletId_fkey" FOREIGN KEY ("cryptoWalletId") REFERENCES "DestinationCryptoWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
