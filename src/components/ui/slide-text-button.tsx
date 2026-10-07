'use client';

/**
 * Slide Text Button with animated vertical text transition on hover.
 * Built with React, Motion, and Tailwind CSS.
 */

import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SlideTextButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  text?: string;
  hoverText?: string;
  href?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'emerald';
}

export function SlideTextButton({
  text = 'Explore Markets',
  hoverText,
  href = '/markets',
  className,
  variant = 'default',
  ...props
}: SlideTextButtonProps) {
  const slideText = hoverText ?? text;
  const variantStyles =
    variant === 'ghost'
      ? 'border border-slate-300 dark:border-[#3f3f46] text-slate-800 dark:text-[#e5e2e1] hover:bg-slate-100 dark:hover:bg-[#27272A] bg-white/60 dark:bg-transparent shadow-sm dark:shadow-none'
      : variant === 'emerald'
      ? 'bg-[#16a34a] dark:bg-[#22C55E] text-white dark:text-black hover:bg-[#15803d] dark:hover:bg-[#1ea750] shadow-md shadow-[#22C55E]/10'
      : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-[#e4e4e7] shadow-md dark:shadow-lg';

  return (
    <motion.div
      animate={{ x: 0, opacity: 1, transition: { duration: 0.2 } }}
      className="relative inline-block"
      initial={{ x: 20, opacity: 0 }}
    >
      <Link
        className={cn(
          'group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-full px-7 font-["Epilogue"] font-bold text-xs uppercase tracking-wider transition-all duration-300',
          variantStyles,
          className
        )}
        href={href}
        {...props}
      >
        <span className="relative flex flex-col items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
          <span className={cn(
            "flex items-center justify-center gap-2 opacity-100 transition-opacity duration-300 group-hover:opacity-0 whitespace-nowrap",
            variant === 'default' ? '!text-white dark:!text-black' : variant === 'emerald' ? 'text-white dark:text-black' : 'text-slate-800 dark:text-[#e5e2e1]'
          )}>
            <span>{text}</span>
          </span>
          <span className={cn(
            "absolute top-full flex items-center justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap",
            variant === 'default' ? '!text-white dark:!text-black' : variant === 'emerald' ? 'text-white dark:text-black' : 'text-slate-800 dark:text-[#e5e2e1]'
          )}>
            <span>{slideText}</span>
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

export default SlideTextButton;
