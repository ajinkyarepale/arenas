'use client';

/**
 * Animated background of drifting light beams rendered on an HTML canvas with configurable intensity.
 * Built with React, Tailwind CSS and Motion.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10;
  // Radiant azure, cobalt, and cyan hues
  const hueBase = 205;
  const hueRange = 40;

  return {
    x: Math.random() * width * 1.4 - width * 0.2,
    y: Math.random() * height * 1.4 - height * 0.2,
    width: 70 + Math.random() * 90,
    length: height * 2.4,
    angle,
    speed: 0.6 + Math.random() * 0.8,
    opacity: 0.18 + Math.random() * 0.14,
    hue: hueBase + Math.random() * hueRange,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.025,
  };
}

export function BeamsBackground({
  className,
  children,
  intensity = 'medium',
}: AnimatedGradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);
  const MINIMUM_BEAMS = 15;

  const opacityMap = {
    subtle: 0.6,
    medium: 0.8,
    strong: 1.0,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const logicalWidth = window.innerWidth;
      const logicalHeight = window.innerHeight;

      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const totalBeams = MINIMUM_BEAMS;
      beamsRef.current = Array.from({ length: totalBeams }, () =>
        createBeam(logicalWidth, logicalHeight)
      );
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    function resetBeam(beam: Beam, index: number, totalBeams: number) {
      if (!canvas) return beam;

      const logicalWidth = window.innerWidth;
      const logicalHeight = window.innerHeight;

      const column = index % 3;
      const spacing = logicalWidth / 3;

      const hueBase = 205;
      const hueRange = 40;

      beam.y = logicalHeight + 60;
      beam.x =
        column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.6;
      beam.width = 70 + Math.random() * 80;
      beam.speed = 0.5 + Math.random() * 0.6;
      beam.hue = hueBase + (index * hueRange) / totalBeams;
      beam.opacity = 0.18 + Math.random() * 0.14;
      return beam;
    }

    function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity =
        beam.opacity *
        (0.8 + Math.sin(beam.pulse) * 0.2) *
        opacityMap[intensity];

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

      const saturation = '65%';
      const lightness = '55%';

      gradient.addColorStop(
        0,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`
      );
      gradient.addColorStop(
        0.15,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${
          pulsingOpacity * 0.5
        })`
      );
      gradient.addColorStop(
        0.45,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`
      );
      gradient.addColorStop(
        0.7,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`
      );
      gradient.addColorStop(
        0.9,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${
          pulsingOpacity * 0.5
        })`
      );
      gradient.addColorStop(
        1,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`
      );

      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    }

    function animate() {
      if (!(canvas && ctx)) return;

      const logicalWidth = window.innerWidth;
      const logicalHeight = window.innerHeight;
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;

        if (beam.y + beam.length < -60) {
          resetBeam(beam, index, totalBeams);
        }

        drawBeam(ctx, beam);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [intensity]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#f8fafc] dark:bg-[#000000]">
      {/* Ambient beams canvas with mobile-safe GPU-accelerated blur */}
      <canvas
        className="pointer-events-none fixed inset-0 z-0 opacity-15 dark:opacity-70 blur-[18px] md:blur-[28px] transform-gpu will-change-transform"
        ref={canvasRef}
      />

      <div className={cn('relative z-10 w-full min-h-screen flex flex-col', className)}>
        {children}
      </div>
    </div>
  );
}

export default BeamsBackground;
