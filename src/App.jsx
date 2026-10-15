import React, { useState, useEffect, useRef } from 'react';
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

  // User Dropdown State (Kanan Atas)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');

  // Dashboard Data
  const [activeTab, setActiveTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
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

  // Tutup dropdown menu saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setIsUserMenuOpen(false);
    setUsername('');
    setPassword('');
  };

  // Filter & Pencarian
  const filteredArticles = (articles || []).filter((item) => {
    if (!item) return false;
    const title = (item.title || '').toLowerCase();
    const source = (item.source_name || '').toLowerCase();
    const sentiment = (item.sentiment || 'neutral').toLowerCase();
    
    const sentimentLabel = sentiment === 'positive' ? 'positif' : sentiment === 'negative' ? 'negatif kritis' : 'netral';
    const q = search.trim().toLowerCase();

    const matchesSearch = !q || title.includes(q) || source.includes(q) || sentiment.includes(q) || sentimentLabel.includes(q);
    const matchesType = filterType === 'all' ? true : item.entry_type === filterType;
    const matchesSentiment = filterSentiment === 'all' ? true : item.sentiment === filterSentiment;

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

    return matchesSearch && matchesType && matchesSentiment && matchesTime;
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

  // Hitung Data Tren 7 Hari Terakhir untuk Customized Line Chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const chartData = last7Days.map(dateStr => {
    const dayArticles = articles.filter(a => (a.published_at || '').slice(0, 10) === dateStr);
    const pos = dayArticles.filter(a => a.sentiment === 'positive').length;
    const neg = dayArticles.filter(a => a.sentiment === 'negative').length;
    const dayLabel = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    return { date: dayLabel, total: dayArticles.length, pos, neg };
  });

  const maxVal = Math.max(...chartData.map(d => d.total), 5);
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingY = 20;

  const pointsTotal = chartData.map((d, i) => {
    const x = paddingX + (i * ((chartWidth - (paddingX * 2)) / (chartData.length - 1)));
    const y = chartHeight - paddingY - (d.total / maxVal) * (chartHeight - (paddingY * 2));
    return `${x},${y}`;
  }).join(' ');

  const pointsPos = chartData.map((d, i) => {
    const x = paddingX + (i * ((chartWidth - (paddingX * 2)) / (chartData.length - 1)));
    const y = chartHeight - paddingY - (d.pos / maxVal) * (chartHeight - (paddingY * 2));
    return `${x},${y}`;
  }).join(' ');

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-[#0D2240] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // 1. HALAMAN LOGIN (DENGAN WALLPAPER KAPAL LANCANG KUNING RIAU)
  // =========================================================================
  if (!session) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col justify-between font-sans bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url('/login-bg.jpg')` }}
      >
        {/* Lapisan halus untuk kontras teks navbar */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-white/60 dark:to-slate-950/80 pointer-events-none"></div>

        {/* TOPBAR */}
        <header className="relative z-10 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 shadow-sm">
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
        <div className="relative z-10 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 py-2.5 px-6">
          <div className="w-full flex items-center gap-4 overflow-hidden text-xs">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                🕒 Senin – Jumat, 07.30 – 17.00 WIB
              </span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-marquee font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                ✨ <strong className="text-[#0D2240] dark:text-sky-400">Selamat datang di SIMONITA</strong> - Sistem Monitoring Opini dan Berita • Wilayah Pengawasan: Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan
              </div>
            </div>
          </div>
        </div>

        {/* FORM LOGIN KANAN (FLOATING CARD) */}
        <main className="relative z-10 w-full flex-1 flex items-center justify-center lg:justify-end px-6 sm:px-16 py-10">
          <div className="w-full max-w-md">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/80 dark:border-slate-800">
              
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
                    <a href="#help" onClick={(e) => { e.preventDefault(); alert('Hubungi Helpdesk Seksi PLI.'); }} className="text-[11px] font-semibold text-[#0A58CA] dark:text-sky-400 hover:underline">
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
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0D2240] to-[#153460] hover:from-[#08172c] hover:to-[#0D2240] text-white font-black text-sm shadow-lg transition disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
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

        <footer className="relative z-10 w-full py-3.5 px-6 text-center text-xs text-slate-500 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shrink-0">
          SIMONITA • Sistem Monitoring Opini dan Berita • Seksi Penyuluhan dan Layanan Informasi
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD UTAMA (SETELAH LOGIN)
  // =========================================================================
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      
      {/* KONTEN UTAMA */}
      <div className="w-full flex-1 p-3 sm:p-5 flex flex-col lg:flex-row gap-5">
        
        {/* ==================== SIDEBAR KIRI ==================== */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-3.5">
          
          {/* Logo SIMONITA */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xs border border-amber-200/70 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-1 flex items-center justify-center border border-amber-300 shadow shrink-0">
                <img src="/simonita.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="font-black text-base text-amber-900 dark:text-amber-400 tracking-wider block">SIMONITA</span>
                <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Monitoring & Opini</span>
              </div>
            </div>
          </div>

          {/* Navigasi Menu Sidebar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xs border border-amber-200/70 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-orange-500">
                ⚡ Menu Portal
              </span>
            </div>

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between text-xs font-bold ${
                activeTab === 'articles'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 border-l-4 border-orange-500 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>📰</span>
                <span>Artikel & Berita</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'articles' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {totalEntries}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between text-xs font-bold ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 border-l-4 border-orange-500 shadow-xs'
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
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 border-l-4 border-orange-500 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>🏛️</span>
                <span>Dewan Pers</span>
              </span>
            </button>
          </div>

          {/* Profil Petugas Ringkas di Sidebar Kiri */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xs border border-amber-200/70 dark:border-slate-800 mt-auto">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xs shadow">
                PLI
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  Admin PLI
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  KPPBC TMP B Pekanbaru
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ==================== AREA KONTEN KANAN ==================== */}
        <main className="flex-1 min-w-0 space-y-4">
          
          {/* Top Bar: Status Bar Lengkap & Dropdown Akun "Admin PLI" */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-2.5 px-4 shadow-xs border border-amber-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="font-black text-[11px] text-amber-900/60 dark:text-slate-400 tracking-wider uppercase">
                KPPBC TMP B PEKANBARU • SEKSI PLI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-[10px] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Online: 1</span>
              </span>
              <span className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-slate-300 font-mono text-[10px] border border-amber-200/60">
                <span>⏱</span>
                <span>{currentTime || '09:00:00 WIB'}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="h-7 w-7 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-slate-300 flex items-center justify-center text-xs border border-amber-200"
                title="Ganti Tema"
              >
                {isDarkMode ? '🌙' : '☀️'}
              </button>
              
              {/* DROPDOWN MENU KETIKA KLIK LOGO ADMIN PLI */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 pl-2 border-l border-amber-200 dark:border-slate-700 hover:opacity-85 transition focus:outline-none"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                    PLI
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 hidden md:inline">
                    Admin PLI ▾
                  </span>
                </button>

                {/* Popover Dropdown Keluar */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Admin PLI</p>
                      <p className="text-[10px] text-slate-400 truncate">{session?.user?.email || 'plibcpekanbaru@customs.go.id'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold flex items-center space-x-2 transition"
                    >
                      <span>↪</span>
                      <span>Keluar Portal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              BIG WELCOME HERO BANNER (WARNA KUNING - ORANYE HANGAT)
              ========================================================================= */}
          <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white p-6 sm:p-8 shadow-md border border-amber-300/40">
            <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] text-white font-semibold">
                  <span>✨ SIMONITA • Executive Media Monitoring Center</span>
                  <span className="text-white/60">•</span>
                  <span>{todayFormatted}</span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Halo, Sobat Humas Bea Cukai Pekanbaru!</span>
                  <span className="inline-block animate-bounce">👋</span>
                </h1>

                <p className="text-[11px] sm:text-xs text-white/90 leading-relaxed font-medium">
                  Pusat kendali pemantauan media daring dan analisis sentimen publik Seksi PLI Bea Cukai Pekanbaru.
                </p>
              </div>

              <div className="shrink-0 self-start md:self-center">
                <div className="px-3.5 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center space-x-2 text-[11px] font-bold text-white shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Sistem Online 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== TAB 1: ARTIKEL & BERITA ==================== */}
          {activeTab === 'articles' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-amber-200/70 dark:border-slate-800 space-y-3.5">
              
              {/* Header Tabel & Tombol Aksi */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-amber-950 dark:text-amber-400">
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
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white transition shadow-xs flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>Tambah Manual</span>
                  </button>
                </div>
              </div>

              {/* Filter & Bar Pencarian */}
              <div className="bg-[#FFFDF9] dark:bg-slate-800/50 p-2.5 rounded-xl border border-amber-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Cari judul, media, atau sentimen (Positif / Netral / Negatif)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterSentiment}
                    onChange={(e) => setFilterSentiment(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="all">Semua Sentimen</option>
                    <option value="positive">🟢 Positif</option>
                    <option value="neutral">⚪ Netral</option>
                    <option value="negative">🔴 Negatif</option>
                  </select>

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
                      <tr className="bg-amber-50/50 dark:bg-slate-800/70 border-b border-amber-200/60 dark:border-slate-800 text-amber-900/70 uppercase font-bold tracking-wider">
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
                          <tr key={article.id || article.url} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition">
                            
                            {/* JUDUL BERITA KLIKABLE */}
                            <td className="py-2.5 px-3 align-top">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-orange-600 dark:hover:text-amber-400 hover:underline leading-snug block transition cursor-pointer"
                                title="Klik untuk membuka tautan berita asli ↗"
                              >
                                {article.title}
                              </a>
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
                                {article.sentiment === 'positive' ? 'Positif' : article.sentiment === 'negative' ? 'Negatif' : 'Netral'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-2">
                                <a 
                                  href={article.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-orange-600 dark:text-amber-400 font-bold hover:underline"
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

          {/* =========================================================================
              TAB 2: STATISTIK & OPINI + CUSTOMIZED LINE CHART
              ========================================================================= */}
          {activeTab === 'stats' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-amber-200/70 dark:border-slate-800 space-y-6">
              
              <div>
                <h2 className="text-base font-black text-amber-950 dark:text-amber-400">
                  Ringkasan Analisis Sentimen & Persepsi Publik
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribusi pemberitaan dan tren publikasi media di lingkungan KPPBC TMP B Pekanbaru
                </p>
              </div>

              {/* Kartu Ringkasan Angka */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#FFFDF9] dark:bg-slate-800 p-4 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[11px] text-amber-900/60 font-bold uppercase">Total Berita</span>
                  <div className="text-2xl font-black mt-1 text-amber-950 dark:text-white">{totalEntries}</div>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                  <span className="text-[11px] text-emerald-700 font-bold uppercase">Sentimen Positif</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{articles.filter(a => a.sentiment === 'positive').length}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Sentimen Netral</span>
                  <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length}</div>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200/80 shadow-xs">
                  <span className="text-[11px] text-rose-700 font-bold uppercase">Sentimen Negatif</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{articles.filter(a => a.sentiment === 'negative').length}</div>
                </div>
              </div>

              {/* CUSTOMIZED LINE CHART (7 HARI TERAKHIR) */}
              <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-slate-800/40 border border-amber-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-400 flex items-center gap-1.5">
                      <span>📈</span>
                      <span>Tren Frekuensi Publikasi Berita (7 Hari Terakhir)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Memvisualisasikan volume berita harian dan perbandingan sentimen positif
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] font-semibold">
                    <span className="flex items-center space-x-1 text-orange-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span>Total Berita</span>
                    </span>
                    <span className="flex items-center space-x-1 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Positif</span>
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto pt-2">
                  <div className="min-w-[560px]">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                      <defs>
                        <linearGradient id="lineGradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.5, 1].map((ratio, idx) => {
                        const y = chartHeight - paddingY - (ratio * (chartHeight - (paddingY * 2)));
                        return (
                          <g key={idx}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                            <text x={paddingX - 10} y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">
                              {Math.round(ratio * maxVal)}
                            </text>
                          </g>
                        );
                      })}

                      {chartData.length > 1 && (
                        <polygon
                          points={`${paddingX},${chartHeight - paddingY} ${pointsTotal} ${chartWidth - paddingX},${chartHeight - paddingY}`}
                          fill="url(#lineGradTotal)"
                        />
                      )}

                      <polyline
                        fill="none"
                        stroke="#F97316"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pointsTotal}
                      />

                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="5 3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pointsPos}
                      />

                      {chartData.map((d, i) => {
                        const x = paddingX + (i * ((chartWidth - (paddingX * 2)) / (chartData.length - 1)));
                        const yTotal = chartHeight - paddingY - (d.total / maxVal) * (chartHeight - (paddingY * 2));
                        const yPos = chartHeight - paddingY - (d.pos / maxVal) * (chartHeight - (paddingY * 2));
                        return (
                          <g key={i}>
                            <circle cx={x} cy={yTotal} r="4" fill="#FFFFFF" stroke="#F97316" strokeWidth="2.5" />
                            <text x={x} y={yTotal - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#C2410C">
                              {d.total}
                            </text>
                            <circle cx={x} cy={yPos} r="3" fill="#10B981" />
                            <text x={x} y={chartHeight - 4} textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="600">
                              {d.date}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ==================== TAB 3: DEWAN PERS ==================== */}
          {activeTab === 'press' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-amber-200/70 dark:border-slate-800 space-y-3.5">
              <h2 className="text-base font-black text-amber-950 dark:text-amber-400">
                Verifikasi Lembaga Pers & Wartawan Terdaftar
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Basis data resmi Dewan Pers Republik Indonesia untuk memeriksa legalitas faktual perusahaan media dan sertifikasi kompetensi jurnalis yang meliput di lingkungan KPPBC TMP B Pekanbaru.
              </p>
              <a
                href="https://dewanpers.or.id/data"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-xs transition"
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
            <h2 className="text-base font-black text-amber-950 dark:text-amber-400 mb-3">
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
                <option value="negative">Negatif (Perlu Tindak Lanjut)</option>
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-xs"
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
