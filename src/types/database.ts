export type Wine = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  type: string | null;
  region: string | null;
  grape: string | null;
  category: string | null;
  stock: number;
  product_code: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_type: string;
  payment_method: string | null;
  payment_provider: string;
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_reference: string | null;
  payment_url: string | null;
  paid_at: string | null;
  payment_error: string | null;
  delivery_address: string | null;
  discount_amount: number;
  subtotal_amount: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  promotion_code: string | null;
  delivery_zip_code: string | null;
  delivery_zone_name: string | null;
  delivery_estimate_days: number | null;
  shipping_fee: number;
  stock_reserved_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  wine_id: string | null;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export type Promotion = {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type DeliveryZone = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  zip_start: string;
  zip_end: string;
  fee: number;
  free_shipping_min_subtotal: number | null;
  estimate_days: number;
  is_active: boolean;
};

export type StockLevel = {
  product_code: string;
  quantity: number;
  updated_at: string;
  source: string;
  import_id: string | null;
};

export type StockImport = {
  id: string;
  created_at: string;
  file_name: string | null;
  total_rows: number;
  source: string;
};
