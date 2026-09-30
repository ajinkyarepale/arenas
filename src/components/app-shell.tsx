'use client';

import React from 'react';
import { useSidebar } from '@/context/sidebar-context';
import { cx } from '@/lib/format';

interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
}

export function AppShell({
  children,
  className,
  maxWidth = '7xl',
  ...props
}: AppShellProps) {
  const { collapsed } = useSidebar();

  const maxWClass =
    maxWidth === '5xl'
      ? 'max-w-5xl'
      : maxWidth === '6xl'
        ? 'max-w-6xl'
        : maxWidth === 'full'
          ? 'max-w-full'
          : 'max-w-7xl';

  return (
    <div
      className={cx(
        'flex-1 flex flex-col min-h-screen min-w-0 pt-16 md:pt-0 transition-[margin] duration-300 ease-in-out',
        collapsed ? 'md:ml-16' : 'md:ml-64',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppContent({
  children,
  className,
  maxWidth = '7xl',
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
}) {
  const maxWClass =
    maxWidth === '5xl'
      ? 'max-w-5xl'
      : maxWidth === '6xl'
        ? 'max-w-6xl'
        : maxWidth === 'full'
          ? 'max-w-full'
          : 'max-w-7xl';

  return (
    <main
      className={cx(
        'flex-1 w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6 md:gap-8',
        maxWClass,
        className,
      )}
    >
      {children}
    </main>
  );
}
