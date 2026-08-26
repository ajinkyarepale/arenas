import Link from 'next/link';
import { SiteSidebar } from '@/components/site-sidebar';

export default function NotFound() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      <SiteSidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        <header className="flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-40">
          <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="glass-panel border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-2xl w-full max-w-md p-8 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="font-['Epilogue'] text-6xl font-black text-white tracking-widest">
              404
            </div>
            <h1 className="font-['Geist'] text-2xl font-bold text-white">Page Not Found</h1>
            <p className="font-['Geist'] text-xs text-[#c4c7c8] leading-relaxed">
              That arena code does not exist, or the page has moved. Double-check the code your organizer gave you.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href="/markets"
                className="flex-1 bg-white text-[#2f3131] rounded-full py-3 font-['Epilogue'] text-xs font-bold hover:bg-[#c6c6c7] transition-all text-center"
              >
                Browse Markets
              </Link>
              <Link
                href="/"
                className="flex-1 bg-[#201f1f] text-white border border-[#27272A] rounded-full py-3 font-['Epilogue'] text-xs font-bold hover:bg-[#2a2a2a] transition-all text-center"
              >
                Home
              </Link>
            </div>
          </div>
        </div>

        <footer className="w-full mt-auto flex justify-between items-center py-6 px-12 border-t border-[#27272A] bg-[#131313] text-[#c4c7c8] text-xs">
          <p>© 2024 Arenas Markets. All rights reserved.</p>
          <div className="flex gap-6 font-['Epilogue'] text-[11px]">
            <Link href="/guide" className="hover:text-white underline">Legal</Link>
            <Link href="/guide" className="hover:text-white underline">Privacy</Link>
            <Link href="/guide" className="hover:text-white underline">Terms</Link>
            <Link href="/guide" className="hover:text-white underline">Docs</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
