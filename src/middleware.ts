import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Route-level access control.
 *
 * This is the first gate, not the only one: every API route re-checks the
 * session and role server-side. Middleware keeps signed-out users off the
 * authenticated pages and non-organizers out of /admin, but it is treated as a
 * convenience layer — nothing here is load-bearing for data access.
 *
 * Note which routes are deliberately absent: /arenas/[code]/screen is public so
 * a projector can display an arena without anyone logging in on it, and
 * /markets, /guide and /info are public marketing surfaces.
 */
export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const role = request.nextauth?.token?.role;

    if (pathname.startsWith('/admin')) {
      if (role !== 'ORGANIZER' && role !== 'SUPERADMIN') {
        const url = new URL('/dashboard', request.url);
        url.searchParams.set('error', 'organizer-only');
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: {
      signIn: '/signin',
    },
  },
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/arenas/:code/live'],
};
