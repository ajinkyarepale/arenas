'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

interface FormState {
  name: string;
  description: string;
  hostName: string;
  asset: string;
  roundDurationSec: number;
  lockBufferSec: number;
  totalRounds: number;
  startingBalance: number;
  liquidityParamB: number;
  maxStakePerTrade: number;
  code: string;
}

const DEFAULTS: FormState = {
  name: '',
  description: '',
  hostName: '',
  asset: 'BTCUSDT',
  roundDurationSec: 300,
  lockBufferSec: 30,
  totalRounds: 12,
  startingBalance: 1000,
  liquidityParamB: 40,
  maxStakePerTrade: 250,
  code: '',
};

export function CreateArenaForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/arenas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          description: form.description || undefined,
          hostName: form.hostName || undefined,
          code: form.code ? form.code.toUpperCase() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create arena');
      }

      const data: { arena: { id: string; code: string } } = await res.json();
      router.push(`/admin`);
      router.refresh();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Could not create arena');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 font-['Geist'] text-xs">
      <div>
        <h1 className="font-['Geist'] text-3xl font-bold text-white mb-1">Create an Arena</h1>
        <p className="font-['Geist'] text-sm text-[#c4c7c8]">
          Configure tournament settings, asset pair, and liquidity parameters.
        </p>
      </div>

      <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col gap-5">
        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Arena Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Fall '24 Tech Symposium Predictions"
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#8e9192]"
          />
        </div>

        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief overview for participants..."
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#8e9192]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
              Host / Club Name
            </label>
            <input
              type="text"
              value={form.hostName}
              onChange={(e) => set('hostName', e.target.value)}
              placeholder="e.g. Quant Club"
              className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#8e9192]"
            />
          </div>

          <div>
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
              Custom Access Code (Optional)
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. DEMO24"
              className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Epilogue'] text-sm font-bold uppercase tracking-widest focus:border-white focus:outline-none transition-colors placeholder-[#8e9192]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
              Target Asset
            </label>
            <select
              value={form.asset}
              onChange={(e) => set('asset', e.target.value)}
              className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Epilogue'] text-xs font-bold focus:border-white focus:outline-none transition-colors"
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
            </select>
          </div>

          <div>
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
              Total Rounds
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.totalRounds}
              onChange={(e) => set('totalRounds', Number(e.target.value))}
              className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Epilogue'] text-xs font-bold focus:border-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
              Starting Points
            </label>
            <input
              type="number"
              min={100}
              max={100000}
              value={form.startingBalance}
              onChange={(e) => set('startingBalance', Number(e.target.value))}
              className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Epilogue'] text-xs font-bold focus:border-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <ErrorNote>{error}</ErrorNote>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full bg-white text-[#2f3131] rounded-full py-3.5 font-['Epilogue'] text-sm font-bold hover:bg-[#c6c6c7] transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {pending ? <Spinner className="border-[#2f3131] border-t-transparent" /> : null}
          <span>{pending ? 'Creating Arena…' : 'Create & Launch Arena'}</span>
        </button>
      </div>
    </form>
  );
}
