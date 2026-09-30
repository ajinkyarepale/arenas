import { Skeleton } from '@/components/ui';

export default function ArenasLoading() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* Sidebar Silhouette placeholder on desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-40 bg-[#141414] border-r border-[#27272A] p-4 justify-between">
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

      {/* Main Content Skeleton Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Top Navbar */}
        <header className="hidden md:flex top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </header>

        {/* Catalog Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>

          {/* Search & Filter pills row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[rgba(20,20,20,0.7)] p-2 rounded-xl border border-[#27272A]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-full sm:w-64 rounded-lg" />
          </div>

          {/* Tournament Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between h-56 backdrop-blur-md"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>

                <div className="pt-4 border-t border-[#27272A]/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
