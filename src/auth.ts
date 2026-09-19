import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ERP_STAFF_ROLES } from '@/domains/identity/permissions';
import { encryptSensitive } from '@/lib/security/crypto-vault';
import { createLogger } from '@/lib/observability/logger';
import { isDemoMode } from '@/lib/runtime-mode';
import { ProductionTelegramProvider, TelegramAuthPayload } from '@/domains/events/providers/ProductionTelegramProvider';
import { getNotificationProvider } from '@/domains/events/NotificationProvider';
import { ProductionWhatsappProvider } from '@/domains/events/providers/ProductionWhatsappProvider';
import { ProductionSmswbsProvider, normalizeToIranE164 } from '@/domains/events/providers/ProductionSmswbsProvider';
import WeChatProvider from 'next-auth/providers/wechat';

const authLogger = createLogger('auth-service');

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
  interface User {
    role: string;
  }
}

let secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret) {
  // During static build collection (e.g. on CI / Vercel build phase), fall back gracefully so next build succeeds.
  // In runtime production, fail closed immediately.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error('FATAL SECURITY ERROR: AUTH_SECRET or NEXTAUTH_SECRET must be configured in production.');
  }
  secret = 'dev-only-insecure-secret-never-use-in-production';
}
const resolvedSecret = secret;

/**
 * Demo-mode gate (AUTH-005): evaluated fresh on every call — never snapshotted
 * at module scope, so later env mutations (config loaders, per-test setup)
 * always take effect.
 */
const DEMO_MODE = () => isDemoMode();
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

/**
 * SECURITY (AUTH-003): a one-time passcode must never be echoed back to the
 * client, and OTP state must never live only in process memory, unless we are
 * explicitly in demo mode outside production.
 *
 * The previous implementation also enabled the echo whenever `VERCEL` (or any
 * `*_VERCEL_ENV`) was present. That env var is always set on Vercel — i.e. in
 * production too — so any SMS/email outage silently turned into "show the login
 * code in the browser and pre-fill it", which is a full authentication bypass
 * for every account (including admins).
 */
/**
 * SECURITY (AUTH-003/AUTH-005): a one-time passcode must never be echoed back to
 * the client, and OTP state must never live only in process memory, unless we
 * are explicitly in demo mode outside production.
 */
const DEV_OTP_VISIBLE = () => DEMO_MODE();
const ALLOW_IN_MEMORY_OTP_FALLBACK = () => DEMO_MODE();

/**
 * Whether any real SMS provider is configured. When true, OTP delivery failures
 * must surface as real errors — never silently degrade to the dev simulator.
 */
function hasRealSmsProvider(): boolean {
  return Boolean(
    (process.env.SMSWBS_USERNAME && process.env.SMSWBS_PASSWORD) ||
    process.env.KAVENEGAR_API_KEY ||
    process.env.SMS_PROVIDER_API_KEY ||
    process.env.FARAZ_SMS_API_KEY
  );
}

/**
 * Normalizes user identifier input by converting Persian and Arabic numerals to English ASCII numerals.
 */
export function normalizeIdentifier(input: string): string {
  if (!input) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let str = String(input).trim();
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  return str;
}

/**
 * Returns candidate phone formats for database lookup (e.g. 0912..., +98912..., 912...).
 */
export function getPhoneLookupCandidates(phoneInput: string): string[] {
  const cleaned = normalizeIdentifier(phoneInput).replace(/[\s\-\(\)]/g, '');
  const candidates = new Set<string>([cleaned]);
  if (cleaned.startsWith('+98')) {
    candidates.add('0' + cleaned.slice(3));
    candidates.add(cleaned.slice(3));
  } else if (cleaned.startsWith('0098')) {
    candidates.add('0' + cleaned.slice(4));
    candidates.add(cleaned.slice(4));
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    candidates.add('0' + cleaned.slice(2));
    candidates.add('+' + cleaned);
  } else if (cleaned.startsWith('09') && cleaned.length === 11) {
    candidates.add('+98' + cleaned.slice(1));
    candidates.add(cleaned.slice(1));
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    candidates.add('0' + cleaned);
    candidates.add('+98' + cleaned);
  }
  return Array.from(candidates);
}

