import NextAuth, { type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
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
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'admin@firuzo.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // For V1 Demo purposes, allow a mock login if password is "demo"
        if (user && credentials.password === 'demo') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Auto-create a mock user for the demo flow if they use the mock email
        if (credentials.email === 'user@firuzo.com' && credentials.password === 'demo') {
           let mockUser = await prisma.user.findUnique({ where: { email: 'user@firuzo.com' }});
           if(!mockUser) {
              mockUser = await prisma.user.create({
                 data: {
                   id: 'clr_mock_user_123',
                   email: 'user@firuzo.com',
                   name: 'Firuzo User',
                   passwordHash: 'dummy',
                   role: 'USER',
                   wallet: {
                     create: { balances: JSON.stringify({ IRR: 150000000, USDT: 250 }) }
                   }
                 }
              });
           }
           return { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: mockUser.role };
        }
        
        // Auto-create Admin for demo
        if (credentials.email === 'admin@firuzo.com' && credentials.password === 'demo') {
           let adminUser = await prisma.user.findUnique({ where: { email: 'admin@firuzo.com' }});
           if(!adminUser) {
              adminUser = await prisma.user.create({
                 data: {
                   id: 'clr_admin_123',
                   email: 'admin@firuzo.com',
                   name: 'Firuzo Admin',
                   passwordHash: 'dummy',
                   role: 'ADMIN',
                 }
              });
           }
           return { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role };
        }

        return null;
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
