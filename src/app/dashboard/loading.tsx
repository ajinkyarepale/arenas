import { Skeleton } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="bg-[#000000] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* Sidebar Silhouette */}
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
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0">
        {/* Top Navbar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[#000000]/80 border-b border-[#27272A] backdrop-blur-xl z-30">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-4 ml-auto">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </header>

        {/* Canvas Content */}
        <div className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6">
          {/* User Profile Masthead */}
          <section className="bg-[rgba(20,20,20,0.7)] backdrop-blur-xl border border-[#27272A] rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Skeleton className="h-10 w-36 rounded-full" />
            </div>
          </section>

          {/* 4 Stat Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-2 backdrop-blur-md"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>

          {/* Activity / Predictions Table Skeleton */}
          <section className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-6 flex flex-col gap-4 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-[#141414] border border-[#27272A]/50 flex items-center px-4 justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
