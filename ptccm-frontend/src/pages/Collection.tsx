import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { GameSeries, CardSet, UserCollection } from '../types';
import { RARITIES, CONDITIONS, DUPLICATE_ACTIONS } from '../types';
import { Plus, Pencil, Trash2, X, Library } from 'lucide-react';

const EMPTY_FORM = {
  seriesId: '',
  newSeriesName: '',
  setId: '',
  newSetName: '',
  newSetTotalCards: '',
  cardName: '',
  cardNumber: '',
  cardType: '',
  rarity: '',
  quantity: 1,
  estimatedValue: 0,
  condition: 'Near Mint',
  duplicateAction: 'keep',
  notes: '',
};

const RARITY_COLORS: Record<string, string> = {
  'Common': 'bg-gray-100 text-gray-600',
  'Uncommon': 'bg-green-100 text-green-700',
  'Rare': 'bg-blue-100 text-blue-700',
  'Holo Rare': 'bg-cyan-100 text-cyan-700',
  'Ultra Rare': 'bg-purple-100 text-purple-700',
  'Secret Rare': 'bg-rose-100 text-rose-700',
  'Special Illustration Rare': 'bg-orange-100 text-orange-700',
  'Hyper Rare': 'bg-yellow-100 text-yellow-700',
};

const ACTION_COLORS: Record<string, string> = {
  keep: 'bg-gray-100 text-gray-600',
  for_trade: 'bg-blue-100 text-blue-700',
  for_sale: 'bg-green-100 text-green-700',
};

