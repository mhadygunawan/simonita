import { supabase } from '../supabaseClient';

export async function getArticles({ searchQuery = '', limit = 50 } = {}) {
  let query = supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (searchQuery.trim()) {
    query = query.or(`title.ilike.%${searchQuery}%,source_name.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching articles:', error.message);
    throw error;
  }
  return data;
}

export async function addManualArticle({ title, source_name, url, snippet = '', sentiment = 'neutral' }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('articles')
    .insert([
      {
        title,
        source_name: source_name || 'Manual Entry',
        url,
        snippet,
        sentiment,
        entry_type: 'manual',
        created_by: user ? user.id : null,
        published_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error('Error adding manual article:', error.message);
    throw error;
  }
  return data[0];
}

export function subscribeToArticles(onNewArticle) {
  const channel = supabase
    .channel('articles-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'articles' },
      (payload) => {
        onNewArticle(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
