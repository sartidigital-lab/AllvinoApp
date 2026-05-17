export type Wine = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
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
  delivery_method: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  wine_id: string;
  quantity: number;
  price_at_time: number;
};
