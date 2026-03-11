const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

async function request<T>(
  path: string,
  options: RequestInit = {},
  userId?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  getGameSeries: () => request('/api/catalog/game-series'),
  getCardSets: () => request('/api/catalog/card-sets'),

  getCollection: (userId: string) => request('/api/collection', {}, userId),
  upsertCollection: (userId: string, payload: unknown) =>
    request('/api/collection/upsert', { method: 'POST', body: JSON.stringify(payload) }, userId),
  updateCollectionItem: (userId: string, id: string, payload: unknown) =>
    request(`/api/collection/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, userId),
  deleteCollectionItem: (userId: string, id: string) =>
    request(`/api/collection/${id}`, { method: 'DELETE' }, userId),
  updateDuplicateAction: (userId: string, id: string, duplicateAction: string) =>
    request(
      `/api/collection/${id}/duplicate-action`,
      { method: 'PATCH', body: JSON.stringify({ duplicateAction }) },
      userId
    ),

  getTrades: (userId: string) => request('/api/trades', {}, userId),
  createTrade: (userId: string, payload: unknown) =>
    request('/api/trades', { method: 'POST', body: JSON.stringify(payload) }, userId),
  updateTrade: (userId: string, tradeId: string, payload: unknown) =>
    request(`/api/trades/${tradeId}`, { method: 'PUT', body: JSON.stringify(payload) }, userId),
  deleteTrade: (userId: string, tradeId: string) =>
    request(`/api/trades/${tradeId}`, { method: 'DELETE' }, userId),
  updateTradeStatus: (userId: string, tradeId: string, status: string) =>
    request(
      `/api/trades/${tradeId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      userId
    ),
  addTradeItem: (userId: string, tradeId: string, payload: unknown) =>
    request(`/api/trades/${tradeId}/items`, { method: 'POST', body: JSON.stringify(payload) }, userId),
  deleteTradeItem: (userId: string, tradeId: string, itemId: string) =>
    request(`/api/trades/${tradeId}/items/${itemId}`, { method: 'DELETE' }, userId),
};
