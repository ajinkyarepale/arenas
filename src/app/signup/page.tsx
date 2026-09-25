import type { Metadata } from 'next';
import { Suspense } from 'react';

import Link from 'next/link';

import { Divider, GoogleCallbackButton, SignUpForm } from '@/components/auth-forms';
import { FieldBackdrop } from '@/components/field-backdrop';
import { SiteShell } from '@/components/site-shell';
import { Panel } from '@/components/ui';
import { googleEnabled } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create an account' };
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <SiteShell width="narrow">
      <div className="relative mx-auto w-full max-w-sm py-8">
        <div className="grid-field pointer-events-none absolute inset-x-[-50vw] inset-y-[-4rem] opacity-40" aria-hidden />
        <FieldBackdrop className="inset-x-[-50vw] inset-y-[-4rem] opacity-50" density={0.6} />
        <div
          className="bloom pointer-events-none absolute left-1/2 top-0 h-96 w-[36rem] -translate-x-1/2"
          aria-hidden
        />

        <div className="relative">
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-accent/70" aria-hidden />
            Enlist
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-fg">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            One account works across every arena, at every college.
          </p>
          <Panel className="hud mt-6 p-6">
            <Suspense fallback={<div className="h-96 animate-pulse rounded bg-ink-800" />}>
              <div className="flex flex-col gap-4">
                {googleEnabled ? (
                  <>
                    <GoogleCallbackButton label="Sign up with Google" />
                    <Divider>or with email</Divider>
                  </>
                ) : null}
                <SignUpForm />
                <p className="text-center text-sm text-fg-muted">
                  Prefer no password?{' '}
                  <Link href="/signin" className="font-semibold text-accent hover:underline">
                    Get an email code instead
                  </Link>
                </p>
              </div>
            </Suspense>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
