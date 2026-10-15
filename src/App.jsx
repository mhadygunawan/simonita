import React, { useState, useEffect } from 'react';
import { getArticles, addManualArticle, subscribeToArticles } from './services/articles';

// Built-in minimalist icons (crash-proof, zero dependencies)
const Icons = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Moon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'scraped', 'manual'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for manual submission modal
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Initial data load and real-time subscription
  useEffect(() => {
    fetchNews();

    const unsubscribe = subscribeToArticles((newArticle) => {
      setArticles((prev) => [newArticle, ...prev]);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await getArticles();
      setArticles(data || []);
    } catch (err) {
      console.error("Gagal memuat berita:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const created = await addManualArticle(formData);
      setArticles((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setFormData({
        title: '',
        source_name: '',
        url: '',
        snippet: '',
        sentiment: 'neutral'
      });
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan artikel');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & search logic
  const filteredArticles = articles.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    return matchesSearch && item.entry_type === filterType;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200`}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D2C5C] flex items-center justify-center font-bold text-amber-400 text-lg shadow-md border border-amber-500/20">
              BC
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#0D2C5C] dark:text-white leading-tight">
                SIMONITA
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                KPPBC TMP B Pekanbaru • Seksi PLI
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistem Aktif
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle Tema"
            >
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      {/* Announcement Marquee */}
      <div className="bg-[#0D2C5C] text-amber-300 text-xs py-2 px-4 shadow-inner overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between whitespace-nowrap overflow-x-auto">
          <span>🔔 <b>SIMONITA:</b> Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Wilayah Pengawasan: Pekanbaru • Siak • Kampar • Rokan Hulu • Pelalawan</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#0D2C5C] dark:text-white">
              Artikel & Berita
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pemantauan publikasi media terkait kata kunci: <i>"Bea Cukai Pekanbaru"</i>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchNews}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Perbarui Data"
            >
              <Icons.Refresh />
              {loading ? 'Memuat...' : 'Refresh'}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white bg-[#0D2C5C] hover:bg-[#0D2C5C]/90 shadow-sm transition"
            >
              <Icons.Plus />
              + Tambahkan Manual
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Cari judul berita, ringkasan, atau media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'all'
                  ? 'bg-[#0D2C5C] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua ({articles.length})
            </button>
            <button
              onClick={() => setFilterType('scraped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'scraped'
                  ? 'bg-[#0D2C5C] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Scraped Auto
            </button>
            <button
              onClick={() => setFilterType('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'manual'
                  ? 'bg-[#0D2C5C] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Articles Table Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {loading && articles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0D2C5C] border-t-transparent dark:border-amber-400 dark:border-t-transparent mb-3"></div>
              <p className="text-sm">Memuat berita dari Supabase...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-base font-semibold">Tidak ada berita yang cocok</p>
              <p className="text-xs mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Media</th>
                    <th className="py-3 px-4">Judul & Ringkasan</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Waktu Terbit</th>
                    <th className="py-3 px-4 text-right">Tautan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {article.source_name || 'Media'}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-lg">
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-2">
                          {article.title}
                        </p>
                        {article.snippet && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {article.snippet}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            article.entry_type === 'manual'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(article.published_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D2C5C] dark:text-amber-400 hover:underline"
                        >
                          Buka
                          <Icons.ExternalLink />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Tambahkan Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <Icons.Close />
            </button>

            <h3 className="text-lg font-bold text-[#0D2C5C] dark:text-white mb-1">
              Tambah Berita Manual
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Masukkan informasi pemberitaan atau artikel yang didapatkan secara langsung.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-lg text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {submitError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Judul Berita *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bea Cukai Pekanbaru Gagalkan Penyelundupan..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nama Sumber / Media *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Riau Pos, Antara Riau, Detikcom"
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  URL / Link Berita *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Ringkasan Berita
                </label>
                <textarea
                  rows="3"
                  placeholder="Catatan singkat poin utama isi pemberitaan..."
                  value={formData.snippet}
                  onChange={(e) => setFormData({ ...formData, snippet: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-[#0D2C5C] hover:bg-[#0D2C5C]/90 shadow-md transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Berita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}