import { Skeleton } from '@/components/ui';

export default function AdminLoading() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* Sidebar Silhouette */}
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

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Top Navbar */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-52" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>

          {/* 3 Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-2.5 backdrop-blur-md"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>

          {/* Arena Management List Rows */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center backdrop-blur-md"
              >
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-64" />
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end mt-2 md:mt-0">
                  <Skeleton className="h-9 w-24 rounded-full" />
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
