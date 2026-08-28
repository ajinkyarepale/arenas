import { KokonutLoader } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex items-center justify-center">
      <KokonutLoader
        title="Loading trader profile..."
        subtitle="Retrieving tournament history, win rates, and point balance"
        size="md"
      />
    </div>
  );
}
