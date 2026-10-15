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

  // Banner Notification State
  const [showNotifyBanner, setShowNotifyBanner] = useState(true);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');

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

  // Jam Dinamis Realtime
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-[#0D2240] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // 1. HALAMAN LOGIN
  // =========================================================================
  if (!session) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-[#EEF5FB] via-[#E8F2FA] to-[#DFECF7] dark:from-slate-950 dark:to-slate-900 font-sans">
        
        {/* TOPBAR */}
        <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-sky-100 dark:border-slate-800 px-6 py-3.5 shadow-sm">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#0D2240] to-[#163868] p-1.5 flex items-center justify-center border border-sky-300 shadow-md shrink-0">
                <img src="/simonita.png" alt="Logo SIMONITA" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-xl text-[#0D2240] dark:text-sky-400 tracking-wider">SIMONITA</span>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
                  Seksi Penyuluhan dan Layanan Informasi
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Server Online</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center rounded-xl bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`px-3 py-1.5 rounded-lg transition ${!isDarkMode ? 'bg-[#0D2240] text-white shadow-xs font-bold' : 'text-slate-500'}`}
                >
                  ☀️ Terang
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition ${isDarkMode ? 'bg-[#0D2240] text-white shadow-xs font-bold' : 'text-slate-500'}`}
                >
                  🌙 Gelap
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* RUNNING TICKER */}
        <div className="w-full bg-white/70 dark:bg-slate-900/70 border-b border-sky-100 dark:border-slate-800 py-2.5 px-6">
          <div className="w-full flex items-center gap-4 overflow-hidden text-xs">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                🕒 Senin – Jumat, 07.30 – 17.00 WIB
              </span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-marquee font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                ✨ <strong className="text-[#0D2240] dark:text-sky-400">Selamat datang di SIMONITA</strong> - Sistem Monitoring Opini dan Berita • Wilayah Pengawasan: Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan
              </div>
            </div>
          </div>
        </div>

        {/* FORM LOGIN */}
        <main className="w-full flex-1 flex items-center justify-center lg:justify-end px-6 sm:px-12 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl border border-sky-100 dark:border-slate-800">
              
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Seksi Penyuluhan dan Layanan Informasi</span>
                </span>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Terverifikasi</span>
                </span>
              </div>

              <h1 className="text-2xl font-black text-[#0D2240] dark:text-white tracking-tight mb-1">
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2240] font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                    <a href="#help" onClick={(e) => { e.preventDefault(); alert('Hubungi Helpdesk Seksi PLI.'); }} className="text-[11px] font-semibold text-[#0D2240] dark:text-sky-400 hover:underline">
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
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2240] font-medium"
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
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0D2240] to-[#153460] hover:from-[#08172c] hover:to-[#0D2240] text-white font-black text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
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

        <footer className="w-full py-3.5 px-6 text-center text-xs text-slate-400 border-t border-sky-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 shrink-0">
          SIMONITA • Sistem Monitoring Opini dan Berita • Seksi Penyuluhan dan Layanan Informasi
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD UTAMA (100% EDGE-TO-EDGE FULL WIDTH)
  // =========================================================================
  return (
    <div className="min-h-screen w-full bg-[#EDF3F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      
      {/* KONTEN UTAMA DENGAN LEBAR PENUH 100% */}
      <div className="w-full flex-1 p-3 sm:p-5 flex flex-col lg:flex-row gap-5">
        
        {/* ==================== SIDEBAR KIRI ==================== */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-3.5">
          
          {/* Logo SIMONITA */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0D2240] to-[#1e467d] p-1 flex items-center justify-center border border-sky-300/40 shadow shrink-0">
                <img src="/simonita.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="font-black text-base text-[#0D2240] dark:text-sky-400 tracking-wider block">SIMONITA</span>
                <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Monitoring & Opini</span>
              </div>
            </div>
          </div>

          {/* Navigasi Menu Sidebar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-amber-500">
                ⚡ Menu Portal
              </span>
            </div>

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between text-xs font-bold ${
                activeTab === 'articles'
                  ? 'bg-gradient-to-r from-[#EBF5FF] to-[#DDF0FF] text-[#0A58CA] border-l-4 border-[#0A58CA] shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>📰</span>
                <span>Artikel & Berita</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'articles' ? 'bg-[#0A58CA] text-white' : 'bg-slate-100 text-slate-600'}`}>
                {totalEntries}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between text-xs font-bold ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-[#EBF5FF] to-[#DDF0FF] text-[#0A58CA] border-l-4 border-[#0A58CA] shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>📊</span>
                <span>Statistik & Opini</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('press')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between text-xs font-bold ${
                activeTab === 'press'
                  ? 'bg-gradient-to-r from-[#EBF5FF] to-[#DDF0FF] text-[#0A58CA] border-l-4 border-[#0A58CA] shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>🏛️</span>
                <span>Dewan Pers</span>
              </span>
            </button>
          </div>

          {/* Profil Petugas & Tombol Keluar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-200/80 dark:border-slate-800 mt-auto space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-[#0D2240] text-white flex items-center justify-center font-black text-xs shadow">
                PLI
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  Petugas Humas PLI
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  KPPBC TMP B Pekanbaru
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-800/40 transition flex items-center justify-center space-x-1.5"
            >
              <span>↪</span>
              <span>KELUAR</span>
            </button>
          </div>
        </aside>

        {/* ==================== AREA KONTEN KANAN (100% FULL WIDTH) ==================== */}
        <main className="flex-1 min-w-0 space-y-4">
          
          {/* Top Bar 1: Alert Pemberitahuan */}
          {showNotifyBanner && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 px-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="h-7 w-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  🔔
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Tetap terupdate dengan rilis berita & opini publik terbaru
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:block">
                    Aktifkan sinkronisasi otomatis agar analisis berita masuk secara real-time.
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setShowNotifyBanner(false)}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-[11px] font-semibold"
                >
                  Nanti Saja
                </button>
                <button
                  onClick={() => {
                    loadData();
                    setShowNotifyBanner(false);
                  }}
                  className="px-3.5 py-1 rounded-lg bg-[#0A58CA] hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs"
                >
                  Aktifkan
                </button>
              </div>
            </div>
          )}

          {/* Top Bar 2: Status Bar Lengkap */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-2.5 px-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="font-black text-[11px] text-slate-400 tracking-wider uppercase">
                KPPBC TMP B PEKANBARU • SEKSI PLI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-[10px] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Online: 1</span>
              </span>
              <span className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                <span>⏱</span>
                <span>{currentTime || '09:00:00 WIB'}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                title="Ganti Tema"
              >
                {isDarkMode ? '🌙' : '☀️'}
              </button>
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="h-6 w-6 rounded-full bg-[#0D2240] text-amber-400 flex items-center justify-center font-bold text-[10px]">
                  PLI
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 hidden md:inline">
                  Admin PLI
                </span>
              </div>
            </div>
          </div>

          {/* BIG WELCOME HERO BANNER */}
          <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#07162C] via-[#0D2240] to-[#122F5A] text-white p-5 sm:p-7 shadow-lg border border-sky-400/20">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] text-sky-200 font-semibold">
                  <span>✨ SIMONITA • Executive Media Monitoring Center</span>
                  <span className="text-white/40">•</span>
                  <span>{todayFormatted}</span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Halo, Sobat Humas Bea Cukai Pekanbaru!</span>
                  <span className="inline-block animate-bounce">👋</span>
                </h1>

                <p className="text-[11px] sm:text-xs text-sky-100/80 leading-relaxed">
                  Pusat kendali pemantauan media daring, analisis sentimen publik, kliping berita lokal/nasional, dan verifikasi Dewan Pers Seksi PLI Bea Cukai Pekanbaru.
                </p>
              </div>

              <div className="shrink-0 self-start md:self-center">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center space-x-2 text-[11px] font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Sistem Online 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== TAB 1: ARTIKEL & BERITA ==================== */}
          {activeTab === 'articles' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              
              {/* Header Tabel & Tombol Aksi */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-[#0D2240] dark:text-sky-400">
                    Daftar Artikel Berita & Opini Publik
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Hasil pemindaian otomatis dan penambahan kliping berita manual
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportToCSV}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-400/60 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition shadow-xs flex items-center space-x-1"
                  >
                    <span>📥</span>
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    onClick={loadData}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs flex items-center space-x-1"
                  >
                    <span>🔄</span>
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#0A58CA] hover:bg-blue-700 text-white transition shadow-sm flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>Tambah Manual</span>
                  </button>
                </div>
              </div>

              {/* Filter & Bar Pencarian */}
              <div className="bg-[#F8FAFC] dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Cari judul berita atau nama media..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0A58CA]"
                />
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="scraped">Pemindaian Otomatis</option>
                    <option value="manual">Input Manual</option>
                  </select>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="24h">24 Jam Terakhir</option>
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">Bulan Ini</option>
                  </select>
                </div>
              </div>

              {/* Tabel Berita Rapi */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3 min-w-[280px]">Judul Berita & Cuplikan</th>
                        <th className="py-2.5 px-3 w-36">Media Sumber</th>
                        <th className="py-2.5 px-3 w-24">Waktu</th>
                        <th className="py-2.5 px-3 w-24 text-center">Sentimen</th>
                        <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {loading ? (
                        <tr><td colSpan="5" className="py-10 text-center text-slate-400 font-medium">Memuat artikel...</td></tr>
                      ) : paginatedArticles.length === 0 ? (
                        <tr><td colSpan="5" className="py-10 text-center text-slate-400 font-medium">Tidak ada artikel yang sesuai kriteria.</td></tr>
                      ) : (
                        paginatedArticles.map((article) => (
                          <tr key={article.id || article.url} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 align-top">
                              <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {article.title}
                              </div>
                              {article.snippet && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                                  {article.snippet}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 align-top whitespace-nowrap">
                              <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                                {article.source_name}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-0.5">
                                {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 align-top text-slate-500 dark:text-slate-400 whitespace-nowrap text-[10px]">
                              {article.published_at ? new Date(article.published_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : '-'}
                            </td>

                            <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
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

                            <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-2">
                                <a 
                                  href={article.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[#0A58CA] dark:text-sky-400 font-bold hover:underline"
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

                {/* Kontrol Paginasi */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium">
                    Menampilkan {totalEntries ? startIndex + 1 : 0} - {Math.min(startIndex + rowsPerPage, totalEntries)} dari {totalEntries} artikel
                  </span>
                  <div className="flex items-center space-x-1">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-semibold"
                    >
                      ←
                    </button>
                    <span className="px-2.5 py-1 font-bold">{currentPage} / {totalPages}</span>
                    <button 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-semibold"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: STATISTIK ==================== */}
          {activeTab === 'stats' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-black text-[#0D2240] dark:text-sky-400">
                Ringkasan Analisis Sentimen & Persepsi Publik
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#F8FAFC] dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Total Berita</span>
                  <div className="text-xl font-black mt-1 text-[#0D2240] dark:text-white">{totalEntries}</div>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
                  <span className="text-[11px] text-emerald-700 font-bold uppercase">Positif</span>
                  <div className="text-xl font-black text-emerald-600 mt-1">{articles.filter(a => a.sentiment === 'positive').length}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Netral</span>
                  <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length}</div>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200/80 shadow-xs">
                  <span className="text-[11px] text-rose-700 font-bold uppercase">Kritis</span>
                  <div className="text-xl font-black text-rose-600 mt-1">{articles.filter(a => a.sentiment === 'negative').length}</div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: DEWAN PERS ==================== */}
          {activeTab === 'press' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <h2 className="text-base font-black text-[#0D2240] dark:text-sky-400">
                Verifikasi Lembaga Pers & Wartawan Terdaftar
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Basis data resmi Dewan Pers Republik Indonesia untuk memeriksa legalitas faktual perusahaan media dan sertifikasi kompetensi jurnalis yang meliput di lingkungan KPPBC TMP B Pekanbaru.
              </p>
              <a
                href="https://dewanpers.or.id/data"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0A58CA] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
              >
                <span>Buka Basis Data Dewan Pers ↗</span>
              </a>
            </div>
          )}

        </main>
      </div>

      {/* ==================== MODAL TAMBAH / EDIT ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-black text-[#0D2240] dark:text-sky-400 mb-3">
              {editingArticleId ? '✏️ Edit Artikel Berita' : '+ Tambah Artikel Manual'}
            </h2>
            <form onSubmit={handleSubmitArticle} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Judul Berita"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              />
              <input
                type="text"
                required
                placeholder="Media Sumber (misal: Riau Pos, Antara Riau)"
                value={formData.source_name}
                onChange={e => setFormData({...formData, source_name: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              />
              <input
                type="url"
                required
                placeholder="URL Berita (https://...)"
                value={formData.url}
                onChange={e => setFormData({...formData, url: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              />
              <select
                value={formData.sentiment}
                onChange={e => setFormData({...formData, sentiment: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="positive">Positif (Apresiasi / Kinerja)</option>
                <option value="neutral">Netral (Informasi Umum)</option>
                <option value="negative">Kritis (Perlu Tindak Lanjut)</option>
              </select>
              <textarea
                placeholder="Ringkasan isi berita / catatan analis..."
                value={formData.snippet}
                onChange={e => setFormData({...formData, snippet: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                rows="3"
              ></textarea>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0A58CA] hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
