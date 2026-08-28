'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';
import { formatDuration, formatPoints } from '@/lib/format';

type MarketCategory = 'CRYPTO_PRICE' | 'CAMPUS_EVENT' | 'CUSTOM_TRIVIA';

interface FormState {
  marketCategory: MarketCategory;
  name: string;
  question: string;
  resolutionCriteria: string;
  description: string;
  hostName: string;
  collegeName: string;
  collegeLogoUrl: string;
  enableBots: boolean;
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
  marketCategory: 'CAMPUS_EVENT',
  name: '',
  question: '',
  resolutionCriteria: '',
  description: '',
  hostName: '',
  collegeName: '',
  collegeLogoUrl: '',
  enableBots: false,
  asset: 'BTCUSDT',
  roundDurationSec: 300, // 5 mins default
  lockBufferSec: 30,
  totalRounds: 1, // 1 round default for custom events, 12 for crypto
  startingBalance: 1000,
  liquidityParamB: 40,
  maxStakePerTrade: 250,
  code: '',
};

const ROUND_DURATION_PRESETS = [
  { label: '1 min (Blitz)', sec: 60, desc: 'Ultra high-speed competition' },
  { label: '2 min', sec: 120, desc: 'Rapid trading burst' },
  { label: '3 min', sec: 180, desc: 'Fast-paced tournament' },
  { label: '5 min (Standard)', sec: 300, desc: 'Balanced analysis & action' },
  { label: '10 min', sec: 600, desc: 'Extended deliberation' },
];

const STARTING_BALANCE_PRESETS = [500, 1000, 2500, 5000, 10000];

