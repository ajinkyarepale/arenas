import { KokonutLoader } from '@/components/ui';

export default function MarketsLoading() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex items-center justify-center">
      <KokonutLoader
        title="Loading live markets..."
        subtitle="Fetching continuous LMSR books and active tournament rooms"
        size="md"
      />
    </div>
  );
}
