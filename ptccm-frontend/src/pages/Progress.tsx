import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { GameSeries, CardSet } from '../types';
import { BarChart3 } from 'lucide-react';

interface SetProgress extends CardSet {
  owned: number;
  pct: number | null;
}

interface SeriesGroup {
  series: GameSeries;
  sets: SetProgress[];
  totalOwned: number;
  totalCards: number | null;
}

export default function Progress() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SeriesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function fetchData() {
      const [setsData, collectionData] = await Promise.all([
        apiClient.getCardSets(),
        apiClient.getCollection(userId),
      ]);

      // Count distinct cards owned per set
      const ownedPerSet: Record<string, number> = {};
      ((collectionData ?? []) as Array<{ card?: { card_set_id?: string } }>).forEach((row) => {
        const setId = row.card?.card_set_id;
        if (setId) ownedPerSet[setId] = (ownedPerSet[setId] ?? 0) + 1;
      });

      // Group by series
      const seriesMap: Record<string, SeriesGroup> = {};
      ((setsData ?? []) as Array<CardSet & { game_series: GameSeries }>).forEach((s) => {
        const series = s.game_series!;
        if (!seriesMap[series.id]) {
          seriesMap[series.id] = { series, sets: [], totalOwned: 0, totalCards: 0 };
        }
        const owned = ownedPerSet[s.id] ?? 0;
        const pct = s.total_cards ? Math.round((owned / s.total_cards) * 100) : null;
        seriesMap[series.id].sets.push({ ...s, owned, pct });
        seriesMap[series.id].totalOwned += owned;
        if (s.total_cards != null && seriesMap[series.id].totalCards != null) {
          (seriesMap[series.id].totalCards as number) += s.total_cards;
        } else {
          seriesMap[series.id].totalCards = null;
        }
      });

      const result = Object.values(seriesMap).sort((a, b) => b.totalOwned - a.totalOwned);
      setGroups(result);
      // Expand all by default
      setExpandedSeries(new Set(result.map(g => g.series.id)));
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const toggleSeries = (id: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const overallOwned = groups.reduce((s, g) => s + g.totalOwned, 0);

  const progressBarColor = (pct: number | null) => {
    if (pct === null) return 'bg-indigo-400';
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-indigo-500';
    return 'bg-violet-400';
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
        <p className="text-gray-500 mt-1">Track your set completion across all game series</p>
      </div>

      {!loading && overallOwned === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No collection data yet</p>
          <p className="text-sm mt-1">Add cards to your collection to track set progress</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const isExpanded = expandedSeries.has(group.series.id);
            const seriesPct =
              group.totalCards != null && group.totalCards > 0
                ? Math.round((group.totalOwned / group.totalCards) * 100)
                : null;

            return (
              <div key={group.series.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Series Header */}
                <button
                  onClick={() => toggleSeries(group.series.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-base font-semibold text-gray-900">{group.series.name}</h2>
                      <span className="text-sm text-gray-400">
                        {group.totalOwned} unique cards
                        {group.totalCards != null && ` / ${group.totalCards} total`}
                      </span>
                      {seriesPct !== null && (
                        <span className={`ml-auto text-sm font-bold ${seriesPct >= 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                          {seriesPct}%
                        </span>
                      )}
                    </div>
                    {seriesPct !== null && (
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${progressBarColor(seriesPct)}`}
                          style={{ width: `${Math.min(seriesPct, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Set Breakdown */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {group.sets.map(set => (
                      <div key={set.id} className="px-6 py-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700">{set.name}</span>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>
                              {set.owned}
                              {set.total_cards != null ? ` / ${set.total_cards}` : ' cards owned'}
                            </span>
                            {set.pct !== null && (
                              <span className={`font-semibold ${set.pct >= 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                                {set.pct}%
                              </span>
                            )}
                            {set.pct === null && (
                              <span className="text-gray-400 text-xs">(set size unknown)</span>
                            )}
                          </div>
                        </div>
                        {set.pct !== null ? (
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${progressBarColor(set.pct)}`}
                              style={{ width: `${Math.min(set.pct, 100)}%` }}
                            />
                          </div>
                        ) : (
                          set.owned > 0 && (
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-2 w-full bg-indigo-200 rounded-full" />
                            </div>
                          )
                        )}
                        {set.pct === 100 && (
                          <div className="mt-1 text-xs font-semibold text-green-600">✓ Set Complete!</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