export function CreateArenaForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationMin, setCustomDurationMin] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleCategorySelect = (category: MarketCategory) => {
    setForm((prev) => ({
      ...prev,
      marketCategory: category,
      totalRounds: category === 'CRYPTO_PRICE' ? 12 : 1,
      name: prev.name || (category === 'CRYPTO_PRICE' ? '5-Min Crypto Championship' : 'Campus Prediction Arena'),
    }));
  };

  const handleDurationSelect = (sec: number) => {
    setIsCustomDuration(false);
    set('roundDurationSec', sec);
    // Adjust lock buffer proportionally (10% of duration, clamped between 5s and 60s)
    const buffer = Math.max(5, Math.min(60, Math.floor(sec * 0.1)));
    set('lockBufferSec', buffer);
  };

  const handleCustomDurationChange = (minutesStr: string) => {
    setCustomDurationMin(minutesStr);
    const min = parseFloat(minutesStr);
    if (!isNaN(min) && min > 0) {
      const sec = Math.round(min * 60);
      set('roundDurationSec', sec);
      const buffer = Math.max(5, Math.min(60, Math.floor(sec * 0.1)));
      set('lockBufferSec', buffer);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      return true;
    }
    if (currentStep === 2) {
      if (!form.name.trim()) {
        setError('Please enter an arena name.');
        return false;
      }
      if (form.marketCategory !== 'CRYPTO_PRICE' && !form.question.trim()) {
        setError('Please provide the main prediction question.');
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (form.roundDurationSec < 30) {
        setError('Round duration must be at least 30 seconds.');
        return false;
      }
      if (form.startingBalance < 100) {
        setError('Starting balance must be at least 100 points.');
        return false;
      }
      if (form.totalRounds < 1) {
        setError('An arena must have at least 1 round.');
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateStep(step)) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/arenas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          marketCategory: form.marketCategory,
          question: form.marketCategory !== 'CRYPTO_PRICE' ? form.question.trim() : undefined,
          resolutionCriteria: form.resolutionCriteria?.trim() || undefined,
          description: form.description?.trim() || undefined,
          hostName: form.hostName?.trim() || undefined,
          code: form.code ? form.code.toUpperCase().trim() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create arena');
      }

      const data: { arena: { id: string; code: string } } = await res.json();
      router.push(`/admin/arenas/${data.arena.code}`);
      router.refresh();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Could not create arena');
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['Geist'] text-xs max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-['Geist'] text-3xl font-bold text-white mb-1.5 tracking-tight">Create an Arena</h1>
        <p className="font-['Geist'] text-sm text-[#9ca3af]">
          Set up a live prediction tournament in 4 simple, guided steps.
        </p>
      </div>

      {/* Step Indicator Bar */}
      <div className="grid grid-cols-4 gap-2 bg-[#18181B]/80 p-1.5 rounded-2xl border border-[#27272A]">
        {[
          { num: 1, label: '1. Market Type' },
          { num: 2, label: '2. Question & Details' },
          { num: 3, label: '3. Timer & Economy' },
          { num: 4, label: '4. Review & Launch' },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4);
                else if (validateStep(step)) setStep(s.num as 1 | 2 | 3 | 4);
              }}
              className={`py-2 px-3 rounded-xl font-['Epilogue'] text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-white text-black shadow-md shadow-white/10'
                  : isDone
                  ? 'bg-[#27272A] text-[#e4e4e7] hover:bg-[#323236]'
                  : 'text-[#71717A] hover:text-[#a1a1aa]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                isActive ? 'bg-black text-white' : isDone ? 'bg-[#22c55e] text-black font-extrabold' : 'bg-[#27272A] text-[#71717A]'
              }`}>
                {isDone ? <span className="material-symbols-outlined text-[10px]">check</span> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label.split('. ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Form Content */}
      <form onSubmit={submit} className="glass-panel p-6 sm:p-8 border border-[#27272A] bg-[rgba(20,20,20,0.85)] backdrop-blur-2xl rounded-2xl flex flex-col gap-6 shadow-2xl">
        {/* STEP 1: MARKET TYPE */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-['Geist'] text-lg font-bold text-white mb-1">Choose Market Type</h2>
              <p className="text-[#a1a1aa] text-xs">
                Select whether outcomes will resolve automatically via crypto price feeds or manually via custom questions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campus / Custom Event Option */}
              <div
                onClick={() => handleCategorySelect('CAMPUS_EVENT')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  form.marketCategory === 'CAMPUS_EVENT'
                    ? 'border-white bg-[#27272A]/70 shadow-lg shadow-white/5 ring-1 ring-white/30'
                    : 'border-[#27272A] bg-[#1a1a1c]/60 hover:border-[#3f3f46] hover:bg-[#202022]'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="font-['Epilogue'] text-base font-bold text-white">Campus & Custom Event</h3>
                  <p className="text-[#a1a1aa] text-xs leading-relaxed">
                    Create questions for hackathons, club elections, sports matches, or custom trivia. You declare the winning outcome with 1-click settlement.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">
                  <span>Manual / 1-Click Settlement</span>
                  <span>→</span>
                </div>
              </div>

              {/* Crypto Price Oracle Option */}
              <div
                onClick={() => handleCategorySelect('CRYPTO_PRICE')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  form.marketCategory === 'CRYPTO_PRICE'
                    ? 'border-white bg-[#27272A]/70 shadow-lg shadow-white/5 ring-1 ring-white/30'
                    : 'border-[#27272A] bg-[#1a1a1c]/60 hover:border-[#3f3f46] hover:bg-[#202022]'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="font-['Epilogue'] text-base font-bold text-white">Live Crypto Oracle</h3>
                  <p className="text-[#a1a1aa] text-xs leading-relaxed">
                    Continuous sequential trading on BTC, ETH, or SOL. Rounds resolve automatically against live Binance spot candlestick oracles.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-['Epilogue'] text-[11px] font-bold text-[#22C55E]">
                  <span>100% Automated Binance TWAP</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: QUESTION & DETAILS */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-['Geist'] text-lg font-bold text-white mb-1">
                {form.marketCategory === 'CRYPTO_PRICE' ? 'Crypto Tournament Setup' : 'Prediction Question & Scope'}
              </h2>
              <p className="text-[#a1a1aa] text-xs">
                {form.marketCategory === 'CRYPTO_PRICE'
                  ? 'Select the underlying cryptocurrency pair and basic tournament details.'
                  : 'Define the prediction topic and clear resolution criteria so participants understand the rules.'}
              </p>
            </div>

            <div>
              <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                Arena Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={form.marketCategory === 'CRYPTO_PRICE' ? "e.g. Fall '26 Quant Trading Open" : "e.g. TreeHacks 2026 Grand Finale"}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
              />
            </div>

            {form.marketCategory !== 'CRYPTO_PRICE' ? (
              <>
                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    Primary Prediction Question *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={form.question}
                    onChange={(e) => set('question', e.target.value)}
                    placeholder="e.g. Will Team NeuroMesh win 1st Place in the AI Track?"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
                  />
                  <p className="text-[10px] text-[#71717A] mt-1">
                    This will be prominently spotlighted on all participant screens and the big auditorium display.
                  </p>
                </div>

                <div>
                  <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                    Resolution Source / Criteria (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.resolutionCriteria}
                    onChange={(e) => set('resolutionCriteria', e.target.value)}
                    placeholder="e.g. Official announcement by judges on stage at closing ceremony"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                  Crypto Asset Pair
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map((pair) => (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => set('asset', pair)}
                      className={`py-3 px-4 rounded-xl border font-['Epilogue'] text-xs font-bold transition-all ${
                        form.asset === pair
                          ? 'border-white bg-[#27272A] text-white shadow'
                          : 'border-[#27272A] bg-[#18181B] text-[#a1a1aa] hover:border-[#3f3f46]'
                      }`}
                    >
                      {pair.replace('USDT', ' / USDT')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                  Host / Club Name
                </label>
                <input
                  type="text"
                  value={form.hostName}
                  onChange={(e) => set('hostName', e.target.value)}
                  placeholder="e.g. Stanford FinTech Club"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
                />
              </div>

              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                  College / Institution Name (Optional)
                </label>
                <input
                  type="text"
                  value={form.collegeName}
                  onChange={(e) => set('collegeName', e.target.value)}
                  placeholder="e.g. MIT / IIT Delhi"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
                />
              </div>
            </div>

            <div>
              <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                Overview / Fest Description (Optional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Brief context or instructions for attendees..."
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Geist'] text-sm focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
              />
            </div>
          </div>
        )}

        {/* STEP 3: ROUND TIMER & TOURNAMENT ECONOMY */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-['Geist'] text-lg font-bold text-white mb-1">Select Round Timer & Stakes</h2>
              <p className="text-[#a1a1aa] text-xs">
                Configure how long trading remains open and starting wallet balances.
              </p>
            </div>

            {/* ROUND TIME SELECTOR */}
            <div>
              <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                Round Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                {ROUND_DURATION_PRESETS.map((preset) => {
                  const isSelected = !isCustomDuration && form.roundDurationSec === preset.sec;
                  return (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => handleDurationSelect(preset.sec)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-white bg-[#27272A] text-white shadow ring-1 ring-white/20'
                          : 'border-[#27272A] bg-[#18181B] text-[#a1a1aa] hover:border-[#3f3f46] hover:bg-[#1f1f23]'
                      }`}
                    >
                      <span className="font-['Epilogue'] text-xs font-bold">{preset.label}</span>
                      <span className="text-[10px] text-[#71717A] mt-1">{preset.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Duration Toggle */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(true)}
                  className={`px-3 py-1.5 rounded-lg border font-['Epilogue'] text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    isCustomDuration
                      ? 'border-white bg-[#27272A] text-white'
                      : 'border-[#27272A] bg-[#18181B] text-[#71717A] hover:text-[#a1a1aa]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>Custom Time</span>
                </button>
                {isCustomDuration && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      max="1440"
                      step="0.5"
                      value={customDurationMin}
                      onChange={(e) => handleCustomDurationChange(e.target.value)}
                      placeholder="Minutes"
                      className="w-24 bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                    />
                    <span className="text-[#a1a1aa] text-xs">minutes ({form.roundDurationSec} seconds)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#27272A]">
              {/* STARTING BALANCE */}
              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                  Starting Points Balance
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {STARTING_BALANCE_PRESETS.map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => set('startingBalance', pts)}
                      className={`px-3 py-1.5 rounded-lg border font-['Epilogue'] text-xs font-bold transition-all ${
                        form.startingBalance === pts
                          ? 'border-white bg-[#27272A] text-white'
                          : 'border-[#27272A] bg-[#18181B] text-[#a1a1aa] hover:border-[#3f3f46]'
                      }`}
                    >
                      {formatPoints(pts)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={100}
                  max={1000000}
                  value={form.startingBalance}
                  onChange={(e) => set('startingBalance', Number(e.target.value))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                />
              </div>

              {/* TOTAL ROUNDS */}
              <div>
                <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                  Total Rounds in Tournament
                </label>
                <div className="flex gap-2 mb-2">
                  {[1, 3, 5, 12].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => set('totalRounds', count)}
                      className={`flex-1 py-1.5 rounded-lg border font-['Epilogue'] text-xs font-bold transition-all ${
                        form.totalRounds === count
                          ? 'border-white bg-[#27272A] text-white'
                          : 'border-[#27272A] bg-[#18181B] text-[#a1a1aa] hover:border-[#3f3f46]'
                      }`}
                    >
                      {count} {count === 1 ? 'Round' : 'Rounds'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.totalRounds}
                  onChange={(e) => set('totalRounds', Number(e.target.value))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-white font-['Geist'] text-xs focus:border-white focus:outline-none"
                />
              </div>
            </div>

            {/* AI NOISE TRADER BOTS TOGGLE */}
            <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-['Epilogue'] text-xs font-bold text-white uppercase">
                    AI Noise Traders & Market Makers
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#27272A] text-[#c4c7c8] border border-[#3f3f46] text-[9px] font-bold uppercase font-['Epilogue']">
                    Autonomous
                  </span>
                </div>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Automated micro-traders place realistic trades during live rounds to seed initial liquidity before crowd participation surges.
                </p>
              </div>

              <button
                type="button"
                onClick={() => set('enableBots', !form.enableBots)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                  form.enableBots ? 'bg-[#22C55E]' : 'bg-[#27272A]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    form.enableBots ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & LAUNCH */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-['Geist'] text-lg font-bold text-white mb-1">Review & Launch</h2>
              <p className="text-[#a1a1aa] text-xs">
                Check the configuration and customize your access code before opening the lobby.
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider bg-[#201f1f] text-[#c4c7c8] border border-[#27272A]">
                      {form.marketCategory === 'CRYPTO_PRICE' ? 'Live Crypto Oracle' : 'Campus / Custom Prediction'}
                    </span>
                    {form.enableBots && (
                      <span className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] text-[#c4c7c8] text-[10px] font-['Epilogue'] font-bold uppercase">
                        AI Noise Traders Active
                      </span>
                    )}
                  </div>
                  <h3 className="font-['Geist'] text-xl font-bold text-white">{form.name}</h3>
                  <p className="text-xs text-[#a1a1aa] mt-0.5">
                    {form.collegeName && <strong className="text-white">{form.collegeName} · </strong>}
                    {form.hostName ? `Hosted by ${form.hostName}` : 'Campus Arena'}
                  </p>
                </div>
              </div>

              {form.marketCategory !== 'CRYPTO_PRICE' && form.question && (
                <div className="p-3.5 bg-[#202024] rounded-xl border border-[#2e2e33]">
                  <span className="text-[10px] font-['Epilogue'] font-bold text-[#a1a1aa] uppercase tracking-wider block mb-1">
                    Prediction Question
                  </span>
                  <p className="font-['Geist'] text-sm font-semibold text-white">{form.question}</p>
                  {form.resolutionCriteria && (
                    <p className="text-xs text-[#a1a1aa] mt-1.5">
                      <strong className="text-[#d4d4d8]">Criteria:</strong> {form.resolutionCriteria}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#27272A] text-center">
                <div className="p-2.5 bg-[#202024] rounded-xl">
                  <span className="text-[10px] text-[#71717A] uppercase font-['Epilogue'] font-bold block">Duration</span>
                  <span className="font-['Geist'] text-sm font-bold text-white">{formatDuration(form.roundDurationSec)}</span>
                </div>
                <div className="p-2.5 bg-[#202024] rounded-xl">
                  <span className="text-[10px] text-[#71717A] uppercase font-['Epilogue'] font-bold block">Points</span>
                  <span className="font-['Geist'] text-sm font-bold text-white">{formatPoints(form.startingBalance)}</span>
                </div>
                <div className="p-2.5 bg-[#202024] rounded-xl">
                  <span className="text-[10px] text-[#71717A] uppercase font-['Epilogue'] font-bold block">Rounds</span>
                  <span className="font-['Geist'] text-sm font-bold text-white">{form.totalRounds}</span>
                </div>
              </div>
            </div>

            {/* Custom Code Input */}
            <div>
              <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1.5">
                Custom Join Code (Optional)
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="e.g. HACK26"
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-white font-['Epilogue'] text-sm font-bold uppercase tracking-widest focus:border-white focus:outline-none transition-colors placeholder-[#71717A]"
              />
              <p className="text-[10px] text-[#71717A] mt-1">
                Leave blank to automatically generate a clean 4-character join code.
              </p>
            </div>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] transition-all"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-md shadow-white/10"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="px-8 py-3 rounded-full bg-white text-black font-['Epilogue'] text-sm font-bold hover:bg-[#e4e4e7] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/20"
            >
              {pending ? <Spinner className="border-black border-t-transparent" /> : null}
              <span>{pending ? 'Creating Arena…' : 'Launch Arena Lobby'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