export default function Collection() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserCollection[]>([]);
  const [gameSeries, setGameSeries] = useState<GameSeries[]>([]);
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UserCollection | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filterSeries, setFilterSeries] = useState('');

  const fetchCollection = useCallback(async () => {
    const { data } = await supabase
      .from('user_collection')
      .select(`
        id, quantity, estimated_value, condition, duplicate_action, notes,
        created_at, updated_at, card_id, user_id,
        card:cards(
          id, name, card_number, card_type, rarity,
          card_set:card_sets(
            id, name, total_cards,
            game_series:game_series(id, name)
          )
        )
      `)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as unknown as UserCollection[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCollection();
    supabase.from('game_series').select('*').order('name').then(({ data }) =>
      setGameSeries((data ?? []) as GameSeries[])
    );
    supabase
      .from('card_sets')
      .select('*, game_series:game_series(id, name)')
      .order('name')
      .then(({ data }) => setCardSets((data ?? []) as unknown as CardSet[]));
  }, [user, fetchCollection]);

  const filteredSets = cardSets.filter(
    s => !form.seriesId || form.seriesId === '__new__' || s.game_series_id === form.seriesId
  );

  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item: UserCollection) => {
    setEditingItem(item);
    setForm({
      ...EMPTY_FORM,
      quantity: item.quantity,
      estimatedValue: item.estimated_value,
      condition: item.condition,
      duplicateAction: item.duplicate_action,
      notes: item.notes ?? '',
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this card from your collection?')) return;
    await supabase.from('user_collection').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingItem) {
        const { error: err } = await supabase
          .from('user_collection')
          .update({
            quantity: form.quantity,
            estimated_value: form.estimatedValue,
            condition: form.condition,
            duplicate_action: form.duplicateAction,
            notes: form.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);
        if (err) throw err;
      } else {
        // Resolve game series
        let seriesId = form.seriesId;
        if (seriesId === '__new__') {
          if (!form.newSeriesName.trim()) throw new Error('Game series name is required.');
          const { data, error: err } = await supabase
            .from('game_series')
            .insert({ name: form.newSeriesName.trim() })
            .select()
            .single();
          if (err) throw err;
          seriesId = data.id;
          setGameSeries(prev => [...prev, data as GameSeries]);
        }
        if (!seriesId) throw new Error('Please select a game series.');

        // Resolve card set
        let setId = form.setId;
        if (setId === '__new__') {
          if (!form.newSetName.trim()) throw new Error('Card set name is required.');
          const { data, error: err } = await supabase
            .from('card_sets')
            .insert({
              game_series_id: seriesId,
              name: form.newSetName.trim(),
              total_cards: form.newSetTotalCards ? parseInt(form.newSetTotalCards) : null,
            })
            .select()
            .single();
          if (err) throw err;
          setId = data.id;
          setCardSets(prev => [...prev, data as unknown as CardSet]);
        }
        if (!setId) throw new Error('Please select a card set.');
        if (!form.cardName.trim()) throw new Error('Card name is required.');

        // Find or create card
        const { data: existingCard } = await supabase
          .from('cards')
          .select('id')
          .eq('card_set_id', setId)
          .eq('name', form.cardName.trim())
          .maybeSingle();

        let cardId = existingCard?.id;
        if (!cardId) {
          const { data: newCard, error: err } = await supabase
            .from('cards')
            .insert({
              card_set_id: setId,
              name: form.cardName.trim(),
              card_number: form.cardNumber.trim() || null,
              card_type: form.cardType.trim() || null,
              rarity: form.rarity || null,
            })
            .select()
            .single();
          if (err) throw err;
          cardId = newCard.id;
        }

        // Upsert user_collection
        const { error: err } = await supabase.from('user_collection').upsert(
          {
            user_id: user!.id,
            card_id: cardId,
            quantity: form.quantity,
            estimated_value: form.estimatedValue,
            condition: form.condition,
            duplicate_action: form.duplicateAction,
            notes: form.notes || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,card_id' }
        );
        if (err) throw err;
      }

      await fetchCollection();
      setShowModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueSeries = [...new Set(items.map(i => i.card?.card_set?.game_series?.name).filter(Boolean))];
  const displayItems = filterSeries
    ? items.filter(i => i.card?.card_set?.game_series?.name === filterSeries)
    : items;

  const f = (field: keyof typeof EMPTY_FORM, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection</h1>
          <p className="text-gray-500 mt-1">{items.length} unique cards tracked</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Add Card
        </button>
      </div>

      {/* Series filter chips */}
      {uniqueSeries.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSeries('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterSeries === '' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}
          >
            All
          </button>
          {uniqueSeries.map(s => (
            <button
              key={s}
              onClick={() => setFilterSeries(s!)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterSeries === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Library size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No cards yet</p>
            <p className="text-sm mt-1">Click "Add Card" to start your collection</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Game', 'Set', '#', 'Card Name', 'Type', 'Rarity', 'Qty', 'Value', 'Condition', 'Action', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayItems.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.card?.card_set?.game_series?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.card?.card_set?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{item.card?.card_number ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{item.card?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.card?.card_type ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.card?.rarity ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RARITY_COLORS[item.card.rarity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {item.card.rarity}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-700">${item.estimated_value.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.condition}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[item.duplicate_action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {DUPLICATE_ACTIONS.find(d => d.value === item.duplicate_action)?.label ?? item.duplicate_action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit Card' : 'Add Card to Collection'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {editingItem ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900">{editingItem.card?.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {editingItem.card?.card_set?.game_series?.name} · {editingItem.card?.card_set?.name}
                    {editingItem.card?.card_number && ` · #${editingItem.card.card_number}`}
                    {editingItem.card?.rarity && ` · ${editingItem.card.rarity}`}
                  </div>
                </div>
              ) : (
                <>
                  {/* Game Series */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Game Series *</label>
                    <select
                      value={form.seriesId}
                      onChange={e => f('seriesId', e.target.value) || f('setId', '')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">Select series…</option>
                      {gameSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      <option value="__new__">+ Add new series</option>
                    </select>
                  </div>
                  {form.seriesId === '__new__' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Series Name *</label>
                      <input
                        type="text"
                        value={form.newSeriesName}
                        onChange={e => f('newSeriesName', e.target.value)}
                        placeholder="e.g. Yu-Gi-Oh!"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  )}

                  {/* Card Set */}
                  {form.seriesId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Set *</label>
                      <select
                        value={form.setId}
                        onChange={e => f('setId', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="">Select set…</option>
                        {filteredSets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        <option value="__new__">+ Add new set</option>
                      </select>
                    </div>
                  )}
                  {form.setId === '__new__' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Set Name *</label>
                        <input
                          type="text"
                          value={form.newSetName}
                          onChange={e => f('newSetName', e.target.value)}
                          placeholder="e.g. Temporal Forces"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Cards in Set</label>
                        <input
                          type="number"
                          min="1"
                          value={form.newSetTotalCards}
                          onChange={e => f('newSetTotalCards', e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Name *</label>
                      <input
                        type="text"
                        value={form.cardName}
                        onChange={e => f('cardName', e.target.value)}
                        placeholder="e.g. Charizard ex"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={form.cardNumber}
                        onChange={e => f('cardNumber', e.target.value)}
                        placeholder="e.g. 125/258"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                      <input
                        type="text"
                        value={form.cardType}
                        onChange={e => f('cardType', e.target.value)}
                        placeholder="e.g. Pokémon / Leader"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rarity</label>
                      <select
                        value={form.rarity}
                        onChange={e => f('rarity', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="">Select rarity…</option>
                        {RARITIES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Collection Details */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => f('quantity', parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimatedValue}
                    onChange={e => f('estimatedValue', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={e => f('condition', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duplicate Action</label>
                  <select
                    value={form.duplicateAction}
                    onChange={e => f('duplicateAction', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {DUPLICATE_ACTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => f('notes', e.target.value)}
                    placeholder="Optional notes…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving…' : editingItem ? 'Save Changes' : 'Add to Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
