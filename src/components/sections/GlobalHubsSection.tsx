interface GlobalHubsSectionProps {
  onJoinWaitlist: (hubName: string) => void;
}

export function GlobalHubsSection({ onJoinWaitlist }: GlobalHubsSectionProps) {
  const hubs = [
    {
      id: 'hk',
      code: 'HK',
      title: 'Hong Kong Entity',
      description: 'Gateway to Asia with world-class financial infrastructure',
      badgeColor: 'bg-orange-50 border-orange-200 text-[#F04623]',
    },
    {
      id: 'uae',
      code: 'UAE',
      title: 'Dubai, UAE Freezone',
      description: '0% Personal & Capital tax for global digital businesses',
      badgeColor: 'bg-amber-50 border-amber-200 text-amber-600',
    },
  ];

  return (
    <section className="py-20 border-b border-slate-200 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] text-[#c52e0f] mb-3 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#F04623] animate-ping" />
            GLOBAL HUBS EXPANSION
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
            Dubai &amp; Hong Kong Company Setup
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-2">
            Ready to expand beyond the US? Launch offshore and free zone corporations with matching banking
            support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {hubs.map((hub) => (
            <div
              key={hub.id}
              className="card-glass p-6 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${hub.badgeColor}`}
                >
                  {hub.code}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">{hub.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{hub.description}</p>
                </div>
              </div>

              <button
                onClick={() => onJoinWaitlist(hub.title)}
                type="button"
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-[#F04623] text-xs font-semibold text-slate-800 border border-slate-300 transition-colors flex-shrink-0 cursor-pointer"
              >
                Join Waitlist
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
