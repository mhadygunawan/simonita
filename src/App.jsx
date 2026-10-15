import React, { useState, useEffect } from 'react';
import { getArticles, addManualArticle, subscribeToArticles } from './services/articles';

export default function App() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getArticles();
      setArticles(data || []);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Berlangganan data baru secara realtime
    const channel = subscribeToArticles((newArticle) => {
      setArticles((prev) => [newArticle, ...prev]);
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.source_name || !formData.url) {
      alert('Mohon isi Judul, Sumber Berita, dan URL.');
      return;
    }

    try {
      await addManualArticle(formData);
      setIsModalOpen(false);
      setFormData({
        title: '',
        source_name: '',
        url: '',
        snippet: '',
        sentiment: 'neutral'
      });
      loadData();
    } catch (err) {
      alert('Gagal menyimpan artikel: ' + err.message);
    }
  };

  const filteredArticles = articles.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.source_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' ? true : item.entry_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0D2C5C]/95 backdrop-blur-md text-white border-b border-amber-500/30 px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            {/* Logo Resmi simonita.png */}
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/10 p-1 flex items-center justify-center border border-amber-400/40 shadow-inner">
              <img 
                src="/simonita.png" 
                alt="Logo SIMONITA" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback jika gambar simonita.png belum ada di folder public
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="font-bold text-amber-400 text-sm">BC</span>';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-white">SIMONITA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">Sistem Aktif</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">KPPBC TMP B Pekanbaru • Seksi PLI</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-white/10 text-slate-200 border border-white/10">
              Wilayah Pengawasan: Pekanbaru, Siak, Kampar, Rohul, Pelalawan
            </span>
          </div>
        </div>
      </header>

      {/* Marquee Banner */}
      <div className="bg-amber-500 text-[#0D2C5C] text-xs font-semibold py-1.5 px-4 overflow-hidden whitespace-nowrap shadow-sm">
        <div className="inline-block animate-marquee">
          🔔 SIMONITA: Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Pemantauan Publikasi Media Terkait Kata Kunci: "Bea Cukai Pekanbaru"
        </div>
      </div>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2C5C] dark:text-amber-400">Artikel & Berita</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hasil pemantauan berkala media massa dan masukan informasi publik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={loadData}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
            >
              <span>🔄 Refresh</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40 shadow-sm flex items-center space-x-1.5 transition"
            >
              <span>+ Tambahkan Manual</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Cari judul artikel atau nama media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
          >
            <option value="all">Semua Tipe Entri</option>
            <option value="scraped">Hasil Scraping</option>
            <option value="manual">Input Manual</option>
          </select>
        </div>

        {/* Table View */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4">Judul Artikel</th>
                  <th className="py-3 px-4">Sumber</th>
                  <th className="py-3 px-4">Waktu Terbit</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      Memuat data artikel...
                    </td>
                  </tr>
                ) : filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      Tidak ada artikel yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((article) => (
                    <tr key={article.id || article.url} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-100 max-w-md">
                        <div className="line-clamp-2">{article.title}</div>
                        {article.snippet && (
                          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{article.snippet}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {article.source_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(article.published_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          article.entry_type === 'manual'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0D2C5C] dark:text-amber-400 hover:underline font-semibold"
                        >
                          Buka ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Input Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400 mb-1">+ Tambahkan Artikel Manual</h2>
            <p className="text-xs text-slate-500 mb-4">Input berita atau rilis media yang tidak terjaring otomatis oleh scraper.</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Judul Berita</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bea Cukai Pekanbaru Gagalkan Penyelundupan..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Nama Media / Sumber</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Riau Pos, Antara Riau, Detik"
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">URL / Tautan Berita</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Kutipan / Ringkasan Singkat (Opsional)</label>
                <textarea
                  rows="3"
                  placeholder="Tulis ringkasan singkat isi berita..."
                  value={formData.snippet}
                  onChange={(e) => setFormData({ ...formData, snippet: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40"
                >
                  Simpan Berita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
