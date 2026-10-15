import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log("=== MEMULAI PROSES SCRAPING ===");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Error: URL atau Service Role Key belum terisi di file .env!");
  process.exit(1);
}

// Matikan realtime & persistSession agar ringan dan tidak memerlukan websocket di environment serverless/CLI
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { enabled: false }
});

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
});

async function runScraper() {
  const query = encodeURIComponent("Bea Cukai Pekanbaru");
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

  console.log("Menghubungi Google News RSS...");

  try {
    const feed = await parser.parseURL(feedUrl);
    console.log(`Ditemukan ${feed.items.length} artikel dari Google News.`);

    const articles = feed.items.map((item) => {
      const titleParts = item.title.split(' - ');
      const sourceName = titleParts.length > 1 ? titleParts.pop() : 'Google News';
      const cleanTitle = titleParts.join(' - ');

      return {
        title: cleanTitle || item.title,
        source_name: sourceName.trim(),
        url: item.link,
        snippet: item.contentSnippet || item.content || '',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        entry_type: 'scraped',
        sentiment: 'neutral'
      };
    });

    if (articles.length === 0) {
      console.log("Tidak ada artikel baru yang ditemukan.");
      return;
    }

    console.log("Mengirim data artikel ke Supabase...");
    const { data, error } = await supabase
      .from('articles')
      .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
      .select();

    if (error) {
      console.error("[Scraper Error Supabase]:", error.message);
      process.exit(1);
    } else {
      console.log(`[Scraper Success] Berhasil menyimpan ${data ? data.length : 0} artikel baru ke database.`);
    }
  } catch (err) {
    console.error("[Scraper Error Jaringan/Sistem]:", err.message);
    process.exit(1);
  }
}

runScraper();
