import { createClient } from '@/utils/supabase/client';
import { Wine } from '@/types/database';

export async function fetchWinesFromSupabase(): Promise<Wine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wines from Supabase:', error);
    throw error;
  }

  return data as Wine[];
}

export async function fetchWineByIdFromSupabase(id: string): Promise<Wine | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching wine ${id} from Supabase:`, error);
    return undefined; // Or throw depending on your error handling strategy
  }

  return data as Wine;
}
