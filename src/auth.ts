import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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
        if (credentials.password !== 'demo') return null;

        const email = credentials.email as string;
        
        // Try to find existing user
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // Auto-create demo users if they don't exist
        if (!user) {
          if (email === 'admin@firuzo.com') {
            user = await prisma.user.create({
              data: {
                id: 'clr_admin_123',
                email: 'admin@firuzo.com',
                name: 'Firuzo Admin',
                passwordHash: 'dummy',
                role: 'SUPER_ADMIN',
              }
            });
          } else if (email === 'user@firuzo.com') {
            user = await prisma.user.create({
              data: {
                id: 'clr_mock_user_123',
                email: 'user@firuzo.com',
                name: 'Firuzo User',
                passwordHash: 'dummy',
                role: 'CUSTOMER',
              }
            });
          } else {
            return null;
          }
        }

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
