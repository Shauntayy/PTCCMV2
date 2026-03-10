export interface GameSeries {
  id: string;
  name: string;
}

export interface CardSet {
  id: string;
  game_series_id: string;
  name: string;
  total_cards: number | null;
  game_series?: GameSeries;
}

export interface Card {
  id: string;
  card_set_id: string;
  name: string;
  card_number: string | null;
  card_type: string | null;
  rarity: string | null;
  card_set?: CardSet;
}

export interface UserCollection {
  id: string;
  user_id: string;
  card_id: string;
  quantity: number;
  estimated_value: number;
  condition: string;
  duplicate_action: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  card?: Card & {
    card_set?: CardSet & {
      game_series?: GameSeries;
    };
  };
}

export interface Trade {
  id: string;
  user_id: string;
  title: string | null;
  trade_partner: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trade_items?: TradeItem[];
}

export interface TradeItem {
  id: string;
  trade_id: string;
  card_id: string | null;
  card_name: string | null;
  direction: 'offering' | 'requesting';
  quantity: number;
  estimated_value: number;
  card?: Card;
}

export const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Holo Rare',
  'Ultra Rare',
  'Secret Rare',
  'Special Illustration Rare',
  'Hyper Rare',
];

export const CONDITIONS = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged',
];

export const DUPLICATE_ACTIONS = [
  { value: 'keep', label: 'Keep' },
  { value: 'for_trade', label: 'For Trade' },
  { value: 'for_sale', label: 'For Sale' },
];

export const TRADE_STATUSES = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
