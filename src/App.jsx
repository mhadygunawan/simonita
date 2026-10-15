import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getArticles, addManualArticle, updateArticle, deleteArticle, subscribeToArticles } from './services/articles';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      }
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getArticles();
      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Gagal memuat artikel:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
      try {
        const channel = subscribeToArticles(() => loadData());
        return () => {
          if (channel) channel.unsubscribe();
        };
      } catch (e) {}
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'plibcpekanbaru' && cleanPass === 'PLI123456') {
      setTimeout(() => {
        setSession({ user: { email: 'plibcpekanbaru@customs.go.id' } });
        setAuthLoading(false);
      }, 250);
      return;
    }

    try {
      const targetEmail = username.includes('@') ? username.trim() : `${username.trim()}@customs.go.id`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error) {
        throw error;
      } else {
        setSession(data.session);
      }
    } catch (err) {
      setAuthError('Nama Pengguna atau Kata Sandi tidak cocok.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setSession(null);
    setUsername('');
    setPassword('');
  };

  const filteredArticles = (articles || []).filter((item) => {
    if (!item) return false;
    const title = (item.title || '').toLowerCase();
    const source = (item.source_name || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = title.includes(q) || source.includes(q);
    const matchesType = filterType === 'all' ? true : item.entry_type === filterType;

    let matchesTime = true;
    if (timeFilter !== 'all' && item.published_at) {
      try {
        const pubDate = new Date(item.published_at);
        const diffHours = (new Date() - pubDate) / (1000 * 60 * 60);
        if (timeFilter === '24h') matchesTime = diffHours <= 24;
        if (timeFilter === '7d') matchesTime = diffHours <= 24 * 7;
        if (timeFilter === '30d') matchesTime = diffHours <= 24 * 30;
      } catch (e) {
        matchesTime = true;
      }
    }

    return matchesSearch && matchesType && matchesTime;
  });

  const totalEntries = filteredArticles.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + rowsPerPage);

  const exportToCSV = () => {
    if (filteredArticles.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ['No', 'Judul Berita', 'Sumber Media', 'Waktu Terbit', 'Tipe Entri', 'Sentimen Opini', 'URL Artikel'];
    const rows = filteredArticles.map((article, index) => [
      index + 1,
      `"${(article.title || '').replace(/"/g, '""')}"`,
      `"${(article.source_name || '').replace(/"/g, '""')}"`,
      `"${article.published_at ? new Date(article.published_at).toLocaleString('id-ID') : '-'}"`,
      `"${article.entry_type || 'scraped'}"`,
      `"${article.sentiment || 'neutral'}"`,
      `"${(article.url || '').replace(/"/g, '""')}"`
    ].join(','));

    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SIMONITA_Rekap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddModal = () => {
    setEditingArticleId(null);
    setFormData({
      title: '',
      source_name: '',
      url: '',
      snippet: '',
      sentiment: 'neutral'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article) => {
    setEditingArticleId(article.id);
    setFormData({
      title: article.title || '',
      source_name: article.source_name || '',
      url: article.url || '',
      snippet: article.snippet || '',
      sentiment: article.sentiment || 'neutral'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus artikel ini secara permanen dari basis data SIMONITA?')) {
      try {
        await deleteArticle(id);
        loadData();
      } catch (err) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  const handleSubmitArticle = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.source_name || !formData.url) {
      alert('Mohon isi Judul Berita, Media Sumber, dan URL.');
      return;
    }

    try {
      if (editingArticleId) {
        await updateArticle(editingArticleId, formData);
      } else {
        await addManualArticle(formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-[#0D2C5C] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // 1. TAMPILAN LOGIN (FULL PAGE PROPORSI CENTER)
  // =========================================================================
  if (!session) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-950 font-sans overflow-x-hidden">
        
        {/* NAVBAR ATAS */}
        <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-10 py-3.5 shrink-0 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#0D2C5C] p-1.5 flex items-center justify-center border border-amber-400 shrink-0 shadow">
                <img src="/simonita.png" alt="Logo SIMONITA" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-xl text-[#0D2C5C] dark:text-amber-400 tracking-wider">SIMONITA</span>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Seksi Penyuluhan dan Layanan Informasi
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Server Online</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`px-3 py-1.5 rounded-lg transition ${!isDarkMode ? 'bg-white text-amber-600 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  ☀️ Terang
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition ${isDarkMode ? 'bg-[#0D2C5C] text-white shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  🌙 Gelap
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* RUNNING TICKER */}
        <div className="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-6 sm:px-10 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center gap-4 overflow-hidden text-xs">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px]">
                🕒 Senin – Jumat, 07.30 – 17.00 WIB
              </span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-marquee font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                ✨ <strong className="text-[#0D2C5C] dark:text-amber-400">Selamat datang di SIMONITA</strong> - Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Wilayah Pengawasan: Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan
              </div>
            </div>
          </div>
        </div>

        {/* KONTEN LOGIN TENGAH */}
        <main className="w-full max-w-7xl mx-auto flex-1 flex items-center justify-center lg:justify-end px-6 sm:px-10 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800">
              
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Seksi Penyuluhan dan Layanan Informasi</span>
                </span>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Terverifikasi</span>
                </span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                Masuk ke Akun
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                Portal autentikasi
              </p>

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Pengguna (NIP / ID Kedinasan)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      👤
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="ID Pegawai / NIP"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                    <a href="#help" onClick={(e) => { e.preventDefault(); alert('Hubungi Helpdesk Seksi PLI.'); }} className="text-[11px] font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline">
                      Lupa kata sandi?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
                >
                  <span>{authLoading ? 'Memeriksa Akses...' : 'Masuk ke SIMONITA'}</span>
                  <span>→</span>
                </button>
              </form>

              <div className="mt-8 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Copyright © 2026 Seksi PLI</span>
                </span>
                <span className="font-mono text-slate-400">v1.0</span>
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="w-full py-3.5 px-6 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shrink-0">
          SIMONITA • Sistem Monitoring Opini dan Berita • Seksi Penyuluhan dan Layanan Informasi
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD UTAMA (TERPUSAT, RAPI, TIDAK TERPOTONG KE KANAN)
  // =========================================================================
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER DASHBOARD */}
      <header className="sticky top-0 z-30 bg-[#0D2C5C] text-white px-6 sm:px-10 py-3 shadow-md border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-amber-400 shrink-0">
              <img src="/simonita.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider block">SIMONITA</span>
              <p className="text-[11px] text-slate-300">Seksi Penyuluhan dan Layanan Informasi</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="hidden md:inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono">
              {session?.user?.email || username || 'Pegawai PLI'}
            </span>
            <button onClick={handleLogout} className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition shadow-sm">
              Keluar Portal
            </button>
          </div>
        </div>
      </header>

      {/* BODY DASHBOARD (CENTERED DENGAN MAX-W-7XL) */}
      <div className="w-full max-w-7xl mx-auto flex-1 px-4 sm:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR NAV */}
        <aside className="w-full md:w-56 shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition ${activeTab === 'articles' ? 'bg-[#0D2C5C] text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              📰 Artikel & Berita ({totalEntries})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition ${activeTab === 'stats' ? 'bg-[#0D2C5C] text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              📊 Statistik & Opini
            </button>
            <button
              onClick={() => setActiveTab('press')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition ${activeTab === 'press' ? 'bg-[#0D2C5C] text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              🏛️ Dewan Pers
            </button>
          </div>
        </aside>

        {/* KONTEN UTAMA */}
        <main className="flex-1 min-w-0">
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-lg font-extrabold text-[#0D2C5C] dark:text-amber-400">Daftar Artikel & Berita</h2>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportToCSV} className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition shadow-sm">
                    📥 Ekspor CSV
                  </button>
                  <button onClick={loadData} className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition shadow-sm">
                    🔄 Refresh
                  </button>
                  <button onClick={handleOpenAddModal} className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0D2C5C] text-white hover:bg-[#0A2247] transition shadow-sm">
                    + Tambah Manual
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 shadow-sm text-xs">
                <input
                  type="text"
                  placeholder="Cari judul berita atau media..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0D2C5C]"
                />
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="scraped">Pemindaian Otomatis</option>
                    <option value="manual">Input Manual</option>
                  </select>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="24h">24 Jam Terakhir</option>
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">Bulan Ini</option>
                  </select>
                </div>
              </div>

              {/* TABEL RESPONSIVE */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4 min-w-[280px]">Judul Berita & Cuplikan</th>
                        <th className="py-3 px-3 w-36">Media Sumber</th>
                        <th className="py-3 px-3 w-24">Waktu</th>
                        <th className="py-3 px-3 w-20 text-center">Sentimen</th>
                        <th className="py-3 px-3 w-20 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {loading ? (
                        <tr><td colSpan="5" className="py-12 text-center text-slate-400">Memuat artikel...</td></tr>
                      ) : paginatedArticles.length === 0 ? (
                        <tr><td colSpan="5" className="py-12 text-center text-slate-400">Tidak ada artikel yang sesuai kriteria.</td></tr>
                      ) : (
                        paginatedArticles.map((article) => (
                          <tr key={article.id || article.url} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 align-top">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                {article.title}
                              </div>
                              {article.snippet && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                                  {article.snippet}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 align-top whitespace-nowrap">
                              <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                                {article.source_name}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-0.5">
                                {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top text-slate-500 dark:text-slate-400 whitespace-nowrap text-[10px]">
                              {article.published_at ? new Date(article.published_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : '-'}
                            </td>

                            <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                article.sentiment === 'positive' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                  : article.sentiment === 'negative' 
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {article.sentiment === 'positive' ? 'Positif' : article.sentiment === 'negative' ? 'Kritis' : 'Netral'}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-2">
                                <a 
                                  href={article.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[#0D2C5C] dark:text-amber-400 font-bold hover:underline"
                                  title="Buka Tautan Berita"
                                >
                                  ↗
                                </a>
                                <button 
                                  onClick={() => handleOpenEditModal(article)} 
                                  className="text-slate-400 hover:text-amber-500 p-0.5"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => handleDelete(article.id)} 
                                  className="text-slate-400 hover:text-rose-500 p-0.5"
                                  title="Hapus"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINASI */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px]">
                  <span className="text-slate-500">
                    Menampilkan {totalEntries ? startIndex + 1 : 0} - {Math.min(startIndex + rowsPerPage, totalEntries)} dari {totalEntries} artikel
                  </span>
                  <div className="flex items-center space-x-1">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                      className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border disabled:opacity-40 font-semibold"
                    >
                      ←
                    </button>
                    <span className="px-2.5 py-1 font-bold">{currentPage} / {totalPages}</span>
                    <button 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                      className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border disabled:opacity-40 font-semibold"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Berita</span>
                  <div className="text-2xl font-black mt-1">{totalEntries}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm">
                  <span className="text-xs text-emerald-600 font-semibold uppercase">Positif</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{articles.filter(a => a.sentiment === 'positive').length}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Netral</span>
                  <div className="text-2xl font-black text-slate-600 mt-1">{articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm">
                  <span className="text-xs text-rose-600 font-semibold uppercase">Kritis</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{articles.filter(a => a.sentiment === 'negative').length}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'press' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400">Verifikasi Anggota Resmi Dewan Pers</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Gunakan basis data resmi Dewan Pers untuk memeriksa verifikasi faktual media massa yang meliput kegiatan kedinasan.
              </p>
              <a href="https://dewanpers.or.id/data" target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded-xl bg-amber-400 text-[#0D2C5C] font-bold text-xs shadow-sm">
                Buka Basis Data Dewan Pers ↗
              </a>
            </div>
          )}
        </main>
      </div>

      {/* MODAL INPUT / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border">
            <h2 className="text-base font-bold text-[#0D2C5C] dark:text-amber-400 mb-3">{editingArticleId ? 'Edit Artikel' : 'Tambah Artikel Manual'}</h2>
            <form onSubmit={handleSubmitArticle} className="space-y-3 text-xs">
              <input type="text" required placeholder="Judul Berita" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              <input type="text" required placeholder="Media Sumber" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              <input type="url" required placeholder="URL Berita" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              <select value={formData.sentiment} onChange={e => setFormData({...formData, sentiment: e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800">
                <option value="positive">Positif</option>
                <option value="neutral">Netral</option>
                <option value="negative">Kritis</option>
              </select>
              <textarea placeholder="Ringkasan isi berita..." value={formData.snippet} onChange={e => setFormData({...formData, snippet: e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800" rows="3"></textarea>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#0D2C5C] text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
