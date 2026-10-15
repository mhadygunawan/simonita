import { supabase } from '../lib/supabase';

// Ambil semua artikel
export async function getArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error.message);
    throw error;
  }
  return data;
}

// Tambah artikel manual
export async function addManualArticle(article) {
  const payload = {
    title: article.title,
    source_name: article.source_name,
    url: article.url,
    snippet: article.snippet || '',
    published_at: new Date().toISOString(),
    entry_type: 'manual',
    sentiment: article.sentiment || 'neutral'
  };

  const { data, error } = await supabase
    .from('articles')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error inserting article:', error.message);
    throw error;
  }
  return data;
}

// Perbarui artikel & sentimen (Edit)
export async function updateArticle(id, updates) {
  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating article:', error.message);
    throw error;
  }
  return data;
}

// Hapus artikel permanen
export async function deleteArticle(id) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting article:', error.message);
    throw error;
  }
  return true;
}

// Langganan pembaruan realtime
export function subscribeToArticles(callback) {
  return supabase
    .channel('public:articles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      () => {
        callback();
      }
    )
    .subscribe();
}
