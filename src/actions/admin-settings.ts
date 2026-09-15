'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/domains/identity/permission-service';
import { ProductionSmsProvider } from '@/domains/events/providers/ProductionSmsProvider';

export interface SmsSettingsDto {
  activeProvider: 'kavenegar' | 'farazsms' | 'smswbs';
  kavenegarApiKey: string;
  farazSmsApiKey: string;
  smswbsUsername: string;
  smswbsPasswordMasked: boolean;
  defaultSender: string;
  otpTemplate: string;
  bookingPaidTemplate: string;
  ticketReplyTemplate: string;
  hasEnvKey: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface GeneralPlatformSettingsDto {
  siteTitle: string;
  supportPhone: string;
  supportPhoneDisplay: string;
  supportEmail: string;
  telegramBotUsername: string;
  defaultCurrency: 'IRR' | 'TOMAN' | 'USDT' | 'AED';
  maintenanceMode: boolean;
  standardTaxPercentage: number;
}

export interface BankCardAdminItem {
  id: string;
  bankName: string;
  accountHolder: string;
  cardNumber: string;
  iban: string | null;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
  receiptsCount: number;
  createdAt: string;
}

export interface CryptoWalletAdminItem {
  id: string;
  network: string;
  currency: string;
  walletAddress: string;
  networkLabel: string;
  memoOrTag: string | null;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
  receiptsCount: number;
  createdAt: string;
}

const SMS_SETTINGS_KEY = 'system:sms_settings';
const GENERAL_SETTINGS_KEY = 'system:general_settings';

// ==================== 1. SMS Settings Actions ====================

export async function getSmsSettingsAction(): Promise<{
  success: boolean;
  settings: SmsSettingsDto;
  recentLogs: Array<{ id: string; eventType: string; status: string; createdAt: string; payload: string }>;
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);

    const record = await prisma.siteContent.findUnique({
      where: { key: SMS_SETTINGS_KEY },
    });

    let saved: Partial<SmsSettingsDto> = {};
    if (record?.payload) {
      try {
        saved = JSON.parse(record.payload);
      } catch {}
    }

    const hasEnv = Boolean(
      process.env.KAVENEGAR_API_KEY ||
      process.env.FARAZ_SMS_API_KEY ||
      (process.env.SMSWBS_USERNAME && process.env.SMSWBS_PASSWORD)
    );

    const settings: SmsSettingsDto = {
      activeProvider: saved.activeProvider || (process.env.SMSWBS_USERNAME ? 'smswbs' : process.env.FARAZ_SMS_API_KEY ? 'farazsms' : 'kavenegar'),
      kavenegarApiKey: saved.kavenegarApiKey || (process.env.KAVENEGAR_API_KEY ? '••••••••' + process.env.KAVENEGAR_API_KEY.slice(-4) : ''),
      farazSmsApiKey: saved.farazSmsApiKey || (process.env.FARAZ_SMS_API_KEY ? '••••••••' + process.env.FARAZ_SMS_API_KEY.slice(-4) : ''),
      smswbsUsername: saved.smswbsUsername || process.env.SMSWBS_USERNAME || '',
      smswbsPasswordMasked: Boolean(process.env.SMSWBS_PASSWORD),
      defaultSender: saved.defaultSender || process.env.KAVENEGAR_SENDER || '10008888',
      otpTemplate: saved.otpTemplate || 'verify_otp',
      bookingPaidTemplate: saved.bookingPaidTemplate || 'booking_confirm',
      ticketReplyTemplate: saved.ticketReplyTemplate || 'ticket_reply',
      hasEnvKey: hasEnv,
      updatedAt: record?.updatedAt.toISOString(),
      updatedBy: record?.updatedBy || undefined,
    };

