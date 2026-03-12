import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { Trade, TradeItem, UserCollection } from '../types';
import { TRADE_STATUSES } from '../types';
import { Plus, X, ArrowLeftRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const EMPTY_TRADE = { title: '', trade_partner: '', status: 'proposed', notes: '' };
const EMPTY_ITEM = {
  card_id: '',
  card_name: '',
  direction: 'offering' as 'offering' | 'requesting',
  quantity: 1,
  estimated_value: 0,
};

export default function Trades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<(Trade & { trade_items?: TradeItem[] })[]>([]);
  const [collection, setCollection] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [tradeForm, setTradeForm] = useState({ ...EMPTY_TRADE });
  const [itemForms, setItemForms] = useState<Record<string, typeof EMPTY_ITEM>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTrades = async () => {
    if (!user) return;
    const data = await apiClient.getTrades(user.id);
    setTrades((data ?? []) as (Trade & { trade_items?: TradeItem[] })[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchTrades(), apiClient.getCollection(user.id)]).then(([, collectionData]) => {
      setCollection((collectionData ?? []) as UserCollection[]);
    });
  }, [user]);

  const openCreate = () => {
    setEditingTrade(null);
    setTradeForm({ ...EMPTY_TRADE });
    setShowModal(true);
  };

  const openEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setTradeForm({
      title: trade.title ?? '',
      trade_partner: trade.trade_partner ?? '',
      status: trade.status,
      notes: trade.notes ?? '',
    });
    setShowModal(true);
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!user) return;
      if (editingTrade) {
        await apiClient.updateTrade(user.id, editingTrade.id, {
          title: tradeForm.title || null,
          tradePartner: tradeForm.trade_partner || null,
          status: tradeForm.status,
          notes: tradeForm.notes || null,
        });
      } else {
        await apiClient.createTrade(user.id, {
          title: tradeForm.title || null,
          tradePartner: tradeForm.trade_partner || null,
          status: tradeForm.status,
          notes: tradeForm.notes || null,
        });
      }
      await fetchTrades();
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!user) return;
    if (!confirm('Delete this trade and all its items?')) return;
    try {
      await apiClient.deleteTrade(user.id, id);
      setTrades(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete trade.');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const trade = trades.find(t => t.id === id);
    const wasCompleted = trade?.status === 'completed';
    const isMarkingComplete = status === 'completed' && !wasCompleted;
    const isUndoingComplete = wasCompleted && status !== 'completed';

    // Confirm before completing — this will modify the collection
    if (isMarkingComplete) {
      const offeringItems = (trade?.trade_items ?? []).filter(i => i.direction === 'offering');
      const offerList = offeringItems.length > 0
        ? '\n\nThe following cards will be removed from your collection:\n' +
          offeringItems.map(i => `• ${i.card_name} ×${i.quantity}`).join('\n')
        : '';
      const confirmed = confirm(
        `Mark this trade as completed?${offerList}\n\nThis will update your collection. You can undo by changing the status back.`
      );
      if (!confirmed) return;
    }

    // Confirm before undoing — this will restore cards to the collection
    if (isUndoingComplete) {
      const offeringItems = (trade?.trade_items ?? []).filter(i => i.direction === 'offering' && i.card_id);
      const offerList = offeringItems.length > 0
        ? '\n\nThe following cards will be restored to your collection:\n' +
          offeringItems.map(i => `• ${i.card_name} ×${i.quantity}`).join('\n')
        : '';
      const confirmed = confirm(
        `Undo this completed trade?${offerList}\n\nOffered cards will be added back to your collection.`
      );
      if (!confirmed) return;
    }

    if (!user) return;
    await apiClient.updateTradeStatus(user.id, id, status);
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status } : t));

    if (isMarkingComplete && trade) {
      const requestingItems = (trade.trade_items ?? []).filter(i => i.direction === 'requesting');
      // Notify user about received cards that need to be added manually
      if (requestingItems.length > 0) {
        const cardList = requestingItems.map(i => `• ${i.card_name} ×${i.quantity}`).join('\n');
        alert(
          `Trade marked as completed!\n\n` +
          `Offered cards have been removed from your collection.\n\n` +
          `Remember to add the following received cards to your collection:\n${cardList}`
        );
      }
    }

    if (isUndoingComplete) {
      await apiClient.getCollection(user.id).then(data => setCollection((data ?? []) as UserCollection[]));
    }
  };

  const addTradeItem = async (tradeId: string) => {
    if (!user) return;
    const form = itemForms[tradeId] ?? { ...EMPTY_ITEM };
    // Offering requires a collection card selection; requesting requires a name
    if (form.direction === 'offering' && !form.card_id) return;
    if (form.direction === 'requesting' && !form.card_name.trim()) return;

    await apiClient.addTradeItem(user.id, tradeId, {
      cardId: form.direction === 'offering' ? form.card_id || null : null,
      cardName: form.card_name.trim(),
      direction: form.direction,
      quantity: form.quantity,
      estimatedValue: form.estimated_value,
    });
    setItemForms(prev => ({ ...prev, [tradeId]: { ...EMPTY_ITEM } }));
    await fetchTrades();
  };

  const deleteTradeItem = async (tradeId: string, itemId: string) => {
    if (!user) return;
    try {
      await apiClient.deleteTradeItem(user.id, tradeId, itemId);
      await fetchTrades();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete trade item.');
    }
  };

  const totalProposed = trades.filter(t => t.status === 'proposed').length;
  const totalCompleted = trades.filter(t => t.status === 'completed').length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trades</h1>
          <p className="text-gray-500 mt-1">Plan and track card trade proposals</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> New Trade
        </button>
      </div>

      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Trades', value: trades.length },
            { label: 'Active (Proposed)', value: totalProposed },
            { label: 'Completed', value: totalCompleted },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : trades.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No trades yet</p>
          <p className="text-sm mt-1">Click "New Trade" to create a trade proposal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map(trade => {
            const isExpanded = expandedId === trade.id;
            const offering = (trade.trade_items ?? []).filter(i => i.direction === 'offering');
            const requesting = (trade.trade_items ?? []).filter(i => i.direction === 'requesting');
            const itemForm = itemForms[trade.id] ?? { ...EMPTY_ITEM };

            return (
              <div key={trade.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Trade Header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                    className="flex-1 flex items-center gap-4 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">
                          {trade.title || `Trade #${trade.id.slice(0, 6)}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[trade.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TRADE_STATUSES.find(s => s.value === trade.status)?.label ?? trade.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        {trade.trade_partner && <span>Partner: <span className="text-gray-600">{trade.trade_partner}</span> · </span>}
                        {(trade.trade_items?.length ?? 0)} item{trade.trade_items?.length !== 1 ? 's' : ''} · {new Date(trade.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                  </button>

                  {/* Status quick-change */}
                  <select
                    value={trade.status}
                    onChange={e => updateStatus(trade.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {TRADE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(trade)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit trade">
                      <Plus size={14} className="rotate-45" />
                    </button>
                    <button onClick={() => handleDeleteTrade(trade.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete trade">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {trade.notes && (
                      <p className="text-sm text-gray-500 italic">{trade.notes}</p>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Offering */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Offering</h4>
                        {offering.length === 0 ? (
                          <p className="text-sm text-gray-400">No cards offered yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {offering.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                                <div>
                                  <span className="text-sm font-medium text-gray-800">{item.card_name}</span>
                                  <span className="text-xs text-gray-500 ml-2">×{item.quantity} · ${item.estimated_value.toFixed(2)}</span>
                                </div>
                                <button onClick={() => deleteTradeItem(trade.id, item.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Requesting */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requesting</h4>
                        {requesting.length === 0 ? (
                          <p className="text-sm text-gray-400">No cards requested yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {requesting.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                                <div>
                                  <span className="text-sm font-medium text-gray-800">{item.card_name}</span>
                                  <span className="text-xs text-gray-500 ml-2">×{item.quantity} · ${item.estimated_value.toFixed(2)}</span>
                                </div>
                                <button onClick={() => deleteTradeItem(trade.id, item.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Item Form */}
                    {trade.status === 'proposed' && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Item</p>
                        <div className="flex gap-2 flex-wrap items-end">
                          {/* Direction toggle first */}
                          <select
                            value={itemForm.direction}
                            onChange={e => setItemForms(p => ({ ...p, [trade.id]: { ...EMPTY_ITEM, direction: e.target.value as 'offering' | 'requesting' } }))}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <option value="offering">Offering</option>
                            <option value="requesting">Requesting</option>
                          </select>

                          {/* Card input — dropdown for offering, free text for requesting */}
                          {itemForm.direction === 'offering' ? (
                            <select
                              value={itemForm.card_id}
                              onChange={e => {
                                const selected = collection.find(c => c.card_id === e.target.value);
                                setItemForms(p => ({
                                  ...p,
                                  [trade.id]: {
                                    ...itemForm,
                                    card_id: e.target.value,
                                    card_name: selected?.card?.name ?? '',
                                    estimated_value: selected?.estimated_value ?? 0,
                                  },
                                }));
                              }}
                              className="flex-1 min-w-48 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                              <option value="">Select from your collection…</option>
                              {collection.filter(c => c.duplicate_action === 'for_trade').length > 0 && (
                                <optgroup label="⇄ Marked for Trade">
                                  {collection
                                    .filter(c => c.duplicate_action === 'for_trade')
                                    .map(c => (
                                      <option key={c.card_id} value={c.card_id}>
                                        {c.card?.name}
                                        {c.card?.rarity ? ` · ${c.card.rarity}` : ''}
                                        {` · ×${c.quantity} owned`}
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                              {collection.filter(c => c.duplicate_action !== 'for_trade').length > 0 && (
                                <optgroup label="Rest of Collection">
                                  {collection
                                    .filter(c => c.duplicate_action !== 'for_trade')
                                    .map(c => (
                                      <option key={c.card_id} value={c.card_id}>
                                        {c.card?.name}
                                        {c.card?.rarity ? ` · ${c.card.rarity}` : ''}
                                        {` · ×${c.quantity} owned`}
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Card you want…"
                              value={itemForm.card_name}
                              onChange={e => setItemForms(p => ({ ...p, [trade.id]: { ...itemForm, card_name: e.target.value } }))}
                              className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                          )}

                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={itemForm.quantity}
                            onChange={e => setItemForms(p => ({ ...p, [trade.id]: { ...itemForm, quantity: parseInt(e.target.value) || 1 } }))}
                            className="w-16 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Value $"
                            value={itemForm.estimated_value}
                            onChange={e => setItemForms(p => ({ ...p, [trade.id]: { ...itemForm, estimated_value: parseFloat(e.target.value) || 0 } }))}
                            className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <button
                            onClick={() => addTradeItem(trade.id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        {itemForm.direction === 'offering' && collection.length === 0 && (
                          <p className="text-xs text-amber-600 mt-2">No cards in your collection yet. Add cards in the Collection page first.</p>
                        )}
                      </div>
                    )}

                    {/* Value summary */}
                    {(offering.length > 0 || requesting.length > 0) && (
                      <div className="flex gap-6 text-sm pt-1">
                        <span className="text-gray-500">Offering value: <span className="font-semibold text-blue-700">${offering.reduce((s, i) => s + i.quantity * i.estimated_value, 0).toFixed(2)}</span></span>
                        <span className="text-gray-500">Requesting value: <span className="font-semibold text-purple-700">${requesting.reduce((s, i) => s + i.quantity * i.estimated_value, 0).toFixed(2)}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Trade Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingTrade ? 'Edit Trade' : 'New Trade'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTradeSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={tradeForm.title}
                  onChange={e => setTradeForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Charizard for Pikachu ex"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade Partner</label>
                <input
                  type="text"
                  value={tradeForm.trade_partner}
                  onChange={e => setTradeForm(f => ({ ...f, trade_partner: e.target.value }))}
                  placeholder="Name or username"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={tradeForm.status}
                  onChange={e => setTradeForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {TRADE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={tradeForm.notes}
                  onChange={e => setTradeForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this trade…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Saving…' : editingTrade ? 'Save Changes' : 'Create Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
