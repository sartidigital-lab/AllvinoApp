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
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_type: string;
  customer_name: string | null;
  customer_phone: string | null;
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
