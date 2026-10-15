import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Environment variables Supabase belum disetel.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  timeout: 10000
});

// Sumber Penarikan Multi-Kanal (Google News Query Variatif & Media Daerah)
const SOURCES = [
  {
    name: 'Google News - Bea Cukai Pekanbaru',
    url: `https://news.google.com/rss/search?q=${encodeURIComponent('Bea Cukai Pekanbaru')}&hl=id&gl=ID&ceid=ID:id`
  },
  {
    name: 'Google News - KPPBC TMP B Pekanbaru',
    url: `https://news.google.com/rss/search?q=${encodeURIComponent('KPPBC Pekanbaru OR "Cukai Pekanbaru"')}&hl=id&gl=ID&ceid=ID:id`
  },
  {
    name: 'Antara Riau',
    url: 'https://riau.antaranews.com/rss/terkini.xml',
    filterKeyword: true
  }
];

const POSITIVE_KEYWORDS = [
  'gagalkan', 'amankan', 'musnahkan', 'sita', 'tangkap', 'tegakkan', 
  'prestasi', 'penghargaan', 'apresiasi', 'sosialisasi', 'bantu', 'hibah',
  'tumbuh', 'meningkat', 'sukses', 'optimal', 'pemulihan'
];

const NEGATIVE_KEYWORDS = [
  'pungli', 'suap', 'korupsi', 'oknum', 'keluhan', 'lambat', 'rusak',
  'bocor', 'demo', 'protes', 'kecewa', 'rugi'
];

function analyzeSentiment(text) {
  const lower = (text || '').toLowerCase();
  let score = 0;
  
  POSITIVE_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score += 1; });
  NEGATIVE_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score -= 2; });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

async function runMultiSourceScraper() {
  console.log("Memulai penarikan berita multi-kanal Bea Cukai Pekanbaru...");
  let totalInserted = 0;

  for (const src of SOURCES) {
    try {
      console.log(`Menghubungkan ke: ${src.name}...`);
      const feed = await parser.parseURL(src.url);

      for (const item of (feed.items || [])) {
        const fullText = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();

        // Jika sumber umum (misal Antara Riau), saring hanya yang memuat topik Bea Cukai
        if (src.filterKeyword) {
          const matchTarget = fullText.includes('bea cukai') || fullText.includes('kppbc') || fullText.includes('cukai pekanbaru');
          if (!matchTarget) continue;
        }

        const sentiment = analyzeSentiment(fullText);
        let publisher = item.source && item.source._ ? item.source._ : src.name.replace(/Google News - |RSS /g, '');
        if (publisher.includes('http')) publisher = 'Media Online';

        const payload = {
          title: item.title ? item.title.trim() : 'Tanpa Judul',
          source_name: publisher,
          url: item.link ? item.link.trim() : '',
          snippet: item.contentSnippet ? item.contentSnippet.slice(0, 300) : '',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          entry_type: 'scraped',
          sentiment: sentiment
        };

        if (!payload.url) continue;

        const { error } = await supabase
          .from('articles')
          .upsert(payload, { onConflict: 'url', ignoreDuplicates: true });

        if (!error) {
          totalInserted++;
        }
      }
    } catch (err) {
      console.warn(`Peringatan pada ${src.name}: ${err.message}`);
    }
  }

  console.log(`Proses selesai. Evaluasi ${totalInserted} entri.`);
}

runMultiSourceScraper();
