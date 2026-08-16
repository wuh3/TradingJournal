export type Direction = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'filled'
export type PositionType = 'long' | 'short'
export type InputType = 'number' | 'boolean'

export interface Tag {
  id: number
  name: string
  color: string | null
}

export interface ImageMeta {
  id: number
  filename: string
  content_type: string
  created_at: string
}

export interface OrderLink {
  id: number
  from_order_id: number
  to_order_id: number
  quantity: number
  created_at: string
  realized_pnl?: number | null
}

export interface Order {
  id: number
  journal_id: number
  ticker: string
  price: number
  quantity: number
  direction: Direction
  position_type: PositionType
  status: OrderStatus
  note: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  images: ImageMeta[]
  links_from: OrderLink[]
  links_to: OrderLink[]
  open_quantity: number | null
}

export interface OrderListItem {
  id: number
  journal_id: number
  date: string
  ticker: string
  price: number
  quantity: number
  direction: Direction
  position_type: PositionType
  tags: Tag[]
}

export interface OrderListResponse {
  items: OrderListItem[]
  total: number
  page: number
  page_size: number
}

export interface JournalListItem {
  id: number
  date: string
  notes: string | null
  created_at: string
  tags: Tag[]
  order_count: number
}

export interface Journal {
  id: number
  date: string
  notes: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  orders: Order[]
  images: ImageMeta[]
}

export interface PnlClosedLot {
  link_id: number
  ticker: string
  quantity: number
  buy_order_id: number
  buy_price: number
  sell_order_id: number
  sell_price: number
  realized_pnl: number
  closed_at: string
}

export interface PnlSummary {
  total_realized_pnl: number
  closed_lot_count: number
  closed_lots: PnlClosedLot[]
}

export interface Preset {
  key: string
  name: string
  description: string
  input_type: InputType
}

export interface Factor {
  id: number
  preset_key: string
  name: string
  description: string
  input_type: InputType
  weight: number
  sort_order: number
}

export interface FactorContribution {
  factor_id: number
  preset_key: string
  name: string
  raw_value: number
  normalized_value: number
  weight: number
  contribution: number
}

export interface CalculateResult {
  score: number
  breakdown: FactorContribution[]
}
