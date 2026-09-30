import { Skeleton } from '@/components/ui';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Geist'] flex flex-col">
      {/* Top Navigation Skeleton */}
      <header className="h-16 px-6 border-b border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-8">
        {/* Title & subtitle skeleton */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64 md:w-80" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        {/* Metric Cards Skeleton Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-3 backdrop-blur-md"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>

        {/* Content Section Skeleton */}
        <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-6 flex flex-col gap-4 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-[#141414] border border-[#27272A]/50 flex items-center px-4 justify-between"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
