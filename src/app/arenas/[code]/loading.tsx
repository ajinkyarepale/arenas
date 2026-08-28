import { KokonutLoader } from '@/components/ui';

export default function ArenaLoading() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex items-center justify-center">
      <KokonutLoader
        title="Entering prediction arena..."
        subtitle="Connecting live WebSocket tape and realtime price feeds"
        size="md"
      />
    </div>
  );
}
