'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

interface OrganizerRequestItem {
  id: string;
  userId: string;
  collegeName: string;
  clubName: string | null;
  designation: string | null;
  contactPhone: string | null;
  eventDetails: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  };
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AdminOrganizersPage() {
  const [requests, setRequests] = useState<OrganizerRequestItem[] | null>(null);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number; total: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/admin/organizers', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 403) throw new Error('SuperAdmin access required.');
        throw new Error('Could not load organizer applications.');
      }
      const data = await res.json();
      setRequests(data.requests);
      setCounts(data.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionBusy(`${id}-${action}`);
    setMessage(null);
    setError(null);

    let reason: string | undefined = undefined;
    if (action === 'REJECT') {
      const input = prompt('Enter an optional rejection note for the applicant:');
      if (input === null) {
        setActionBusy(null);
        return; // User cancelled prompt
      }
      reason = input.trim() || undefined;
    }

    try {
      const res = await fetch(`/api/admin/organizers/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update review status');

      setMessage(json.message);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed');
    } finally {
      setActionBusy(null);
    }
  };

  const filtered = requests
    ? filter === 'ALL'
      ? requests
      : requests.filter((r) => r.status === filter)
    : [];

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Geist'] px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-['Epilogue'] text-[10px] font-bold uppercase tracking-widest">
                SUPERADMIN GOVERNANCE
              </span>
            </div>
            <h1 className="font-['Geist'] text-2xl sm:text-3xl font-extrabold text-white mt-1">
              College Organizer Applications
            </h1>
            <p className="font-['Geist'] text-xs text-[#a1a1aa] mt-0.5">
              Review and grant hosting privileges to student leads and campus event committees.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/arenas"
              className="px-4 py-2 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] transition-all"
            >
              All Arenas
            </Link>
            <Link
              href="/admin/arenas/new"
              className="px-5 py-2 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-md"
            >
              + Create Tournament
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-xl flex flex-col gap-1">
            <span className="text-[10px] font-['Epilogue'] font-bold text-[#a1a1aa] uppercase">Total Requests</span>
            <span className="font-['Geist'] text-2xl font-bold text-white">{counts.total}</span>
          </div>
          <div className="p-4 bg-[rgba(20,20,20,0.85)] border border-amber-500/20 rounded-xl flex flex-col gap-1">
            <span className="text-[10px] font-['Epilogue'] font-bold text-amber-400 uppercase">Pending Review</span>
            <span className="font-['Geist'] text-2xl font-bold text-amber-400">{counts.pending}</span>
          </div>
          <div className="p-4 bg-[rgba(20,20,20,0.85)] border border-[#22C55E]/20 rounded-xl flex flex-col gap-1">
            <span className="text-[10px] font-['Epilogue'] font-bold text-[#22C55E] uppercase">Approved Organizers</span>
            <span className="font-['Geist'] text-2xl font-bold text-[#22C55E]">{counts.approved}</span>
          </div>
          <div className="p-4 bg-[rgba(20,20,20,0.85)] border border-[#27272A] rounded-xl flex flex-col gap-1">
            <span className="text-[10px] font-['Epilogue'] font-bold text-[#71717A] uppercase">Rejected</span>
            <span className="font-['Geist'] text-2xl font-bold text-[#71717A]">{counts.rejected}</span>
          </div>
        </div>

        {/* Status Message / Error */}
        <ErrorNote>{error}</ErrorNote>
        {message && (
          <div className="p-3.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl text-xs text-[#22C55E] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{message}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-['Epilogue'] text-xs font-bold transition-all ${
                filter === tab
                  ? 'bg-white text-black'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#202022]'
              }`}
            >
              {tab === 'ALL' ? 'All Applications' : tab === 'PENDING' ? `Pending (${counts.pending})` : tab}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#a1a1aa]">
            <Spinner />
            <span className="text-xs">Loading organizer applications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border border-[#27272A] rounded-2xl bg-[#18181B]/50 flex flex-col items-center">
            <span className="material-symbols-outlined text-3xl text-[#71717A] mb-2">inbox</span>
            <h3 className="font-['Geist'] text-base font-bold text-white">No applications in this view</h3>
            <p className="text-xs text-[#a1a1aa] mt-1">
              New college organizer requests submitted at <code className="text-white">/host</code> will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((req) => (
              <div
                key={req.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
                  req.status === 'PENDING'
                    ? 'bg-[rgba(20,20,20,0.9)] border-amber-500/30 shadow-lg'
                    : 'bg-[#18181B]/60 border-[#27272A]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                      req.status === 'APPROVED'
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                        : req.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-[#27272A] text-[#71717A]'
                    }`}>
                      <span className="material-symbols-outlined text-xl">
                        {req.status === 'APPROVED' ? 'verified' : req.status === 'PENDING' ? 'hourglass_top' : 'block'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Geist'] text-base font-bold text-white">
                          {req.collegeName}
                        </h3>
                        {req.clubName && (
                          <span className="px-2 py-0.5 rounded-full bg-[#27272A] text-[#a1a1aa] text-[10px] font-['Epilogue'] font-medium">
                            {req.clubName}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-['Epilogue'] font-bold uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                            : req.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">
                        Applicant: <strong className="text-white">{req.user.name}</strong> ({req.user.email}) · Role: <span className="font-mono text-purple-400">{req.user.role}</span>
                        {req.designation && ` · Designation: ${req.designation}`}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons for SuperAdmin */}
                  {req.status === 'PENDING' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actionBusy !== null}
                        onClick={() => void handleReview(req.id, 'APPROVE')}
                        className="px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#1ea750] text-black font-['Epilogue'] text-xs font-bold transition-all shadow-md shadow-[#22C55E]/10 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>{actionBusy === `${req.id}-APPROVE` ? 'Approving…' : 'Approve Organizer'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy !== null}
                        onClick={() => void handleReview(req.id, 'REJECT')}
                        className="px-3.5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3f3f46] text-[#e4e4e7] border border-[#3f3f46] font-['Epilogue'] text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : req.status === 'APPROVED' ? (
                    <div className="text-right">
                      <span className="text-[11px] font-['Epilogue'] text-[#22C55E] font-semibold flex items-center gap-1 justify-end">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Organizer Active
                      </span>
                      {req.reviewedAt && (
                        <span className="text-[10px] text-[#71717A] font-['Epilogue'] block">
                          Approved {new Date(req.reviewedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-right text-[11px] text-red-400 font-['Epilogue']">
                      Rejected: {req.rejectionReason || 'Criteria not met'}
                    </div>
                  )}
                </div>

                {/* Additional Event Details & Phone */}
                {(req.eventDetails || req.contactPhone) && (
                  <div className="pt-3 border-t border-[#27272A]/70 flex flex-wrap items-center justify-between gap-2 text-xs text-[#a1a1aa]">
                    {req.eventDetails && (
                      <p className="line-clamp-2 max-w-2xl">
                        <strong className="text-[#d4d4d8]">Event Plan:</strong> {req.eventDetails}
                      </p>
                    )}
                    {req.contactPhone && (
                      <span className="font-mono text-white bg-[#141414] px-2.5 py-1 rounded-md border border-[#27272a]">
                        Phone: {req.contactPhone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
