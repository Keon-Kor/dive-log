export default function Loading() {
    return (
        <div className="min-h-screen bg-background text-text-primary pb-safe">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="w-6 h-6 bg-slate-800 rounded-full animate-pulse" />
                    <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
                    <div className="w-8 h-8 bg-slate-800 rounded-full animate-pulse" />
                </div>
            </header>

            <main className="max-w-md mx-auto px-5 py-6 space-y-8">
                {/* Hero Skeleton */}
                <section className="text-center space-y-3">
                    <div className="w-48 h-8 bg-slate-800 rounded mx-auto animate-pulse" />
                    <div className="w-32 h-4 bg-slate-800 rounded mx-auto animate-pulse" />
                </section>

                {/* Stats Skeleton */}
                <section className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-toss p-4 flex flex-col items-center justify-center gap-2 h-24">
                            <div className="w-12 h-3 bg-slate-700 rounded animate-pulse" />
                            <div className="w-16 h-6 bg-slate-700 rounded animate-pulse" />
                        </div>
                    ))}
                </section>

                {/* Photo Skeleton */}
                <section className="space-y-3">
                    <div className="w-20 h-6 bg-slate-800 rounded animate-pulse" />
                    <div className="flex gap-3 overflow-hidden">
                        <div className="w-64 aspect-[4/3] bg-slate-800 rounded-2xl flex-none animate-pulse" />
                        <div className="w-10 aspect-[4/3] bg-slate-800 rounded-l-2xl flex-none animate-pulse" />
                    </div>
                </section>

                {/* Details Skeleton */}
                <section className="space-y-3">
                    <div className="w-20 h-6 bg-slate-800 rounded animate-pulse" />
                    <div className="card-toss space-y-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="w-16 h-3 bg-slate-700 rounded animate-pulse" />
                                <div className="w-full h-4 bg-slate-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
