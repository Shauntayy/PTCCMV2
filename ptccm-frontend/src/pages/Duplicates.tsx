import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { UserCollection } from '../types';
import { DUPLICATE_ACTIONS } from '../types';
import { Copy } from 'lucide-react';

export default function Duplicates() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDuplicates();
  }, [user]);

  const fetchDuplicates = async () => {
    if (!user) return;
    const data = await apiClient.getCollection(user.id);
    const duplicates = (data as UserCollection[]).filter(item => item.quantity > 1);
    setItems(duplicates);
    setLoading(false);
  };

  const updateAction = async (id: string, action: string) => {
    if (!user) return;
    await apiClient.updateDuplicateAction(user.id, id, action);
    setItems(prev => prev.map(i => i.id === id ? { ...i, duplicate_action: action } : i));
  };

  const totalExtra = items.reduce((s, i) => s + (i.quantity - 1), 0);
  const totalExtraValue = items.reduce((s, i) => s + (i.quantity - 1) * i.estimated_value, 0);

  const forTrade = items.filter(i => i.duplicate_action === 'for_trade').length;
  const forSale = items.filter(i => i.duplicate_action === 'for_sale').length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Duplicates</h1>
        <p className="text-gray-500 mt-1">Cards you own more than one copy of</p>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Cards with Duplicates', value: items.length, color: 'bg-amber-500' },
            { label: 'Extra Copies', value: totalExtra, color: 'bg-orange-500' },
            { label: 'Est. Value of Extras', value: `$${totalExtraValue.toFixed(2)}`, color: 'bg-emerald-500' },
            { label: 'Marked for Trade/Sale', value: forTrade + forSale, color: 'bg-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action group summary */}
      {!loading && items.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
          <span className="font-medium">Tip:</span> Mark extra copies as <strong>For Trade</strong> or <strong>For Sale</strong> to keep them organised. Tagged cards will appear automatically when creating a trade proposal.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Copy size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No duplicates found</p>
            <p className="text-sm mt-1">Cards with quantity &gt; 1 will appear here automatically</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Game', 'Set', 'Card Name', 'Rarity', 'Qty', 'Extra Copies', 'Value / Card', 'Extra Value', 'Duplicate Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.card?.card_set?.game_series?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.card?.card_set?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{item.card?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.card?.rarity ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                      +{item.quantity - 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">${item.estimated_value.toFixed(2)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ${((item.quantity - 1) * item.estimated_value).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.duplicate_action}
                      onChange={e => updateAction(item.id, e.target.value)}
                      className={`border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${
                        item.duplicate_action === 'for_trade'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : item.duplicate_action === 'for_sale'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {DUPLICATE_ACTIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