/**
 * Demo-only bootstrap identifiers (AUTH-002 / SEC-013).
 *
 * These constants are NEVER a production privilege authority. They exist so a
 * fresh dev/demo database has a predictable bootstrap account; in production the
 * lists come exclusively from ADMIN_EMAILS / ADMIN_PHONES. A published constant
 * must not be able to mint a SUPER_ADMIN session (see admin-login tests).
 */
export const DEMO_ADMIN_PHONES = [
  '09120000000',
  '09123456789',
  '09304064124',
  '09127925583',
  '09105247414',
];
/** @deprecated Demo alias kept for backwards-compatible imports (tests). Use DEMO_ADMIN_PHONES. */
export const DEFAULT_ADMIN_PHONES = DEMO_ADMIN_PHONES;
export const DEMO_ADMIN_EMAILS = ['admin@firuzo.com'];

export function getAdminPhones(): string[] {
  const envPhones = (process.env.ADMIN_PHONES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set([...(DEMO_MODE() ? DEMO_ADMIN_PHONES : []), ...envPhones]));
}

export function getAdminEmails(): string[] {
  const envEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...(DEMO_MODE() ? DEMO_ADMIN_EMAILS : []), ...envEmails]));
}

/**
 * Returns true when the identifier is a *bootstrap* admin identifier.
 *
 * SECURITY: this is a routing hint only — it decides whether the bootstrap
 * repair path may be attempted. It NEVER grants a role on its own: the caller
 * must still prove the deployment's ADMIN_PASSWORD (bcrypt-verified) and the
 * resulting identity always comes from the database row.
 */
export function isKnownAdminIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  const clean = normalizeIdentifier(identifier).trim().toLowerCase();
  if (!clean) return false;
  if (getAdminEmails().includes(clean)) return true;
  const adminPhones = getAdminPhones();
  if (adminPhones.length === 0) return false;
  return getPhoneLookupCandidates(clean).some((cand) => adminPhones.includes(cand));
}

/**
 * The admin bootstrap password (AUTH-002).
 *
 * There is deliberately NO hardcoded fallback in production: a default password
 * committed to the repository would let anyone authenticate as SUPER_ADMIN on
 * any deployment where ADMIN_PASSWORD is unset. Bootstrap therefore fails closed
 * — the caller treats a `null` return as "no bootstrap available" and denies the
 * privileged action.
 */
export function getAdminBootstrapPassword(): string | null {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (DEMO_MODE()) return 'firuzo-demo-admin-only';
  return null;
}

export async function ensureAdminUserInDatabase(preferredEmail = 'admin@firuzo.com', phone?: string) {
  try {
    const password = getAdminBootstrapPassword();
    if (!password) {
      authLogger.error('Admin bootstrap refused: ADMIN_PASSWORD is not configured (fail closed).', {
        preferredEmail,
      });
      return null;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const targetEmail = preferredEmail.includes('@') ? preferredEmail : 'admin@firuzo.com';

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetEmail },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: targetEmail,
          phone: phone || '09120000000',
          name: 'مدیر ارشد فیروزو',
          firstNameFa: 'مدیر',
          lastNameFa: 'ارشد',
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'SUPER_ADMIN',
          passwordHash: user.passwordHash || passwordHash,
          isActive: true,
        },
      });
    }

    await ensureUserRole(user.id, 'SUPER_ADMIN');
    return user;
  } catch (err) {
    console.warn('[ensureAdminUserInDatabase] Admin bootstrap notice:', err);
    return null;
  }
}

function hashOtp(code: string): string {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET ?? resolvedSecret).update(code).digest('hex');
}

/**
 * Issues a one-time passcode for the given identifier.
 * Returns the plaintext code ONLY in demo mode so the dev UI can display it.
 */
