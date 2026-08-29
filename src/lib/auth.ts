import { PrismaAdapter } from '@auth/prisma-adapter';
import { RoleType, UserStatus } from '@/generated/client';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { Adapter } from 'next-auth/adapters';

import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as never) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: '/signin',
    signOut: '/signout',
    error: '/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        const hash =
          user?.passwordHash ??
          '$2a$12$0000000000000000000000000000000000000000000000000000';
        const valid = await verifyPassword(password, hash);

        if (!user || !valid) return null;

        // Block suspended or deactivated accounts from signing in
        if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
          return null;
        }

        // Track last login timestamp asynchronously
        void prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {});

        void createAuditLog({
          actorId: user.id,
          action: 'USER_LOGIN',
          resourceType: 'USER',
          resourceId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: RoleType }).role ?? RoleType.PARTICIPANT;
        token.status = (user as { status?: UserStatus }).status ?? UserStatus.ACTIVE;
      }

      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, status: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
          token.status = fresh.status;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as RoleType) ?? RoleType.PARTICIPANT;
        session.user.status = (token.status as UserStatus) ?? UserStatus.ACTIVE;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

export function auth() {
  return getServerSession(authOptions);
}

export function isOrganizer(role: RoleType | undefined | null): boolean {
  return role === RoleType.ORGANIZER || role === RoleType.ADMIN || role === RoleType.SUPERADMIN;
}
