import { Skeleton } from '@/components/ui';

export default function ArenaLoading() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#e5e2e1] font-['Geist'] flex flex-col antialiased">
      {/* Top Arena Header Bar */}
      <header className="h-16 px-4 md:px-6 border-b border-[#27272A] bg-[#000000]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      {/* Main Terminal Workspace */}
      <main className="flex-1 p-3 md:p-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Center: Market Chart & Graph Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Market Question & Round Header Card */}
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-3 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-4/5" />
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Crowd Graph / Price Chart Skeleton Box */}
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-6 h-[400px] flex flex-col justify-between backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-7 w-12 rounded-md" />
                <Skeleton className="h-7 w-12 rounded-md" />
                <Skeleton className="h-7 w-12 rounded-md" />
              </div>
            </div>

            {/* Chart Area Silhouette */}
            <div className="flex-1 my-6 flex items-center justify-center">
              <div className="w-full h-full border border-dashed border-[#27272A]/40 rounded-lg flex items-center justify-center">
                <Skeleton className="h-1 w-3/4 rounded-full" />
              </div>
            </div>

            {/* Chart Footer Odds */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#27272A]/50">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#27272A]/50">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-14" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#27272A]/50">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          </div>

          {/* Orderbook / Recent Activity Table Skeleton */}
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-3 backdrop-blur-md">
            <div className="flex items-center gap-4 border-b border-[#27272A] pb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-[#141414] flex items-center px-4 justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order Entry Trade Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-5 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* YES / NO Toggle Pill Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#141414] rounded-xl border border-[#27272A]">
              <Skeleton className="h-11 rounded-lg" />
              <Skeleton className="h-11 rounded-lg" />
            </div>

            {/* Stake Input Area */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Quick Stake Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 p-3 rounded-lg bg-[#141414] border border-[#27272A]/50">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Submit Button */}
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
