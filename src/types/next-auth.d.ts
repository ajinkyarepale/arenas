import type { RoleType, UserStatus } from '@/generated/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: RoleType;
      status?: UserStatus;
    } & DefaultSession['user'];
  }

  interface User {
    role: RoleType;
    status?: UserStatus;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: RoleType;
    status?: UserStatus;
  }
}
