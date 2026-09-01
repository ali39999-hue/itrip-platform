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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'admin@firuzo.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const isDemo = process.env.DEMO_MODE === 'true';

        let user = await prisma.user.findUnique({
          where: { email },
        });

        // Demo fallback auto-creation only if DEMO_MODE is true
        if (!user && isDemo) {
          if (email === 'admin@firuzo.com' && password === 'demo') {
            const adminHash = await bcrypt.hash('demo', 10);
            user = await prisma.user.create({
              data: {
                id: 'clr_admin_123',
                email: 'admin@firuzo.com',
                name: 'Firuzo Admin',
                passwordHash: adminHash,
                role: 'SUPER_ADMIN',
              },
            });
          } else if (email === 'user@firuzo.com' && password === 'demo') {
            const userHash = await bcrypt.hash('demo', 10);
            user = await prisma.user.create({
              data: {
                id: 'clr_mock_user_123',
                email: 'user@firuzo.com',
                name: 'Firuzo User',
                passwordHash: userHash,
                role: 'CUSTOMER',
              },
            });
          }
        }

        if (!user || !user.isActive) return null;

        // In DEMO_MODE, also allow password === 'demo' directly for backward compatibility in demo
        if (isDemo && password === 'demo') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Standard production verification with bcrypt
        if (!user.passwordHash) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
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
