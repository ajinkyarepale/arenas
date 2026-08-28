'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

interface HostStatus {
  role: string;
  latestRequest: {
    id: string;
    collegeName: string;
    clubName: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
  } | null;
}

export default function HostPage() {
  const router = useRouter();
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

  const loadStatus = async () => {
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
    void loadStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim()) {
      setError('Please enter your college or institution name.');
      return;
    }

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

      setSuccess('Your application has been submitted successfully to the SuperAdmin.');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  };

  const isOrganizerOrAdmin =
    data?.role === 'ORGANIZER' || data?.role === 'SUPERADMIN' || data?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Geist'] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        {/* Header Hero */}
        <div className="text-center flex flex-col items-center gap-4">
          <span className="px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-['Epilogue'] text-xs font-bold uppercase tracking-widest">
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
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-lg">school</span>
            </div>
            <h3 className="font-['Epilogue'] text-sm font-bold text-white">Custom Campus Markets</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Create custom prediction questions for your hackathon tracks, sports matches, or student elections with 1-click outcome resolution.
            </p>
          </div>

          <div className="p-5 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-2xl flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-lg">tv</span>
            </div>
            <h3 className="font-['Epilogue'] text-sm font-bold text-white">Auditorium Big Screen</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Project real-time probability curves, countdown timers, and live student podiums onto auditorium screens and stage LED walls.
            </p>
          </div>

          <div className="p-5 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-2xl flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-lg">military_tech</span>
            </div>
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
              <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E]">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
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
          ) : data?.latestRequest?.status === 'PENDING' ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-2xl animate-pulse">hourglass_top</span>
              </div>
              <div>
                <span className="px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-['Epilogue'] text-[11px] font-bold uppercase tracking-wider mb-2 inline-block">
                  Application Under Review
                </span>
                <h3 className="font-['Geist'] text-xl font-bold text-white mb-1">
                  {data.latestRequest.collegeName}
                </h3>
                {data.latestRequest.clubName && (
                  <p className="text-xs text-[#a1a1aa] mb-2">{data.latestRequest.clubName}</p>
                )}
                <p className="text-xs text-[#a1a1aa] max-w-md mx-auto leading-relaxed">
                  Your organizer application has been submitted to the SuperAdmin. Once approved, you will be able to create and host campus tournaments.
                </p>
              </div>
              <p className="text-[11px] text-[#71717a] font-['Epilogue']">
                Submitted on {new Date(data.latestRequest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <h2 className="font-['Geist'] text-xl font-bold text-white mb-1">
                  Apply for College Organizer Access
                </h2>
                <p className="text-xs text-[#a1a1aa]">
                  Fill out your institution details. SuperAdmin will review and grant organizer hosting privileges.
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

              <div className="flex items-center justify-end pt-2 border-t border-[#27272A]">
                <button
                  type="submit"
                  disabled={pending}
                  className="px-8 py-3 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {pending ? <Spinner className="border-black border-t-transparent" /> : null}
                  <span>{pending ? 'Submitting Application…' : 'Submit Organizer Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