    // Get recent Outbox SMS events
    const recentLogs = await prisma.outboxEvent.findMany({
      where: {
        eventType: { in: ['AUTH_OTP_REQUESTED', 'BOOKING_PAID', 'TICKET_CREATED', 'TICKET_REPLIED', 'NOTIFICATION_SENT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, eventType: true, status: true, createdAt: true, payload: true },
    });

    return {
      success: true,
      settings,
      recentLogs: recentLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    return {
      success: false,
      settings: {
        activeProvider: 'kavenegar',
        kavenegarApiKey: '',
        farazSmsApiKey: '',
        smswbsUsername: '',
        smswbsPasswordMasked: false,
        defaultSender: '10008888',
        otpTemplate: 'verify_otp',
        bookingPaidTemplate: 'booking_confirm',
        ticketReplyTemplate: 'ticket_reply',
        hasEnvKey: false,
      },
      recentLogs: [],
      error: err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات پیامک',
    };
  }
}

export async function saveSmsSettingsAction(data: {
  activeProvider: 'kavenegar' | 'farazsms' | 'smswbs';
  defaultSender: string;
  otpTemplate: string;
  bookingPaidTemplate: string;
  ticketReplyTemplate: string;
  customApiKey?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['user:manage']);

    const record = await prisma.siteContent.findUnique({
      where: { key: SMS_SETTINGS_KEY },
    });

    let current: Record<string, unknown> = {};
    if (record?.payload) {
      try {
        current = JSON.parse(record.payload);
      } catch {}
    }

    const updated = {
      ...current,
      activeProvider: data.activeProvider,
      defaultSender: data.defaultSender.trim(),
      otpTemplate: data.otpTemplate.trim(),
      bookingPaidTemplate: data.bookingPaidTemplate.trim(),
      ticketReplyTemplate: data.ticketReplyTemplate.trim(),
      ...(data.customApiKey?.trim()
        ? data.activeProvider === 'kavenegar'
          ? { kavenegarApiKey: data.customApiKey.trim() }
          : { farazSmsApiKey: data.customApiKey.trim() }
        : {}),
    };

    await prisma.siteContent.upsert({
      where: { key: SMS_SETTINGS_KEY },
      create: {
        key: SMS_SETTINGS_KEY,
        payload: JSON.stringify(updated),
        updatedBy: admin.email || admin.id,
      },
      update: {
        payload: JSON.stringify(updated),
        updatedBy: admin.email || admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'SMS_SETTINGS_UPDATED',
        resource: 'SiteContent',
        resourceId: SMS_SETTINGS_KEY,
        newData: JSON.stringify({ activeProvider: data.activeProvider, sender: data.defaultSender }),
        reason: `Admin updated SMS Gateway configurations to ${data.activeProvider}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات' };
  }
}

export async function sendTestSmsAction(params: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const admin = await requirePermission(['user:manage', 'ops:override:cancel']);

    const cleanPhone = params.phone.trim().replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'شماره همراه نامعتبر است' };
    }
    if (!params.message.trim()) {
      return { success: false, error: 'متن پیام الزامی است' };
    }

    // 1. Check if live credentials exist
    const provider = new ProductionSmsProvider();
    const result = await provider.sendSms(cleanPhone, params.message.trim());

    // 2. Audit log the test send
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'TEST_SMS_SENT',
        resource: 'SMS',
        resourceId: cleanPhone,
        newData: JSON.stringify({ result, messageLength: params.message.length }),
        reason: `Operator ${admin.email || admin.id} performed gateway diagnostic test`,
      },
    });

    if (result.status === 'FAILED') {
      return { success: false, error: result.error || 'ارسال با خطا مواجه شد' };
    }

    return { success: true, messageId: result.messageId };
  } catch (err: unknown) {
    console.error('[sendTestSmsAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ارتباط با وب‌سرویس پیامک' };
  }
}

// ==================== 2. General Platform Settings ====================

export async function getGeneralPlatformSettingsAction(): Promise<{
  success: boolean;
  settings: GeneralPlatformSettingsDto;
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);

    const record = await prisma.siteContent.findUnique({
      where: { key: GENERAL_SETTINGS_KEY },
    });

    let saved: Partial<GeneralPlatformSettingsDto> = {};
    if (record?.payload) {
      try {
        saved = JSON.parse(record.payload);
      } catch {}
    }

    const settings: GeneralPlatformSettingsDto = {
      siteTitle: saved.siteTitle || 'پلتفرم جامع سفر و گردشگری فیروزو (iTrip)',
      supportPhone: saved.supportPhone || '+982191000000',
      supportPhoneDisplay: saved.supportPhoneDisplay || '۰۲۱-۹۱۰۰۰۰۰۰',
      supportEmail: saved.supportEmail || 'support@firuzo.com',
      telegramBotUsername: saved.telegramBotUsername || 'firuzo_bot',
      defaultCurrency: saved.defaultCurrency || 'IRR',
      maintenanceMode: saved.maintenanceMode || false,
      standardTaxPercentage: saved.standardTaxPercentage !== undefined ? saved.standardTaxPercentage : 9,
    };

    return { success: true, settings };
  } catch (err: unknown) {
    return {
      success: false,
      settings: {
        siteTitle: 'پلتفرم گردشگری فیروزو',
        supportPhone: '+982191000000',
        supportPhoneDisplay: '۰۲۱-۹۱۰۰۰۰۰۰',
        supportEmail: 'support@firuzo.com',
        telegramBotUsername: 'firuzo_bot',
        defaultCurrency: 'IRR',
        maintenanceMode: false,
        standardTaxPercentage: 9,
      },
      error: err instanceof Error ? err.message : 'خطا در دریافت تنظیمات عمومی',
    };
  }
}

export async function saveGeneralPlatformSettingsAction(
  data: GeneralPlatformSettingsDto
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['user:manage']);

    await prisma.siteContent.upsert({
      where: { key: GENERAL_SETTINGS_KEY },
      create: {
        key: GENERAL_SETTINGS_KEY,
        payload: JSON.stringify(data),
        updatedBy: admin.email || admin.id,
      },
      update: {
        payload: JSON.stringify(data),
        updatedBy: admin.email || admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'GENERAL_SETTINGS_UPDATED',
        resource: 'SiteContent',
        resourceId: GENERAL_SETTINGS_KEY,
        newData: JSON.stringify(data),
        reason: `General settings modified by ${admin.email || admin.id}`,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات عمومی' };
  }
}

// ==================== 3. Bank Cards CRUD ====================

export async function getAdminBankCardsAction(): Promise<{
  success: boolean;
  cards: BankCardAdminItem[];
  error?: string;
}> {
  try {
    await requirePermission(['finance:view', 'user:manage']);

    const cards = await prisma.destinationBankCard.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { receipts: true } },
      },
    });

    return {
      success: true,
      cards: cards.map((c) => ({
        id: c.id,
        bankName: c.bankName,
        accountHolder: c.accountHolder,
        cardNumber: c.cardNumber,
        iban: c.iban,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        note: c.note,
        receiptsCount: c._count.receipts,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    return { success: false, cards: [], error: err instanceof Error ? err.message : 'خطا در دریافت کارت‌ها' };
  }
}

export async function createDestinationBankCardAction(data: {
  bankName: string;
  accountHolder: string;
  cardNumber: string;
  iban?: string;
  note?: string;
  sortOrder?: number;
}): Promise<{ success: boolean; cardId?: string; error?: string }> {
  try {
    const admin = await requirePermission(['finance:view', 'user:manage']);

    if (!data.bankName.trim() || !data.accountHolder.trim() || !data.cardNumber.trim()) {
      return { success: false, error: 'نام بانک، نام دارنده و شماره کارت الزامی است' };
    }

    const cleanCard = data.cardNumber.replace(/[^0-9]/g, '');
    if (cleanCard.length !== 16) {
      return { success: false, error: 'شماره کارت باید ۱۶ رقم باشد' };
    }

    const created = await prisma.destinationBankCard.create({
      data: {
        bankName: data.bankName.trim(),
        accountHolder: data.accountHolder.trim(),
        cardNumber: cleanCard,
        iban: data.iban?.trim() || null,
        note: data.note?.trim() || null,
        sortOrder: data.sortOrder || 0,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DESTINATION_BANK_CARD_CREATED',
        resource: 'DestinationBankCard',
        resourceId: created.id,
        newData: JSON.stringify({ bank: created.bankName, holder: created.accountHolder }),
        reason: `New destination card created by ${admin.email || admin.id}`,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/finance/receipts');
    return { success: true, cardId: created.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در تعریف کارت بانکی' };
  }
}

export async function updateDestinationBankCardAction(
  id: string,
  data: {
    bankName: string;
    accountHolder: string;
    cardNumber: string;
    iban?: string;
    note?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['finance:view', 'user:manage']);

    await prisma.destinationBankCard.update({
      where: { id },
      data: {
        bankName: data.bankName.trim(),
        accountHolder: data.accountHolder.trim(),
        cardNumber: data.cardNumber.replace(/[^0-9]/g, ''),
        iban: data.iban?.trim() || null,
        note: data.note?.trim() || null,
        sortOrder: data.sortOrder,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DESTINATION_BANK_CARD_UPDATED',
        resource: 'DestinationBankCard',
        resourceId: id,
        newData: JSON.stringify(data),
        reason: `Card updated by ${admin.email || admin.id}`,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/finance/receipts');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ویرایش کارت' };
  }
}

export async function toggleDestinationBankCardActiveAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['finance:view', 'user:manage']);

    await prisma.destinationBankCard.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/finance/receipts');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در تغییر وضعیت کارت' };
  }
}

export async function deleteDestinationBankCardAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['user:manage']);

    const card = await prisma.destinationBankCard.findUnique({
      where: { id },
      include: { _count: { select: { receipts: true } } },
    });

    if (!card) {
      return { success: false, error: 'کارت یافت نشد' };
    }

    if (card._count.receipts > 0) {
      // Deactivate instead of hard delete to preserve financial FK integrity
      await prisma.destinationBankCard.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true };
    }

    await prisma.destinationBankCard.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DESTINATION_BANK_CARD_DELETED',
        resource: 'DestinationBankCard',
        resourceId: id,
        reason: `Card deleted by ${admin.email || admin.id}`,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/finance/receipts');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در حذف کارت' };
  }
}

// ==================== 4. Crypto Wallets CRUD ====================

export async function getAdminCryptoWalletsAction(): Promise<{
  success: boolean;
  wallets: CryptoWalletAdminItem[];
  error?: string;
}> {
  try {
    await requirePermission(['finance:view', 'user:manage']);

    const wallets = await prisma.destinationCryptoWallet.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { receipts: true } } },
    });

    return {
      success: true,
      wallets: wallets.map((w) => ({
        id: w.id,
        network: w.network,
        currency: w.currency,
        walletAddress: w.walletAddress,
        networkLabel: w.networkLabel,
        memoOrTag: w.memoOrTag,
        isActive: w.isActive,
        sortOrder: w.sortOrder,
        note: w.note,
        receiptsCount: w._count.receipts,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    return { success: false, wallets: [], error: err instanceof Error ? err.message : 'خطا در دریافت ولت‌ها' };
  }
}

export async function createDestinationCryptoWalletAction(data: {
  network: string;
  currency: string;
  walletAddress: string;
  networkLabel: string;
  memoOrTag?: string;
  note?: string;
  sortOrder?: number;
}): Promise<{ success: boolean; walletId?: string; error?: string }> {
  try {
    const admin = await requirePermission(['finance:view', 'user:manage']);

    if (!data.network.trim() || !data.walletAddress.trim()) {
      return { success: false, error: 'شبکه و آدرس ولت الزامی است' };
    }

    const created = await prisma.destinationCryptoWallet.create({
      data: {
        network: data.network.trim().toUpperCase(),
        currency: data.currency.trim().toUpperCase() || 'USDT',
        walletAddress: data.walletAddress.trim(),
        networkLabel: data.networkLabel.trim() || `${data.network} Network`,
        memoOrTag: data.memoOrTag?.trim() || null,
        note: data.note?.trim() || null,
        sortOrder: data.sortOrder || 0,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DESTINATION_CRYPTO_WALLET_CREATED',
        resource: 'DestinationCryptoWallet',
        resourceId: created.id,
        newData: JSON.stringify({ network: created.network, address: created.walletAddress }),
        reason: `New crypto receiving address added by ${admin.email || admin.id}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true, walletId: created.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در افزودن ولت رمزارز' };
  }
}

export async function toggleDestinationCryptoWalletActiveAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['finance:view', 'user:manage']);

    await prisma.destinationCryptoWallet.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'خطا در تغییر وضعیت ولت' };
  }
}
