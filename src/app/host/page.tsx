'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

import { BeamsBackground, ErrorNote, Spinner, SwitchButton } from '@/components/ui';

interface HostStatus {
  role: string;
  latestRequest: {
    id: string;
    collegeName: string;
    clubName: string | null;
    designation: string | null;
    contactPhone: string | null;
    eventDetails: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
  } | null;
}

export default function HostPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HostStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Form State
  const [collegeName, setCollegeName] = useState('');
  const [clubName, setClubName] = useState('');
  const [designation, setDesignation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [eventDetails, setEventDetails] = useState('');

  // Inline Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const loadStatus = async () => {
    if (authStatus === 'unauthenticated') {
      setLoading(false);
      return;
    }
    if (authStatus === 'loading') {
      return;
    }
    try {
      const res = await fetch('/api/host/apply', { cache: 'no-store' });
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Could not load organizer status');
      const json: HostStatus = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus !== 'loading') {
      void loadStatus();
    }
  }, [authStatus]);

  const submitApplicationDirectly = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/host/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: collegeName.trim(),
          clubName: clubName.trim() || undefined,
          designation: designation.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          eventDetails: eventDetails.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit application');
      }

      setSuccess('Your application has been submitted to the Super Admin.');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeName.trim()) {
      setError('Please enter your college or institution name.');
      return;
    }

    // If user is not authenticated, open the inline Auth Dialog on the same page!
    if (authStatus === 'unauthenticated' || !session?.user) {
      setAuthModalOpen(true);
      return;
    }

    await submitApplicationDirectly();
  };

  const handleInlineAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        const signupRes = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
            role: 'PARTICIPANT',
          }),
        });

        if (!signupRes.ok) {
          const body = await signupRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to create account');
        }
      }

      const signInResult = await signIn('credentials', {
        redirect: false,
        email: authEmail.trim(),
        password: authPassword,
      });

      if (!signInResult || signInResult.error) {
        throw new Error(signInResult?.error || 'Invalid credentials');
      }

      // Successfully signed in! Close modal and submit the organizer request
      setAuthModalOpen(false);
      await submitApplicationDirectly();
      router.refresh();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const isOrganizerOrAdmin =
    data?.role === 'ORGANIZER' || data?.role === 'SUPERADMIN' || data?.role === 'ADMIN';

  // --------------------------------------------------------------------------
  // Pending Screen View: Blurred Arena Home with "Request Under Process" Card
  // --------------------------------------------------------------------------
  if (data?.latestRequest?.status === 'PENDING') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white font-['Geist']">
        {/* Top Header */}
        <header className="relative z-30 flex items-center justify-between p-6 bg-black/40 backdrop-blur-md border-b border-[#27272A]/50">
          <Link
            href="/"
            className="font-['Geist'] text-xl font-black text-white hover:text-[#22C55E] transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Arenas</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#a1a1aa] hidden sm:inline">
              Signed in as <strong className="text-white">{session?.user?.name || session?.user?.email}</strong>
            </span>
            <SwitchButton size="default" />
          </div>
        </header>

        {/* Blurred Arena Home Screen Mock Backdrop */}
        <div className="absolute inset-0 top-16 filter blur-md opacity-30 pointer-events-none select-none scale-[1.03] overflow-hidden">
          <div className="max-w-6xl mx-auto p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="h-8 w-48 bg-white/20 rounded-md" />
              <div className="flex gap-4">
                <div className="h-8 w-24 bg-white/10 rounded-full" />
                <div className="h-8 w-24 bg-white/10 rounded-full" />
              </div>
            </div>
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <div className="h-6 w-40 bg-emerald-500/30 rounded-full" />
              <div className="h-14 w-3/4 bg-white/20 rounded-xl" />
              <div className="h-6 w-1/2 bg-white/10 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="h-44 bg-white/10 rounded-2xl border border-white/10 p-4" />
              <div className="h-44 bg-white/10 rounded-2xl border border-white/10 p-4" />
              <div className="h-44 bg-white/10 rounded-2xl border border-white/10 p-4" />
            </div>
          </div>
        </div>

        {/* Foreground Floating "Request Under Process" Card */}
        <div className="relative z-20 min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-[rgba(18,18,20,0.92)] border border-[#27272A] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center flex flex-col items-center gap-6 relative">
            {/* Top Glowing Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-['Epilogue'] text-xs font-bold uppercase tracking-wider shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Request Under Process</span>
            </div>

            {/* Pulsing Animated Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <span className="material-symbols-outlined text-4xl">hourglass_top</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#18181B] border border-amber-500/40 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-xs">shield</span>
              </span>
            </div>

            {/* Title & Organization Details */}
            <div>
              <h2 className="font-['Geist'] text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Application Under Review
              </h2>
              <p className="font-['Epilogue'] text-sm font-semibold text-amber-300 mt-1">
                {data.latestRequest.collegeName}
              </p>
              {data.latestRequest.clubName && (
                <p className="text-xs text-[#a1a1aa]">{data.latestRequest.clubName}</p>
              )}
            </div>

            {/* Context Message */}
            <p className="text-xs sm:text-sm text-[#c4c7c8] leading-relaxed max-w-md">
              Your college tournament organizer application has been submitted to the Super Admin. Once verified, tournament creation, custom questions, and big-screen broadcasting privileges will be activated on your account.
            </p>

            <div className="w-full bg-[#141416] border border-[#27272A] rounded-xl p-3 text-left text-xs space-y-1.5 font-['Geist'] text-[#a1a1aa]">
              <div className="flex justify-between">
                <span>Submitted On:</span>
                <strong className="text-white font-['Epilogue']">
                  {new Date(data.latestRequest.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </div>
              {data.latestRequest.designation && (
                <div className="flex justify-between">
                  <span>Designation:</span>
                  <span className="text-white">{data.latestRequest.designation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Review Status:</span>
                <span className="text-amber-400 font-bold">Pending Approval</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => void loadStatus()}
                className="flex-1 py-3 px-4 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Check Status</span>
              </button>
              <Link
                href="/markets"
                className="flex-1 py-3 px-4 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-md flex items-center justify-center"
              >
                Explore Markets →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Standard Application Form View
  // --------------------------------------------------------------------------
  return (
    <BeamsBackground intensity="medium" className="min-h-screen text-[#e5e2e1] font-['Geist'] px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-8">
        <Link
          href="/"
          className="font-['Geist'] text-xl font-black text-white hover:text-[#22C55E] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Arenas</span>
        </Link>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <span className="text-xs text-[#a1a1aa] hidden sm:inline">
              Hi, <strong className="text-white">{session.user.name || session.user.email}</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
              className="text-xs font-['Epilogue'] text-[#c4c7c8] hover:text-white font-bold"
            >
              Sign In
            </button>
          )}
          <SwitchButton size="default" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        {/* Header Hero */}
        <div className="text-center flex flex-col items-center gap-4">
          <span className="px-3.5 py-1 rounded-full bg-[#201f1f] text-[#c4c7c8] border border-[#27272A] font-['Epilogue'] text-xs font-bold uppercase tracking-widest">
            CAMPUS TOURNAMENT PARTNERSHIP
          </span>
          <h1 className="font-['Geist'] text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Host Live Prediction Arenas at Your College
          </h1>
          <p className="text-[#a1a1aa] text-sm sm:text-base max-w-2xl leading-relaxed">
            Empower your hackathon, college fest, or student club with gamified prediction markets. Engage hundreds of attendees in real-time with big-screen projector feeds, LMSR crowd intelligence, and instant prize ceremonies.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-2xl flex flex-col gap-2">
            <h3 className="font-['Epilogue'] text-sm font-bold text-white">Custom Campus Markets</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Create custom prediction questions for your hackathon tracks, sports matches, or student elections with 1-click outcome resolution.
            </p>
          </div>

          <div className="p-5 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-2xl flex flex-col gap-2">
            <h3 className="font-['Epilogue'] text-sm font-bold text-white">Auditorium Big Screen</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Project real-time probability curves, countdown timers, and live student podiums onto auditorium screens and stage LED walls.
            </p>
          </div>

          <div className="p-5 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-2xl flex flex-col gap-2">
            <h3 className="font-['Epilogue'] text-sm font-bold text-white">1-Click Prize Export</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Instantly export full leaderboard standings with rankings, win rates, and points to CSV for certificate and prize distribution.
            </p>
          </div>
        </div>

        {/* Application / Status Box */}
        <div className="glass-panel p-6 sm:p-8 bg-[rgba(20,20,20,0.9)] border border-[#27272A] backdrop-blur-2xl rounded-2xl shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#a1a1aa]">
              <Spinner />
              <span className="text-xs">Checking organizer status...</span>
            </div>
          ) : isOrganizerOrAdmin ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div>
                <h3 className="font-['Geist'] text-xl font-bold text-white mb-1">
                  Organizer Privileges Active
                </h3>
                <p className="text-xs text-[#a1a1aa] max-w-md">
                  Your account has full tournament hosting capabilities. You can create custom campus arenas, launch big-screen views, and manage live events.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link
                  href="/admin/arenas/new"
                  className="px-6 py-2.5 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-md"
                >
                  Create New Arena →
                </Link>
                <Link
                  href="/admin/arenas"
                  className="px-6 py-2.5 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] transition-all"
                >
                  Manage My Arenas
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <h2 className="font-['Geist'] text-xl font-bold text-white mb-1">
                  Apply for College Organizer Access
                </h2>
                <p className="text-xs text-[#a1a1aa]">
                  Fill out your institution details. Our Super Admin team will review and grant organizer hosting privileges.
                </p>
              </div>

              {data?.latestRequest?.status === 'REJECTED' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  <strong>Previous application note:</strong> {data.latestRequest.rejectionReason || 'Please resubmit with additional event details.'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    College / University Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Stanford University / IIT Bombay"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    Student Club / Committee Name
                  </label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="e.g. ACM Student Chapter / Finance Club"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    Your Role / Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Fest Lead / Club President"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                  Planned Event Details & Expected Turnout
                </label>
                <textarea
                  rows={3}
                  value={eventDetails}
                  onChange={(e) => setEventDetails(e.target.value)}
                  placeholder="Tell us about the upcoming hackathon, fest, or date of the event..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white font-['Geist'] text-xs focus:border-white focus:outline-none resize-none"
                />
              </div>

              <ErrorNote>{error}</ErrorNote>
              {success && (
                <div className="p-3.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl text-xs text-[#22C55E] font-medium">
                  {success}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
                {!session?.user ? (
                  <p className="text-[11px] text-[#a1a1aa]">
                    💡 You will be prompted to sign in or create an account when submitting.
                  </p>
                ) : (
                  <span className="text-[11px] text-[#a1a1aa]">
                    Submitting as <strong className="text-white">{session.user.email}</strong>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="px-8 py-3 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all flex items-center justify-center gap-2 shadow-lg ml-auto"
                >
                  {pending ? <Spinner className="border-black border-t-transparent" /> : null}
                  <span>{pending ? 'Submitting Application…' : 'Submit Organizer Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* Inline Auth Modal (Preserves Application State)                       */}
      {/* ---------------------------------------------------------------------- */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272A] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-['Epilogue'] text-[10px] font-bold uppercase mb-2">
                Step 2 of 2 · Account Verification
              </div>
              <h3 className="font-['Geist'] text-xl font-bold text-white">
                {authMode === 'signin' ? 'Sign in to Submit Application' : 'Create Account & Submit'}
              </h3>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Your application for <strong className="text-white">{collegeName}</strong> is ready. Sign in to complete your submission to the Super Admin.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border border-[#27272A] rounded-lg p-1 bg-[#141416] mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-['Epilogue'] font-bold transition-all ${
                  authMode === 'signin'
                    ? 'bg-[#27272A] text-white shadow-sm'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-['Epilogue'] font-bold transition-all ${
                  authMode === 'signup'
                    ? 'bg-[#27272A] text-white shadow-sm'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleInlineAuthSubmit} className="flex flex-col gap-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="block font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Campus Organizer"
                    className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-3.5 py-2.5 font-['Geist'] text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="organizer@college.edu"
                  className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-3.5 py-2.5 font-['Geist'] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-3.5 py-2.5 font-['Geist'] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <ErrorNote>{authError}</ErrorNote>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-white text-black font-['Epilogue'] font-bold rounded-full py-3 mt-2 hover:bg-[#e4e4e7] transition-colors flex items-center justify-center gap-2 text-xs shadow-lg"
              >
                {authSubmitting ? <Spinner className="border-black border-t-transparent" /> : null}
                <span>
                  {authSubmitting
                    ? 'Authenticating & Submitting…'
                    : authMode === 'signin'
                    ? 'Sign In & Submit Request'
                    : 'Create Account & Submit Request'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </BeamsBackground>
  );
}