// In-memory fallback for development when database is unseeded or temporarily unreachable
interface InMemoryOtp {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}
const inMemoryOtpStore = new Map<string, InMemoryOtp>();

export async function issueOtp(
  identifier: string,
  channel: string
): Promise<{ sent: boolean; realSent: boolean; devCode?: string; provider?: string; error?: string }> {
  const isIranMobile = channel === 'phone' && Boolean(normalizeToIranE164(identifier));
  
  let code = String(crypto.randomInt(100000, 999999));
  let realSent = false;
  let providerUsed = 'console-simulator';
  let dispatchError: string | undefined;

  // 1. Direct SMSWBS OTP integration for Iranian numbers (+98)
  if (isIranMobile) {
    try {
      const smswbs = new ProductionSmswbsProvider();
      const res = await smswbs.sendOtp(identifier, 'کد تایید ورود به فیروزو');
      if (res.success && res.code) {
        code = res.code; // Use the exact 4-digit code generated and dispatched by SMSWBS
        realSent = true;
        providerUsed = 'smswbs-otp';
      } else if (res.success && res.alreadySent) {
        realSent = true;
        providerUsed = 'smswbs-otp-active';
      } else if (!res.success && res.error) {
        dispatchError = res.error;
        console.warn('[issueOtp] SMSWBS OTP returned error:', res.error);
      }
    } catch (smswbsErr: unknown) {
      const err = smswbsErr instanceof Error ? smswbsErr.message : String(smswbsErr);
      dispatchError = err;
      console.warn('[issueOtp] SMSWBS OTP dispatch failed:', err);
    }

    // Fallback if SMSWBS was not successful (upstream 502, timeout, or outage)
    if (!realSent) {
      try {
        const notificationProvider = getNotificationProvider();
        const otpMessage = `کد تایید ورود به فیروزو: ${code}\nاعتبار: ۵ دقیقه`;
        const dispatch = await notificationProvider.sendSms(identifier, otpMessage);
        if (dispatch?.success && dispatch.provider !== 'console-simulator') {
          realSent = true;
          providerUsed = dispatch.provider;
          dispatchError = undefined;
        } else if (
          dispatch?.success &&
          dispatch.provider === 'console-simulator' &&
          !hasRealSmsProvider() &&
          DEMO_MODE()
        ) {
          // No real SMS provider exists at all AND we are explicitly in demo mode
          // outside production — safe dev simulation is the honest path.
          providerUsed = 'console-simulator';
          dispatchError = undefined;
        }
        // When a real provider IS configured but delivery failed, keep dispatchError:
        // callers fail closed with the actual error instead of degrading login to a demo box.
      } catch (fallbackErr) {
        console.warn('[issueOtp] SMS fallback notice:', fallbackErr);
      }
    }
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const codeHash = hashOtp(code);

  // 1. Store in database with outbox event
  try {
    await prisma.otpVerification.create({
      data: {
        identifier,
        channel,
        codeHash,
        expiresAt,
      },
    });

    await prisma.outboxEvent.create({
      data: {
        eventType: 'AUTH_OTP_REQUESTED',
        payload: JSON.stringify({
          identifier,
          channel,
          codeHash,
          codeEnc: encryptSensitive(code),
          expiresAt: expiresAt.toISOString(),
        }),
      },
    });

    // Housekeeping: drop rows that expired more than a day ago.
    await prisma.otpVerification.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  } catch (dbErr) {
    if (!ALLOW_IN_MEMORY_OTP_FALLBACK()) {
      // Production fail-closed: without DB persistence the OTP cannot be stored
      // or verified durably, so we must not pretend it was issued.
      authLogger.error('OTP persistence failed and in-memory fallback is disabled (fail closed).', {
        identifier,
        channel,
      });
      return { sent: false, realSent: false, provider: providerUsed, error: 'OTP_STORAGE_UNAVAILABLE' };
    }
    console.warn('[issueOtp] Database unreachable for OTP persistence (fallback to in-memory):', dbErr);
  }

  // 2. Also keep in fast in-memory cache (demo/dev only — see AUTH-003)
  if (ALLOW_IN_MEMORY_OTP_FALLBACK()) {
    inMemoryOtpStore.set(identifier, {
      codeHash,
      expiresAt,
      attempts: 0,
    });
  }

  if (!isIranMobile) {
    try {
      const notificationProvider = getNotificationProvider();
      const otpMessage = `به فیروزو خوش آمدید \n کد ورود شما : ${code}`;
      let dispatch;

      if (channel === 'bale') {
        dispatch = await notificationProvider.sendBale(identifier, otpMessage);
      } else if (channel === 'telegram') {
        dispatch = await notificationProvider.sendTelegram(identifier, otpMessage);
      } else if (channel === 'whatsapp') {
        // Business-initiated WhatsApp messages outside the 24-hour service window
        // MUST use a pre-approved template, so try the OTP template first and fall
        // back to free-form (which still works inside an open customer session).
        const whatsapp = new ProductionWhatsappProvider();
        dispatch = await whatsapp.sendWhatsAppOtp(identifier, code);
        if (!dispatch.success) {
          dispatch = await notificationProvider.sendWhatsApp(identifier, otpMessage);
        }
      } else if (channel === 'wechat') {
        // WeChat has no generic message API for arbitrary IDs. If the identifier is
        // a phone number, SMS delivery is still possible; otherwise direct the user
        // to the WeChat QR login (the only reliable WeChat authentication path).
        const looksLikePhone = /^\+?\d{8,15}$/.test(identifier.replace(/[\s-]/g, ''));
        if (looksLikePhone) {
          dispatch = await notificationProvider.sendSms(identifier, otpMessage);
        } else {
          dispatch = {
            success: false,
            error: 'WECHAT_QR_REQUIRED',
            provider: 'wechat-qr-guidance',
          };
        }
      } else if (channel === 'email' || (identifier && identifier.includes('@') && !identifier.startsWith('@'))) {
        dispatch = await notificationProvider.sendEmail(identifier, 'کد تایید ورود به فیروزو', otpMessage);
      } else {
        dispatch = await notificationProvider.sendSms(identifier, otpMessage);
      }

      if (dispatch?.success && dispatch.provider !== 'console-simulator') {
        realSent = true;
        providerUsed = dispatch.provider;
      } else if (!dispatch?.success && dispatch?.error) {
        dispatchError = dispatch.error;
      }
    } catch (dispatchErr: unknown) {
      const errMsg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
      dispatchError = errMsg;
      console.warn('[issueOtp] Instant notification dispatch notice:', errMsg);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    authLogger.info('Issued OTP for testing', { identifier, channel, otp: code, realSent, provider: providerUsed });
  }

  return {
    // `sent` reflects an actual dispatch: a simulated/blocked delivery must not
    // be reported as a successful send (Product Truth, §11).
    sent: realSent || DEV_OTP_VISIBLE(),
    realSent,
    provider: providerUsed,
    error: dispatchError,
    devCode: DEV_OTP_VISIBLE() && !realSent && providerUsed === 'console-simulator' ? code : undefined,
  };
}

/** Verifies and consumes a stored OTP via SMSWBS API, Database, and in-memory cache. */
async function verifyStoredOtp(identifier: string, code: string): Promise<boolean> {
  const cleanCode = normalizeIdentifier(code).trim();
  const codeHash = hashOtp(cleanCode);
  const isIranMobile = Boolean(normalizeToIranE164(identifier));

  // 1. Direct validation via SMSWBS check_OTP API for Iranian mobile numbers
  if (isIranMobile) {
    try {
      const smswbs = new ProductionSmswbsProvider();
      const checkRes = await smswbs.checkOtp(identifier, cleanCode);
      if (checkRes.valid) {
        inMemoryOtpStore.delete(identifier);
        // Consume the persisted row too so it cannot be replayed elsewhere.
        try {
          await prisma.otpVerification.updateMany({
            where: { identifier, consumedAt: null },
            data: { consumedAt: new Date() },
          });
        } catch (consumeErr) {
          console.warn('[verifyStoredOtp] OTP DB consume failed:', consumeErr);
        }
        return true;
      }
      authLogger.warn('SMSWBS check_OTP rejected code', { identifier, error: checkRes.error });
    } catch (smswbsErr) {
      console.warn('[verifyStoredOtp] SMSWBS check_OTP call failed, checking database/in-memory fallback:', smswbsErr);
    }
  }

  // 2. Check Database record
  try {
    const record = await prisma.otpVerification.findFirst({
      where: { identifier, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (record) {
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        return false;
      }
      if (record.codeHash !== codeHash) {
        await prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
        return false;
      }
      await prisma.otpVerification.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
      inMemoryOtpStore.delete(identifier);
      return true;
    }
  } catch (dbErr) {
    if (!ALLOW_IN_MEMORY_OTP_FALLBACK()) {
      // Production fail-closed: a DB outage must deny the login, not fall back to
      // a process-local store that cannot be audited or revoked (AUTH-003).
      authLogger.error('OTP verification failed: database unreachable and in-memory fallback disabled.', {
        identifier,
      });
      return false;
    }
    console.warn('[verifyStoredOtp] Database unreachable for OTP verification, checking in-memory fallback:', dbErr);
  }

  // 3. In-memory fallback check (demo/dev only — see AUTH-003)
  if (!ALLOW_IN_MEMORY_OTP_FALLBACK()) return false;
  const memRecord = inMemoryOtpStore.get(identifier);

  if (!memRecord) return false;

  if (memRecord.expiresAt < new Date()) {
    inMemoryOtpStore.delete(identifier);
    return false;
  }
  if (memRecord.attempts >= OTP_MAX_ATTEMPTS) {
    return false;
  }
  if (memRecord.codeHash !== codeHash) {
    memRecord.attempts += 1;
    return false;
  }

  // Consume OTP
  inMemoryOtpStore.delete(identifier);
  return true;
}

/**
 * Ensures a user holds the given role in relational RBAC (IAM-001).
 * The relational chain User → UserRole → Role → RolePermission → Permission is
 * the sole permission authority; `User.role` stays a display/compat field.
 */
async function ensureUserRole(userId: string, roleName: string): Promise<void> {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
      create: {
        name: roleName,
        description: `${roleName} Role`,
      },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: resolvedSecret,
  trustHost: true,
  logger: {
    error(error) {
      // A stale session cookie (e.g. after an AUTH_SECRET rotation) surfaces as
      // JWTSessionError; safeAuth() handles it by treating the user as signed
      // out — don't spam the console with the expected failure.
      const message = typeof error === 'string' ? error : ((error as Error)?.message ?? String(error));
      if (message.includes('JWTSessionError') || message.includes('no matching decryption secret')) return;
      console.error(`[auth][error] ${message}`);
    },
    warn(code) {
      console.warn(`[auth][warn] ${code}`);
    },
    debug() {
      // Debug messages are intentionally silenced.
    },
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: (process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID)!,
            clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET)!,
          }),
        ]
      : []),
    // WeChat: website QR login (desktop browsers) and OfficialAccount authorize
    // (inside the WeChat in-app browser). Both share the same Open Platform app.
    ...(process.env.WECHAT_APP_ID || process.env.AUTH_WECHAT_APP_ID
      ? (() => {
          const wechatId = (process.env.WECHAT_APP_ID || process.env.AUTH_WECHAT_APP_ID)!;
          const wechatSecret = (process.env.WECHAT_APP_SECRET || process.env.AUTH_WECHAT_APP_SECRET)!;
          const wechatProfile = (profile: { unionid?: string; openid?: string; nickname?: string; headimgurl?: string }) => ({
            // unionid is stable across WeChat apps; openid is the per-app fallback.
            id: profile.unionid || profile.openid || '',
            name: profile.nickname,
            email: null as string | null,
            image: profile.headimgurl,
            // نقش نهایی در signIn از DB خوانده می‌شود؛ این مقدار صرفاً برای type/User است.
            role: 'CUSTOMER' as string,
          });
          return [
            WeChatProvider({
              clientId: wechatId,
              clientSecret: wechatSecret,
              platformType: 'WebsiteApp',
              profile: wechatProfile,
            }),
            WeChatProvider({
              id: 'wechat_mp',
              name: 'WeChat (In-App)',
              clientId: wechatId,
              clientSecret: wechatSecret,
              platformType: 'OfficialAccount',
              profile: wechatProfile,
            }),
          ];
        })()
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text', placeholder: 'admin@firuzo.com or +98912...' },
        password: { label: 'Password', type: 'password' },
        channel: { label: 'Channel', type: 'text' }, // credentials, otp, phone, email, telegram, whatsapp, wechat, bale, telegram_widget
      },
      async authorize(credentials) {
        if (!credentials?.identifier) return null;

        const rawIdentifier = normalizeIdentifier(String(credentials.identifier));
        const identifier = rawIdentifier.toLowerCase();
        const password = credentials.password ? String(credentials.password) : '';
        const channel = credentials.channel ? String(credentials.channel) : 'credentials';
        const rawChannel = channel;

        let user = null;

        if (channel === 'telegram_widget') {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) return null;
          try {
            const payload = JSON.parse(password) as TelegramAuthPayload;
            const isValid = ProductionTelegramProvider.verifyTelegramAuth(payload, botToken);
            if (!isValid) return null;

            const telegramId = String(payload.id);
            user = await prisma.user.findFirst({
              where: {
                OR: [{ telegramId }, { email: `${telegramId}@telegram.firuzo.com` }],
              },
            });

            if (!user) {
              const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram User';
              user = await prisma.user.create({
                data: {
                  id: crypto.randomUUID(),
                  telegramId,
                  name: fullName,
                  avatar: payload.photo_url,
                  role: 'CUSTOMER',
                  isActive: true,
                },
              });
              await ensureUserRole(user.id, 'CUSTOMER');
            }
            return {
              id: user.id,
              email: user.email || `${user.id}@firuzo.com`,
              name: user.name || 'Telegram User',
              role: user.role,
            };
          } catch {
            return null;
          }
        }

        if (channel === 'otp') {
          // Passwordless: the OTP itself is the credential, verified server-side.
          const otp = password;
          if (!otp) return null;
          const isValid = await verifyStoredOtp(rawIdentifier, otp);
          if (!isValid) return null;

          // AUTH-002: the OTP channel creates/authenticates CUSTOMER identities only.
          // Privilege is NEVER derived from the identifier string — it comes from the
          // relational RBAC rows attached to the resolved database user.
          const targetRole = 'CUSTOMER';

          let user = null;
          try {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { phone: rawIdentifier },
                  { email: identifier },
                  { telegramId: rawIdentifier },
                  { whatsappPhone: rawIdentifier },
                  { wechatId: rawIdentifier },
                  { baleId: rawIdentifier },
                ],
              },
            });

            // Passwordless sign-up: first login creates a CUSTOMER account.
            if (!user) {
              const displayName =
                rawIdentifier.startsWith('09') || rawIdentifier.startsWith('+98') || rawIdentifier.startsWith('9')
                  ? rawIdentifier
                  : 'کاربر فیروزو';

              user = await prisma.user.create({
                data: {
                  id: crypto.randomUUID(),
                  email: identifier.includes('@') ? identifier : undefined,
                  phone: /^(\+?\d{7,15})$/.test(rawIdentifier) ? rawIdentifier : undefined,
                  telegramId: rawChannel === 'telegram' ? rawIdentifier : undefined,
                  whatsappPhone: rawChannel === 'whatsapp' ? rawIdentifier : undefined,
                  wechatId: rawChannel === 'wechat' ? rawIdentifier : undefined,
                  baleId: rawChannel === 'bale' ? rawIdentifier : undefined,
                  name: displayName,
                  firstNameFa: displayName,
                  lastNameFa: '',
                  role: targetRole,
                  isActive: true,
                },
              });
              await ensureUserRole(user.id, targetRole);
            }
          } catch (dbErr) {
            // Fail closed: an unverifiable identity must never be fabricated.
            authLogger.error('[auth] OTP login denied: database unreachable during identity lookup.', {
              error: String(dbErr),
            });
            return null;
          }

          if (!user || !user.isActive) return null;

          return {
            id: user.id,
            email: user.email || `${user.id}@firuzo.com`,
            name: user.name || user.phone || user.firstNameFa || rawIdentifier,
            role: user.role,
          };
        }

        // Multi-channel identity lookup
        const phoneCandidates = getPhoneLookupCandidates(rawIdentifier);
        try {
          if (channel === 'telegram') {
            user = await prisma.user.findFirst({
              where: { OR: [{ telegramId: rawIdentifier }, ...phoneCandidates.map((p) => ({ phone: p })), { email: identifier }] },
            });
          } else if (channel === 'whatsapp') {
            user = await prisma.user.findFirst({
              where: { OR: [{ whatsappPhone: rawIdentifier }, ...phoneCandidates.map((p) => ({ phone: p }))] },
            });
          } else if (channel === 'wechat') {
            user = await prisma.user.findFirst({
              where: { OR: [{ wechatId: rawIdentifier }, { email: identifier }] },
            });
          } else if (channel === 'bale') {
            user = await prisma.user.findFirst({
              where: { OR: [{ baleId: rawIdentifier }, ...phoneCandidates.map((p) => ({ phone: p }))] },
            });
          } else if (identifier.includes('@')) {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: identifier },
                  ...phoneCandidates.map((p) => ({ phone: p })),
                ],
              },
            });
          } else {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  ...phoneCandidates.map((p) => ({ phone: p })),
                  { email: identifier },
                ],
              },
            });
          }
        } catch (dbErr) {
          // Fail closed: without a durable identity lookup there is nothing to
          // authenticate against. Never fabricate a principal (AUTH-001).
          authLogger.error('[auth] Credentials login denied: database unreachable during lookup.', {
            error: String(dbErr),
          });
          return null;
        }

        /**
         * AUTH-002 — admin bootstrap.
         *
         * The deployment's ADMIN_PASSWORD is the only bootstrap secret. It is
         * verified with bcrypt (never with a plaintext `===` against a constant,
         * which is what previously allowed the published default password to mint
         * a SUPER_ADMIN session). The resulting principal ALWAYS comes from the
         * database row; there is no synthetic fallback identity.
         */
        const bootstrapPassword = getAdminBootstrapPassword();
        if (
          bootstrapPassword &&
          isKnownAdminIdentifier(rawIdentifier) &&
          password &&
          (await bcrypt.compare(password, await bcrypt.hash(bootstrapPassword, 10)))
        ) {
          const adminUser = await ensureAdminUserInDatabase(
            identifier.includes('@') ? identifier : 'admin@firuzo.com',
            rawIdentifier.startsWith('09') ? rawIdentifier : undefined
          );
          if (!adminUser || adminUser.isActive === false) return null;
          return {
            id: adminUser.id,
            email: adminUser.email || 'admin@firuzo.com',
            name: adminUser.name || 'مدیر ارشد فیروزو',
            role: 'SUPER_ADMIN',
          };
        }

        // Demo fallback auto-creation only if DEMO_MODE is true AND strictly outside production
        if (!user && DEMO_MODE() && process.env.NODE_ENV !== 'production') {
          const email = identifier.includes('@') ? identifier : `${rawIdentifier.replace(/\D/g, '') || 'user'}@firuzo.com`;
          const demoHash = await bcrypt.hash('demo', 10);

          user = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email,
              phone: rawIdentifier.startsWith('09') || rawIdentifier.startsWith('+') ? rawIdentifier : undefined,
              telegramId: channel === 'telegram' ? rawIdentifier : undefined,
              whatsappPhone: channel === 'whatsapp' ? rawIdentifier : undefined,
              wechatId: channel === 'wechat' ? rawIdentifier : undefined,
              baleId: channel === 'bale' ? rawIdentifier : undefined,
              name: 'Firuzo User',
              firstNameFa: 'کاربر',
              lastNameFa: 'فیروزو',
              passwordHash: demoHash,
              role: 'CUSTOMER',
            },
          });
          await ensureUserRole(user.id, 'CUSTOMER');
        }

        if (!user || !user.isActive) return null;

        // Standard verification with bcrypt. The password is compared exactly as
        // supplied — no punctuation-flipping "RTL compensation", which used to
        // silently accept a second spelling of every password and halve the
        // effective secret space (AUTH-004).
        if (!user.passwordHash || !password) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // AUTH-002: role comes from the database row only. Deriving SUPER_ADMIN
        // from the identifier string would let anyone who can register a matching
        // email/phone escalate without an RBAC grant.
        return {
          id: user.id,
          email: user.email || `${user.id}@firuzo.com`,
          name: user.name || user.firstNameFa || 'User',
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email,
              name: user.name || 'Google User',
              avatar: user.image,
              role: 'CUSTOMER',
              isActive: true,
            },
          });
          await ensureUserRole(dbUser.id, 'CUSTOMER');
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
        return true;
      }

      if (account?.provider === 'wechat' || account?.provider === 'wechat_mp') {
        const wechatId = String(account.providerAccountId || (profile as { id?: string } | undefined)?.id || '');
        if (!wechatId) return false;

        let dbUser = await prisma.user.findFirst({
          where: { wechatId },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              wechatId,
              name: user.name || 'WeChat User',
              avatar: user.image,
              role: 'CUSTOMER',
              isActive: true,
            },
          });
          await ensureUserRole(dbUser.id, 'CUSTOMER');
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // AUTH-002: the super-admin flag is derived from the DB-verified role that
        // `authorize()` returned — never from an identifier string.
        const isExplicitSuperAdmin = user.role === 'SUPER_ADMIN';

        try {
          // Session permissions mirror relational RBAC authority (IAM-001, IAM-105).
          const [userRoles, orgMemberships] = await Promise.all([
            prisma.userRole.findMany({
              where: { userId: user.id },
              include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
            }),
            prisma.organizationMembership.findMany({
              where: { userId: user.id },
              include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
            }),
          ]);
          const perms = new Set<string>();
          userRoles.forEach((ur) =>
            ur.role.rolePermissions.forEach((rp) => perms.add(rp.permission.code))
          );
          orgMemberships.forEach((om) => {
            if (om.role) {
              om.role.rolePermissions.forEach((rp) => perms.add(rp.permission.code));
            }
          });
          token.permissions = Array.from(perms);

          // IAM-002, IAM-105: Relational role name is the sole authority
          const roleNames = [
            ...userRoles.map((ur) => ur.role.name),
            ...orgMemberships.map((om) => om.role?.name).filter(Boolean) as string[],
          ];
          const staffRole = ERP_STAFF_ROLES.find((r) => roleNames.includes(r));
          token.role = staffRole ?? roleNames[0] ?? (isExplicitSuperAdmin ? 'SUPER_ADMIN' : 'CUSTOMER');

          if (isExplicitSuperAdmin || roleNames.includes('SUPER_ADMIN')) {
            token.role = 'SUPER_ADMIN';
            token.permissions = ['*'];
          }
        } catch (dbErr) {
          console.warn('[auth:jwt] Database unreachable for role resolution — checking fallback:', dbErr);
          if (isExplicitSuperAdmin) {
            token.role = 'SUPER_ADMIN';
            token.permissions = ['*'];
          } else {
            token.role = 'CUSTOMER';
            token.permissions = [];
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

/**
 * Resilient session read: a corrupt or stale session cookie (e.g. after an
 * AUTH_SECRET rotation) is treated as "no session" instead of throwing a
 * JWTSessionError that would crash the calling page with a 500.
 */
export async function safeAuth() {
  try {
    return await auth();
  } catch {
    return null;
  }
}
