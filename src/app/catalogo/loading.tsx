import { Skeleton, WineCardSkeleton } from '@/components/ui';

export default function CatalogoLoading() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <WineCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
