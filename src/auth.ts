import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

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

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET environment variable is required in production. Generate one with: openssl rand -base64 32');
}
// Dev-only fallback so a missing .env never silently degrades session security in prod.
const resolvedSecret = secret || 'dev-only-insecure-secret-never-use-in-production';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(`${code}:${process.env.AUTH_SECRET ?? resolvedSecret}`).digest('hex');
}

/**
 * Issues a one-time passcode for the given identifier.
 * Returns the plaintext code ONLY in demo mode so the dev UI can display it.
 */
export async function issueOtp(identifier: string, channel: string): Promise<{ sent: boolean; devCode?: string }> {
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      identifier,
      channel,
      codeHash: hashOtp(code),
      expiresAt,
    },
  });

  await prisma.outboxEvent.create({
    data: {
      eventType: 'AUTH_OTP_REQUESTED',
      payload: JSON.stringify({ identifier, channel, code, expiresAt: expiresAt.toISOString() }),
    },
  });

  return { sent: true, devCode: DEMO_MODE ? code : undefined };
}

/** Verifies and consumes a stored OTP. Returns true when f the code is valid. */
async function verifyStoredOtp(identifier: string, code: string): Promise<boolean> {
  const record = await prisma.otpVerification.findFirst({
    where: { identifier, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;
  if (record.attempts >= OTP_MAX_ATTEMPTS) return false;

  if (record.codeHash !== hashOtp(code)) {
    await prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.otpVerification.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: resolvedSecret,
  trustHost: process.env.NODE_ENV !== 'production',
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
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text', placeholder: 'admin@firuzo.com or +98912...' },
        password: { label: 'Password', type: 'password' },
        channel: { label: 'Channel', type: 'text' }, // credentials, otp, phone, email, telegram, whatsapp, wechat
      },
      async authorize(credentials) {
        if (!credentials?.identifier) return null;

        const rawIdentifier = String(credentials.identifier).trim();
        const identifier = rawIdentifier.toLowerCase();
        const password = credentials.password ? String(credentials.password) : '';
        const channel = credentials.channel ? String(credentials.channel) : 'credentials';
        const rawChannel = channel;

        let user = null;

        if (channel === 'otp') {
          // Passwordless: the OTP itself is the credential, verified server-side.
          const otp = password;
          if (!otp) return null;
          const isValid = (DEMO_MODE && otp === '1234')
            ? true
            : await verifyStoredOtp(rawIdentifier, otp);
          if (!isValid) return null;

          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: rawIdentifier },
                { email: identifier },
                { telegramId: rawIdentifier },
                { whatsappPhone: rawIdentifier },
                { wechatId: rawIdentifier },
              ],
            },
          });

          // Passwordless sign-up: first login creates a CUSTOMER account.
          if (!user) {
            user = await prisma.user.create({
              data: {
                id: crypto.randomUUID(),
                email: identifier.includes('@') ? identifier : undefined,
                phone: /^(\+?\d{7,15})$/.test(rawIdentifier) ? rawIdentifier : undefined,
                telegramId: rawChannel === 'telegram' ? rawIdentifier : undefined,
                whatsappPhone: rawChannel === 'whatsapp' ? rawIdentifier : undefined,
                wechatId: rawChannel === 'wechat' ? rawIdentifier : undefined,
                name: 'Firuzo User',
                role: 'CUSTOMER',
                isActive: true,
              },
            });
          }
          return { id: user.id, email: user.email || `${user.id}@firuzo.com`, name: user.name || 'User', role: user.role };
        }

        // Multi-channel identity lookup
        if (channel === 'telegram') {
          user = await prisma.user.findFirst({
            where: { OR: [{ telegramId: rawIdentifier }, { phone: rawIdentifier }, { email: identifier }] },
          });
        } else if (channel === 'whatsapp') {
          user = await prisma.user.findFirst({
            where: { OR: [{ whatsappPhone: rawIdentifier }, { phone: rawIdentifier }] },
          });
        } else if (channel === 'wechat') {
          user = await prisma.user.findFirst({
            where: { OR: [{ wechatId: rawIdentifier }, { email: identifier }] },
          });
        } else if (identifier.includes('@')) {
          user = await prisma.user.findUnique({
            where: { email: identifier },
          });
        } else {
          user = await prisma.user.findFirst({
            where: { OR: [{ phone: rawIdentifier }, { email: identifier }] },
          });
        }

        // Demo fallback auto-creation only if DEMO_MODE is true
        if (!user && DEMO_MODE) {
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
              name: 'Firuzo User',
              firstNameFa: 'کاربر',
              lastNameFa: 'فیروزه',
              passwordHash: demoHash,
              role: 'CUSTOMER',
            },
          });
        }

        if (!user || !user.isActive) return null;

        // Demo convenience: any active user may sign in without a password.
        // Never active in production.
        if (DEMO_MODE) {
          return {
            id: user.id,
            email: user.email || `${user.id}@firuzo.com`,
            name: user.name || user.firstNameFa || 'User',
            role: user.role,
          };
        }

        // Standard production verification with bcrypt
        if (!user.passwordHash || !password) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
