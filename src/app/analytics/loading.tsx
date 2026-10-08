import { Skeleton } from '@/components/ui';

export default function AnalyticsLoading() {
  return (
    <div className="bg-[#000000] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* Sidebar Silhouette placeholder */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-40 bg-[#000000] border-r border-[#27272A] p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-1">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-[#27272A]/50">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Top Navbar */}
        <header className="hidden md:flex top-0 sticky bg-[#000000]/80 border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </header>

        {/* Analytics Body */}
        <main className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6">
          {/* Header Masthead */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-72 md:w-96" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          {/* 4 KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-2.5 backdrop-blur-md"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-36" />
              </div>
            ))}
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[rgba(20,20,20,0.7)] p-2 rounded-xl border border-[#27272A] backdrop-blur-md">
            <div className="flex items-center gap-1.5 p-1 bg-[#141414] rounded-lg border border-[#27272A]">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
          </div>

          {/* Tournaments Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] h-64 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16 rounded-lg" />
                      <Skeleton className="h-5 w-12 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-5/6" />
                  <Skeleton className="h-4 w-1/2" />
                </div>

                <div className="space-y-3 pt-3 border-t border-[#27272A]/50">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
