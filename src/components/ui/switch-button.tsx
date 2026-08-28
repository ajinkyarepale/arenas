'use client';

/**
 * Switch Button with rotating sun icon and shimmer hover effect.
 * Built with React and Tailwind CSS.
 */

import { Sun } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SwitchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'minimal';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function SwitchButton({
  className,
  variant = 'minimal',
  size = 'default',
  showLabel = true,
  ...props
}: SwitchButtonProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const variants = {
    minimal: [
      'rounded-lg',
      'bg-gradient-to-b from-[#27272A] to-[#18181B]',
      'hover:from-[#3f3f46] hover:to-[#27272A]',
      'border border-[#3f3f46]',
      'shadow-[0_1px_3px_rgb(0,0,0,0.4)]',
      'hover:shadow-[0_2px_6px_rgb(0,0,0,0.6)]',
      'transition-all duration-200 ease-out',
      'backdrop-blur-sm',
      'relative',
    ],
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-9 px-4 text-xs',
    lg: 'h-10 px-5 text-sm',
  };

  return (
    <button
      className={cn(
        'group relative overflow-hidden inline-flex items-center justify-center font-["Epilogue"] font-bold cursor-pointer',
        'transition-all duration-300 ease-out',
        'text-[#c4c7c8]',
        'hover:text-white',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={handleThemeToggle}
      type="button"
      {...props}
    >
      <div className="flex items-center gap-2 transition-all duration-300 ease-out z-10">
        <Sun
          className={cn(
            'transition-all duration-700 ease-in-out',
            size === 'sm' && 'h-3.5 w-3.5',
            size === 'default' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5',
            'group-hover:rotate-[360deg] group-hover:scale-110',
            theme === 'dark' ? 'rotate-180 text-[#22C55E]' : 'rotate-0 text-amber-400',
            'transform-gpu'
          )}
        />
        {showLabel && (
          <span className="relative font-medium capitalize transition-opacity duration-300 ease-out">
            <span className="text-white">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </span>
        )}
      </div>

      <span
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-r from-transparent via-white/[0.08] to-transparent',
          'translate-x-[-100%]',
          'group-hover:translate-x-[100%]',
          'transition-transform duration-500',
          'ease-in-out',
          'pointer-events-none',
          'z-[1]'
        )}
      />
    </button>
  );
}

export default SwitchButton;
