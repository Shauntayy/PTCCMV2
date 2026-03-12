import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { UserCollection, Trade } from '../types';
import { Library, Copy, ArrowLeftRight, TrendingUp, Layers } from 'lucide-react';

interface Stats {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
  duplicateCards: number;
  activeTrades: number;
}

interface GameBreakdown {
  name: string;
  uniqueCards: number;
  totalCards: number;
  totalValue: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCards: 0,
    uniqueCards: 0,
    totalValue: 0,
    duplicateCards: 0,
    activeTrades: 0,
  });
  const [breakdown, setBreakdown] = useState<GameBreakdown[]>([]);
  const [recentItems, setRecentItems] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function fetchData() {
      const [collection, trades] = await Promise.all([
        apiClient.getCollection(userId),
        apiClient.getTrades(userId),
      ]);

      const items = (collection ?? []) as UserCollection[];
      const tradeList = (trades ?? []) as Trade[];

      const totalCards = items.reduce((s, i) => s + i.quantity, 0);
      const uniqueCards = items.length;
      const totalValue = items.reduce((s, i) => s + i.quantity * i.estimated_value, 0);
      const duplicateCards = items.filter(i => i.quantity > 1).length;
      const activeTrades = tradeList.filter(t => t.status === 'proposed').length;
      setStats({ totalCards, uniqueCards, totalValue, duplicateCards, activeTrades });

      const gameMap: Record<string, GameBreakdown> = {};
      items.forEach(item => {
        const name = item.card?.card_set?.game_series?.name ?? 'Unknown';
        if (!gameMap[name]) gameMap[name] = { name, uniqueCards: 0, totalCards: 0, totalValue: 0 };
        gameMap[name].uniqueCards++;
        gameMap[name].totalCards += item.quantity;
        gameMap[name].totalValue += item.quantity * item.estimated_value;
      });
      setBreakdown(Object.values(gameMap).sort((a, b) => b.totalCards - a.totalCards));
      setRecentItems(items.slice(0, 6));
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const statCards = [
    { label: 'Total Cards', value: stats.totalCards, Icon: Layers, color: 'bg-indigo-500' },
    { label: 'Unique Cards', value: stats.uniqueCards, Icon: Library, color: 'bg-violet-500' },
    { label: 'Total Value', value: `$${stats.totalValue.toFixed(2)}`, Icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Duplicates', value: stats.duplicateCards, Icon: Copy, color: 'bg-amber-500' },
    { label: 'Active Trades', value: stats.activeTrades, Icon: ArrowLeftRight, color: 'bg-sky-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Collection by Game</h2>
          {breakdown.length === 0 ? (
            <p className="text-gray-400 text-sm">No cards in collection yet.</p>
          ) : (
            <div className="space-y-4">
              {breakdown.map(g => (
                <div key={g.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{g.name}</span>
                    <span className="text-gray-500">{g.uniqueCards} unique · {g.totalCards} total · <span className="font-medium text-gray-700">${g.totalValue.toFixed(2)}</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-indigo-500 rounded-full transition-all"
                      style={{ width: stats.uniqueCards > 0 ? `${Math.round((g.uniqueCards / stats.uniqueCards) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Additions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Additions</h2>
          {recentItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No cards added yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{item.card?.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.card?.card_set?.game_series?.name} · {item.card?.card_set?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">×{item.quantity}</div>
                    <div className="text-xs text-gray-400">{item.card?.rarity ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
