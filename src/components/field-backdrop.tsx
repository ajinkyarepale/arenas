'use client';

import { useEffect, useRef } from 'react';

import { cx } from '@/lib/format';

/**
 * The animated backdrop: a drifting particle field with links between near
 * neighbours, plus a slow travelling wave.
 *
 * It is decorative, so it is built to be cheap and to get out of the way:
 * it caps its own particle count on small screens, pauses entirely when the
 * tab is hidden, and renders nothing at all when the visitor has asked for
 * reduced motion.
 */
export function FieldBackdrop({
  className,
  density = 1,
}: {
  className?: string;
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    interface Dot {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }
    let dots: Dot[] = [];

    const seed = () => {
      // Roughly one dot per 14k device-independent pixels, capped so a large
      // desktop does not quietly turn this into a heat source.
      const target = Math.min(90, Math.floor(((width * height) / 14000) * density));
      dots = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.5,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let t = 0;
    const LINK_DISTANCE = 120;

    const frame = () => {
      if (!running) return;
      t += 0.004;

      ctx.clearRect(0, 0, width, height);

      // Travelling wave — a slow horizon line that gives the field a sense of
      // depth without drawing attention to itself.
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y =
          height * 0.62 +
          Math.sin(x * 0.006 + t * 2) * 18 +
          Math.sin(x * 0.013 - t * 1.3) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(61, 155, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Links first, so dots sit on top of them.
      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.22;
            ctx.strokeStyle = `rgba(61, 155, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Wrap rather than bounce — bouncing makes the edges legible.
        if (dot.x < -10) dot.x = width + 10;
        if (dot.x > width + 10) dot.x = -10;
        if (dot.y < -10) dot.y = height + 10;
        if (dot.y > height + 10) dot.y = -10;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(163, 201, 255, 0.55)';
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    /**
     * A backgrounded tab should not keep animating.
     *
     * Becoming visible always re-requests a frame rather than checking a
     * `running` flag first: a page that *loaded* while hidden never had its
     * initial frame delivered (browsers do not fire rAF for hidden documents),
     * so a flag-guarded restart would leave the canvas permanently blank for
     * anyone who opened the site in a background tab.
     */
    const start = () => {
      running = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (document.visibilityState !== 'hidden') start();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
