'use client';

/**
 * Stack of product cards that expands on click to reveal details and specs.
 * Allows clicking on any card to bring it to full front view with interactive specs.
 * Animated with Motion and styled with React and Tailwind CSS.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Specification {
  label: string;
  value: string;
}

export interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  specs: Specification[];
}

const DEFAULT_ITEMS: CardItem[] = [
  {
    id: 'lmsr-engine',
    title: 'LMSR Engine',
    subtitle: 'Automated Market Maker',
    description:
      'Continuous logarithmic scoring rule guarantees liquidity for any stake with instant pricing and no order book stall.',
    badge: 'Core Engine',
    specs: [
      { label: 'Settlement', value: 'Instant' },
      { label: 'Liquidity', value: 'Dynamic B' },
      { label: 'Latency', value: '< 20ms' },
      { label: 'Capacity', value: '10,000+' },
    ],
  },
  {
    id: 'crypto-oracle',
    title: 'Crypto TWAP',
    subtitle: 'Binance Live Oracle',
    description:
      'Fast-paced 1m, 2m, and 5m candle rounds settle automatically against real-time Binance spot candlestick TWAPs.',
    badge: 'Algorithmic',
    specs: [
      { label: 'Asset Pairs', value: 'BTC/ETH/SOL' },
      { label: 'Oracle', value: 'TWAP 1s' },
      { label: 'Resolution', value: '100% Auto' },
      { label: 'Frequency', value: 'Consecutive' },
    ],
  },
  {
    id: 'campus-arenas',
    title: 'Campus Markets',
    subtitle: 'Fest & Hackathons',
    description:
      'Launch custom prediction questions for college fests, sports derbies, or hackathon tracks with 1-click winner resolution.',
    badge: 'Turn-Key',
    specs: [
      { label: 'Branding', value: 'College Name' },
      { label: 'Access', value: 'Private Code' },
      { label: 'Resolution', value: '1-Click' },
      { label: 'Ledger', value: 'Zero Risk' },
    ],
  },
  {
    id: 'big-screen',
    title: 'Big Screen',
    subtitle: 'Auditorium Projector',
    description:
      'Full-screen projector display with live crowd probability curves, round timers, QR codes, and top forecaster podiums.',
    badge: 'Broadcast',
    specs: [
      { label: 'Display', value: '4K Ready' },
      { label: 'Sync', value: 'Socket.IO' },
      { label: 'Podium', value: 'Live Top 10' },
      { label: 'Export', value: 'CSV 1-Click' },
    ],
  },
];

const CARD_WIDTH = 340;

interface CardStackProps {
  className?: string;
  items?: CardItem[];
}

export function CardStack({ className, items = DEFAULT_ITEMS }: CardStackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion() ?? false;

  const totalCards = items.length;

  const handleCardClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!isExpanded) {
      setIsExpanded(true);
      setActiveIndex(index);
    } else {
      if (activeIndex === index) {
        // Toggle collapse if clicking the currently active front card
        setIsExpanded(false);
      } else {
        // Bring clicked card to the front
        setActiveIndex(index);
      }
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-6 select-none', className)}>
      {/* Quick Select Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-full px-2">
        {items.map((item, idx) => {
          const isActive = isExpanded && activeIndex === idx;
          return (
            <button
              key={item.id}
              onClick={() => {
                setIsExpanded(true);
                setActiveIndex(idx);
              }}
              type="button"
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-["Epilogue"] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-white text-black shadow-md scale-105'
                  : 'bg-[#201f1f] text-[#a1a1aa] border border-[#27272A] hover:text-white hover:border-[#3f3f46]'
              )}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stack Container */}
      <div
        className="relative mx-auto min-h-[460px] w-full max-w-[90vw] md:max-w-[1100px] flex items-center justify-center cursor-pointer py-4"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {items.map((item, index) => {
          const isActive = isExpanded && activeIndex === index;

          // Compute horizontal spread geometry
          // When expanded: spacing of 160px on desktop so titles and bodies are visible, with the active card elevated in front!
          const spreadStep = 180;
          const totalSpread = (totalCards - 1) * spreadStep;
          const spreadX = index * spreadStep - totalSpread / 2;
          const spreadRotate = (index - (totalCards - 1) / 2) * 4;

          // Collapsed stacked geometry
          const defaultX = (index - (totalCards - 1) / 2) * 14;
          const defaultY = index * 4;
          const defaultRotate = (index - (totalCards - 1) / 2) * 2;

          const collapsedPose = {
            x: defaultX,
            y: defaultY,
            rotate: reducedMotion ? 0 : defaultRotate,
            scale: 1,
            zIndex: totalCards - index,
          };

          const expandedPose = {
            x: spreadX,
            y: isActive ? -18 : 0,
            rotate: reducedMotion ? 0 : isActive ? 0 : spreadRotate,
            scale: isActive ? 1.05 : 0.96,
            zIndex: isActive ? 50 : totalCards - Math.abs(activeIndex - index),
          };

          return (
            <motion.div
              key={item.id}
              onClick={(e) => handleCardClick(e, index)}
              animate={isExpanded ? expandedPose : collapsedPose}
              initial={collapsedPose}
              transition={
                reducedMotion
                  ? { duration: 0.2, ease: 'easeOut' }
                  : {
                      type: 'spring',
                      stiffness: 240,
                      damping: 26,
                      mass: 1,
                      delay: isExpanded && !isActive ? index * 0.02 : 0,
                    }
              }
              style={{
                maxWidth: `${CARD_WIDTH}px`,
                left: '50%',
                marginLeft: `-${CARD_WIDTH / 2}px`,
              }}
              className={cn(
                'absolute inset-0 w-full rounded-2xl p-6 text-left cursor-pointer',
                'bg-[#18181b]/95 backdrop-blur-2xl backdrop-saturate-150',
                'border transition-[border-color,box-shadow,transform] duration-300 ease-out',
                'transform-gpu overflow-hidden',
                isActive
                  ? 'border-[#22C55E] shadow-[0_16px_50px_rgba(34,197,94,0.18)] ring-1 ring-[#22C55E]/40'
                  : 'border-[#27272A] shadow-[0_8px_30px_rgb(0,0,0,0.6)] hover:border-[#3f3f46] hover:shadow-[0_12px_40px_rgb(0,0,0,0.8)]'
              )}
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  {/* Top Specs Grid */}
                  <dl className="mb-4 grid grid-cols-4 justify-center gap-2 border-b border-[#27272A] pb-3">
                    {item.specs.map((spec) => (
                      <div className="flex flex-col items-start text-left text-[10px]" key={spec.label}>
                        <dd className="w-full text-left font-bold text-white truncate font-mono">
                          {spec.value}
                        </dd>
                        <dt className="mb-0.5 w-full text-left text-[#71717A] text-[9px] font-['Epilogue'] uppercase">
                          {spec.label}
                        </dt>
                      </div>
                    ))}
                  </dl>

                  {/* Card Badge & Visual Banner */}
                  <div
                    className={cn(
                      'relative aspect-[16/9] w-full overflow-hidden rounded-xl',
                      'bg-[#202024] border border-[#27272A]',
                      'flex flex-col justify-between p-4'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#131313] border border-[#27272A] text-[#22C55E] text-[10px] font-bold uppercase font-['Epilogue'] tracking-wider">
                        {item.badge || 'Platform Feature'}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    </div>

                    <div>
                      <div className="text-white text-base font-bold font-['Geist'] tracking-tight">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#a1a1aa] font-['Epilogue']">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Bottom */}
                <div className="mt-4">
                  <p className="text-left text-[#a1a1aa] text-xs font-['Geist'] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center font-['Epilogue'] text-xs font-semibold text-[#71717A] tracking-wider uppercase">
        {isExpanded
          ? 'Click any card or tab to bring it to full front view'
          : 'Click stack to expand and explore tournament features'}
      </p>
    </div>
  );
}

export default CardStack;
