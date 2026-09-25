import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { verifyOtp } from '@/lib/otp';
import { prisma } from '@/lib/prisma';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
/** The UI shows the Google button only when this is true. */
export const googleEnabled = Boolean(googleClientId && googleClientSecret);

/**
 * bcrypt work factor. 12 is the floor stated in the security requirements;
 * raising it later only affects newly hashed passwords, and existing hashes
 * keep verifying because the cost is embedded in the hash itself.
 */
export const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authOptions: NextAuthOptions = {
  // The adapter keeps the standard NextAuth tables in place so an OAuth
  // provider can be added later without a schema change. Credentials logins
  // themselves are necessarily JWT-backed.
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  providers: [
    // Google OAuth. Appears only when GOOGLE_CLIENT_ID/SECRET are set; the
    // Prisma adapter persists the link in Account, and `passwordHash` stays
    // null so these accounts can never fall back to password login.
    // Google-verified emails are safe to link to an existing same-email
    // account, so first-time Google users with a password account merge
    // rather than erroring.
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
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

        // Always run a comparison, even when the account does not exist, so the
        // response time does not reveal which emails are registered.
        const hash =
          user?.passwordHash ??
          '$2a$12$0000000000000000000000000000000000000000000000000000';
        const valid = await verifyPassword(password, hash);

        if (!user || !valid) return null;

        // Never return the hash — this object becomes the JWT payload seed.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: 'email-otp',
      name: 'Email code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
        name: { label: 'Name', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const code = credentials?.code?.trim();
        if (!email || !code) return null;

        // The DB attempt counter is the brute-force boundary (5 guesses per
        // code, 10-minute life); a wrong code simply returns null.
        const result = await verifyOtp(email, code, 'nextauth', credentials?.name);
        if (!result.ok || !result.user) return null;

        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? 'PARTICIPANT';
      }

      // Refresh the role from the database when the client calls update(), so a
      // promotion to ORGANIZER takes effect without forcing a re-login.
      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? 'PARTICIPANT';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

/** Server-side session helper. Use this, never a client-side role check. */
export function auth() {
  return getServerSession(authOptions);
}

export function isOrganizer(role: Role | undefined | null): boolean {
  return role === 'ORGANIZER' || role === 'SUPERADMIN';
}
