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

export async function createWine(wineData: Partial<Wine>): Promise<Wine | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('wines')
      .insert(wineData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating wine:', error);
    return null;
  }
}

export async function updateWine(id: string, wineData: Partial<Wine>): Promise<Wine | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('wines')
      .update(wineData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating wine:', error);
    return null;
  }
}

export async function deleteWine(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('wines')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting wine:', error);
    return false;
  }
}
