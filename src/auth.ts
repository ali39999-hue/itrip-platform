import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
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

// In production, AUTH_SECRET or NEXTAUTH_SECRET is strictly required. No insecure string fallbacks.
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET environment variable is strictly required in production mode');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: secret || (process.env.DEMO_MODE === 'true' ? 'firuzo-dev-local-only-secret-2026' : undefined),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text', placeholder: 'admin@firuzo.com or +98912...' },
        password: { label: 'Password', type: 'password' },
        channel: { label: 'Channel', type: 'text' }, // email, phone, telegram, whatsapp, wechat
      },
      async authorize(credentials) {
        if (!credentials?.identifier) return null;

        const rawIdentifier = String(credentials.identifier).trim();
        const identifier = rawIdentifier.toLowerCase();
        const password = credentials.password ? String(credentials.password) : 'demo';
        const channel = credentials.channel ? String(credentials.channel) : 'credentials';
        const isDemo = process.env.DEMO_MODE === 'true';

        let user = null;

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
        if (!user && isDemo) {
          const isAdmin = identifier.includes('admin') || rawIdentifier.endsWith('0000');
          const email = isAdmin ? 'admin@firuzo.com' : (identifier.includes('@') ? identifier : `${rawIdentifier.replace(/\D/g, '') || 'user'}@firuzo.com`);
          const adminHash = await bcrypt.hash('demo', 10);
          
          user = await prisma.user.create({
            data: {
              id: isAdmin ? 'clr_admin_123' : `usr_${Date.now()}`,
              email,
              phone: rawIdentifier.startsWith('09') || rawIdentifier.startsWith('+') ? rawIdentifier : undefined,
              telegramId: channel === 'telegram' ? rawIdentifier : undefined,
              whatsappPhone: channel === 'whatsapp' ? rawIdentifier : undefined,
              wechatId: channel === 'wechat' ? rawIdentifier : undefined,
              name: isAdmin ? 'Firuzo Admin' : 'Firuzo User',
              firstNameFa: isAdmin ? 'مدیر' : 'کاربر',
              lastNameFa: 'سیستم',
              passwordHash: adminHash,
              role: isAdmin ? 'SUPER_ADMIN' : 'CUSTOMER',
            },
          });
        }

        if (!user || !user.isActive) return null;

        // In DEMO_MODE or for social/OTP channels, password validation follows demo rules or hash comparison
        if (isDemo && (password === 'demo' || password === '1234' || password === '12345' || channel !== 'credentials')) {
          return {
            id: user.id,
            email: user.email || `${user.id}@firuzo.com`,
            name: user.name || user.firstNameFa || 'User',
            role: user.role,
          };
        }

        // Standard production verification with bcrypt
        if (!user.passwordHash) return null;
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
