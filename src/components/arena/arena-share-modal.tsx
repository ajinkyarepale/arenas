'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface ArenaShareModalProps {
  code: string;
  name: string;
  asset?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ArenaShareModal({
  code,
  name,
  asset,
  isOpen,
  onClose,
}: ArenaShareModalProps) {
  const [origin, setOrigin] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const joinUrl = origin ? `${origin}/arenas/${code}` : `/arenas/${code}`;

  useEffect(() => {
    if (!isOpen || !joinUrl) return;

    QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#141414',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = joinUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${name} — Arena Tournament`,
          text: `Join the live prediction market tournament for ${name} (${code})!`,
          url: joinUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback to copy link
      await handleCopy();
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Arena-${code}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#18181b] border border-[#27272A] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-white font-['Geist']"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-['Epilogue'] text-[10px] font-bold text-[#22C55E] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
              Share &amp; Invite
            </span>
            <h3 className="font-['Geist'] text-xl font-bold text-white mt-1.5">{name}</h3>
            <p className="font-['Epilogue'] text-xs text-[#c4c7c8] mt-0.5">
              Unique join link &amp; scannable QR code for Arena <span className="font-bold text-white uppercase">{code}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#27272A]/50 hover:bg-[#27272A] flex items-center justify-center text-[#c4c7c8] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#141414] border border-[#27272A]">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code to join Arena ${code}`}
              className="w-56 h-56 rounded-lg border border-[#27272A] shadow-inner"
            />
          ) : (
            <div className="w-56 h-56 rounded-lg bg-[#201f1f] animate-pulse flex items-center justify-center text-xs text-[#c4c7c8]">
              Generating QR...
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
              Join Code:
            </span>
            <span className="font-mono text-base font-bold text-[#22C55E] tracking-widest px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/20">
              {code}
            </span>
          </div>
        </div>

        {/* Join URL Display */}
        <div className="flex flex-col gap-1.5">
          <label className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
            Direct Join URL
          </label>
          <div className="flex items-center gap-2 bg-[#201f1f] border border-[#27272A] rounded-xl px-3 py-2">
            <span className="font-mono text-xs text-[#e5e2e1] truncate flex-1 select-all">
              {joinUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 bg-white text-[#2f3131] hover:bg-[#c6c6c7] rounded-lg font-['Epilogue'] text-xs font-bold transition-colors shrink-0"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#27272A]">
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-2.5 px-4 rounded-full bg-[#201f1f] border border-[#27272A] text-white hover:bg-[#2a2a2a] font-['Epilogue'] text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span>{shared ? '✓ Shared' : '🔗 Share Link'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadQR}
            className="w-full py-2.5 px-4 rounded-full bg-white text-[#2f3131] hover:bg-[#c6c6c7] font-['Epilogue'] text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span>⬇ Download QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Embedded standalone card for showing QR code inside Control Panel or Big Screen.
 */
export function ArenaQRCodeCard({
  code,
  joinUrl,
  size = 180,
  showDownload = true,
}: {
  code: string;
  joinUrl: string;
  size?: number;
  showDownload?: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#141414',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [joinUrl, size]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center bg-[#141414] border border-[#27272A] rounded-xl p-4 text-center">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={`Scan to join Arena ${code}`}
          style={{ width: size, height: size }}
          className="rounded-lg border border-[#27272A]"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-lg bg-[#201f1f] animate-pulse flex items-center justify-center text-xs text-[#c4c7c8]"
        >
          Loading QR...
        </div>
      )}
      <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
        <span className="font-mono text-sm font-bold text-[#22C55E] tracking-widest">
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] font-['Epilogue'] font-medium text-[#c4c7c8] hover:text-white underline transition-colors"
        >
          {copied ? '✓ Link copied!' : 'Copy join URL'}
        </button>
      </div>
    </div>
  );
}
