import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Service role client bypasses RLS for scheduled background writing
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const parser = new Parser();

async function runScraper() {
  const query = encodeURIComponent("Bea Cukai Pekanbaru");
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

  console.log(`[Scraper] Fetching Google News RSS for: Bea Cukai Pekanbaru...`);

  try {
    const feed = await parser.parseURL(feedUrl);
    console.log(`[Scraper] Found ${feed.items.length} items from feed.`);

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
      console.log("[Scraper] No items to insert.");
      return;
    }

    const { data, error } = await supabase
      .from('articles')
      .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
      .select();

    if (error) {
      console.error("[Scraper Error]:", error.message);
    } else {
      console.log(`[Scraper Success] Successfully synced articles! New rows added: ${data.length}`);
    }
  } catch (err) {
    console.error("[Scraper Failed]:", err.message);
  }
}

runScraper();
