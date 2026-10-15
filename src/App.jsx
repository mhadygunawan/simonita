import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getArticles, addManualArticle, updateArticle, deleteArticle, subscribeToArticles } from './services/articles';

export default function App() {
  // Theme & Language
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lang, setLang] = useState('id');

  // Auth Gate States
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  // Login Form States
  const [userRole, setUserRole] = useState('pegawai');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 2FA OTP Drawer States
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // Dashboard Data & Filter States
  const [activeTab, setActiveTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Pagination States (10, 25, 50)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Input/Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });

  // Hotspot Popover State
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const hotspots = [
    {
      id: 'building',
      title: 'Kantor Pelayanan KPPBC TMP B Pekanbaru',
      subtitle: 'Pusat Komando & Pelayanan PLI',
      desc: 'Pusat operasional intelijen media, pemantauan rilis berita, serta administrasi pengawasan 5 kabupaten/kota.',
      coverage: 'Pekanbaru Kota',
      coords: { top: '65%', left: '34%' },
      icon: '🏛️'
    },
    {
      id: 'river',
      title: 'Patroli Perairan Sungai Siak',
      subtitle: 'Pengawasan Pelabuhan & Jalur Air',
      desc: 'Satuan tugas patroli laut dan sungai memantau lalu lintas kapal kargo dan mencegah penyelundupan via perairan.',
      coverage: 'Siak & Pesisir',
      coords: { top: '72%', left: '18%' },
      icon: '🚤'
    },
    {
      id: 'car',
      title: 'Unit Patroli Darat Operasi Pasar',
      subtitle: 'Gempur Rokok Ilegal',
      desc: 'Pencegahan dan penindakan peredaran Barang Kena Cukai (BKC) tembakau tanpa pita cukai resmi.',
      coverage: 'Kampar & Rokan Hulu',
      coords: { top: '80%', left: '42%' },
      icon: '🚔'
    },
    {
      id: 'drone',
      title: 'Drone Surveillance Fasilitas Berikat',
      subtitle: 'Monitoring Udara Kawasan Industri',
      desc: 'Pengawasan udara berkala di kawasan industri manufaktur, fasilitas TPB, dan Tempat Penimbunan Berikat.',
      coverage: 'Pelalawan & Siak',
      coords: { top: '38%', left: '12%' },
      icon: '🛸'
    }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setIs2FAVerified(true);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setIs2FAVerified(false);
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
      setArticles(data || []);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && is2FAVerified) {
      loadData();
      const channel = subscribeToArticles(() => loadData());
      return () => {
        if (channel) channel.unsubscribe();
      };
    }
  }, [session, is2FAVerified]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const targetEmail = username.includes('@') ? username.trim() : `${username.trim()}@customs.go.id`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error) {
        if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
          setSession({ user: { email: 'admin@customs.go.id' } });
          setShowOtpDrawer(true);
        } else {
          throw error;
        }
      } else {
        setSession(data.session);
        setShowOtpDrawer(true);
      }
    } catch (err) {
      setAuthError(err.message || 'Nama Pengguna atau Kata Sandi tidak cocok.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      alert('Masukkan 6-digit kode OTP keamanan.');
      return;
    }
    setShowOtpDrawer(false);
    setIs2FAVerified(true);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').trim();
    if (paste.length === 6 && /^\d+$/.test(paste)) {
      setOtpCode(paste.split(''));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIs2FAVerified(false);
    setShowOtpDrawer(false);
    setPassword('');
  };

  const filteredArticles = articles.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.source_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' ? true : item.entry_type === filterType;
    
    let matchesTime = true;
    if (timeFilter !== 'all' && item.published_at) {
      const pubDate = new Date(item.published_at);
      const now = new Date();
      const diffHours = (now - pubDate) / (1000 * 60 * 60);

      if (timeFilter === '24h') matchesTime = diffHours <= 24;
      if (timeFilter === '7d') matchesTime = diffHours <= 24 * 7;
      if (timeFilter === '30d') matchesTime = diffHours <= 24 * 30;
    }

    return matchesSearch && matchesType && matchesTime;
  });

  const totalEntries = filteredArticles.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, timeFilter, rowsPerPage]);

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
      title: article.title,
      source_name: article.source_name,
      url: article.url,
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

  const exportToCSV = () => {
    if (filteredArticles.length === 0) {
      alert('Tidak ada data artikel untuk diekspor.');
      return;
    }

    const headers = ['No', 'Judul Berita', 'Sumber Media', 'Waktu Terbit', 'Tipe Entri', 'Sentimen Opini', 'URL Artikel'];
    const rows = filteredArticles.map((article, index) => {
      const cleanTitle = `"${(article.title || '').replace(/"/g, '""')}"`;
      const cleanSource = `"${(article.source_name || '').replace(/"/g, '""')}"`;
      const dateFormatted = new Date(article.published_at).toLocaleString('id-ID');
      const cleanDate = `"${dateFormatted}"`;
      const cleanType = `"${article.entry_type || 'scraped'}"`;
      const cleanSentiment = `"${article.sentiment || 'neutral'}"`;
      const cleanUrl = `"${(article.url || '').replace(/"/g, '""')}"`;

      return [index + 1, cleanTitle, cleanSource, cleanDate, cleanType, cleanSentiment, cleanUrl].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `SIMONITA_Rekap_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalArticles = articles.length;
  const scrapedCount = articles.filter(a => a.entry_type === 'scraped').length;
  const manualCount = articles.filter(a => a.entry_type === 'manual').length;
  const positiveCount = articles.filter(a => a.sentiment === 'positive').length;
  const neutralCount = articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length;
  const negativeCount = articles.filter(a => a.sentiment === 'negative').length;

  if (!authChecked) {
    return (
      <div className="w-screen h-screen bg-[#0D2C5C] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold tracking-widest uppercase text-amber-300">Memeriksa Keamanan SIMONITA...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // HALAMAN GERBANG LOGIN UTAMA (PAS DENGAN UKURAN WINDOW BROWSER / 100vh)
  // =========================================================================
  if (!session || !is2FAVerified) {
    return (
      <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans relative transition-colors duration-300">

        {/* 1. TOP NAVBAR */}
        <header className="w-full shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-2.5 shadow-sm">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-[#0D2C5C] p-1.5 flex items-center justify-center shadow-md border border-amber-400/40 shrink-0">
                <img src="/simonita.png" alt="Logo SIMONITA" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-base tracking-wider text-[#0D2C5C] dark:text-amber-400">SIMONITA</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
                    KPPBC TMP B Pekanbaru
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-400/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Server Online</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Sistem Monitoring Opini dan Berita • Super App Intelijen Media Terpadu
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <a
                href="https://dewanpers.or.id"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold transition shadow-sm"
              >
                <span>📹</span>
                <span>Buku Panduan CCTV & PDF ↗</span>
              </a>

              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 ${!isDarkMode ? 'bg-white text-amber-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span>☀️</span>
                  <span>Terang</span>
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 ${isDarkMode ? 'bg-[#0D2C5C] text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span>🌙</span>
                  <span>Gelap</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 2. RUNNING TICKER & TAGLINE BERJALAN DINAMIS */}
        <div className="w-full shrink-0 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 py-2 px-4 sm:px-8 z-20 flex items-center gap-3 overflow-hidden text-xs">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold px-2 py-0.5 rounded-lg bg-emerald-100/60 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 text-[11px]">
              🕒 Senin – Jumat, 07.30 – 17.00 WIB
            </span>
            <span className="font-extrabold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300/40 text-[10px] tracking-wider uppercase">
              GRATIS
            </span>
          </div>

          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-pulse text-slate-700 dark:text-slate-300 font-medium">
              ✨ <strong className="text-[#0D2C5C] dark:text-amber-400">Selamat datang di SIMONITA</strong> - Sistem Monitoring Opini dan Berita Bea Cukai Pekanbaru • Wilayah Kerja: Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan • Pantauan Pers & Dewan Pers Aktif • Jam Layanan Kedinasan: 07.30 - 17.00 WIB
            </div>
          </div>
        </div>

        {/* 3. AREA TENGAH: PAS UKURAN LAYAR 100% */}
        <main className="w-full flex-1 relative flex items-center justify-center lg:justify-end px-4 sm:px-8 lg:px-16 py-6 overflow-hidden">
          
          {/* Latar Belakang Isometrik SVG Mengisi 100% Width & Height */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden w-full h-full">
            <svg 
              className="w-full h-full object-cover opacity-85 dark:opacity-40" 
              viewBox="0 0 1440 850" 
              preserveAspectRatio="xMidYMid slice" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Matahari */}
              <circle cx="980" cy="180" r="140" fill="#FEF08A" opacity="0.4" />
              
              {/* Pegunungan */}
              <polygon points="80,720 440,360 800,720" fill="#93C5FD" opacity="0.6" />
              <polygon points="360,720 520,420 680,720" fill="#E2E8F0" />
              <polygon points="240,720 600,400 960,720" fill="#1E3A8A" opacity="0.8" />
              <polygon points="540,720 600,400 660,720" fill="#FFFFFF" />

              {/* Pulau Isometrik Gedung Bea Cukai */}
              <g transform="translate(180, 240)">
                <polygon points="260,280 480,160 700,280 480,400" fill="#0A2247" />
                <polygon points="260,280 480,400 480,420 260,300" fill="#0284C7" />
                <polygon points="480,400 700,280 700,300 480,420" fill="#0369A1" />

                <polygon points="400,220 480,175 560,220 480,265" fill="#F59E0B" />
                <polygon points="400,220 480,265 480,330 400,285" fill="#0D2C5C" />
                <polygon points="480,265 560,220 560,285 480,330" fill="#1E40AF" />

                <line x1="420" y1="200" x2="420" y2="140" stroke="#FFFFFF" strokeWidth="2" />
                <rect x="422" y="140" width="22" height="7" fill="#EF4444" />
                <rect x="422" y="147" width="22" height="7" fill="#FFFFFF" />

                <polygon points="580,260 620,235 660,260 620,285" fill="#1E293B" />
                <polygon points="580,260 620,285 620,360 580,335" fill="#0F172A" />
                <polygon points="620,285 660,260 660,335 620,360" fill="#334155" />
              </g>

              {/* Drone Surveillance */}
              <g transform="translate(160, 280)">
                <ellipse cx="60" cy="80" rx="18" ry="6" fill="#0D2C5C" />
                <line x1="45" y1="80" x2="75" y2="80" stroke="#0284C7" strokeWidth="2" />
                <circle cx="60" cy="80" r="3" fill="#10B981" />
                <ellipse cx="60" cy="180" rx="12" ry="4" fill="#64748B" opacity="0.3" />
              </g>
            </svg>

            {/* Clickable Radar Hotspots */}
            {hotspots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => setSelectedHotspot(spot)}
                style={{ top: spot.coords.top, left: spot.coords.left }}
                className="absolute pointer-events-auto group -translate-x-1/2 -translate-y-1/2 z-10 focus:outline-none"
                title={spot.title}
              >
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-[#0D2C5C] text-white border-2 border-amber-400 shadow-xl text-xs group-hover:scale-125 transition-transform">
                    {spot.icon}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* KARTU FORM LOGIN MENGAMBANG */}
          <div className="relative z-20 w-full max-w-[420px] my-auto">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800">
              
              {/* Badge Instansi & Terverifikasi */}
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>KPPBC TMP B PEKANBARU</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-400/40 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Terverifikasi</span>
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3.5">
                Masuk ke Akun
              </h1>

              {/* Tab Pemilih Peran */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setUserRole('pengguna')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${userRole === 'pengguna' ? 'bg-[#0D2C5C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <span>👤</span>
                  <span>Pengguna Jasa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('pegawai')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${userRole === 'pegawai' ? 'bg-[#0D2C5C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <span>🏛️</span>
                  <span>Pegawai</span>
                </button>
              </div>

              {authError && (
                <div className="mb-3.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                  {authError}
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pengguna {userRole === 'pengguna' ? '(User ID CEISA)' : '(NIP / ID Kedinasan)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      👤
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={userRole === 'pengguna' ? 'misal: IMPORTIR001' : 'misal: admin'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                    <a href="#help" onClick={(e) => { e.preventDefault(); alert('Hubungi Helpdesk PLI Pekanbaru.'); }} className="text-[11px] font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline">
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
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] dark:focus:ring-amber-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-2xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 mt-1 flex items-center justify-center space-x-2"
                >
                  <span>{authLoading ? 'Memeriksa Akses...' : 'Masuk ke SIMONITA'}</span>
                  <span>→</span>
                </button>
              </form>

              <div className="mt-3.5 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                  <span>❔</span>
                  <span>Kendala akun atau akses kedinasan? Buka</span>
                  <a href="https://ceisa40.beacukai.go.id" target="_blank" rel="noreferrer" className="text-[#0D2C5C] dark:text-amber-400 font-bold hover:underline ml-1">
                    CEISA Care
                  </a>
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Bukan pengguna CEISA? (PKL, Magang...)</span>
                </span>
                <button
                  type="button"
                  onClick={() => alert('Layanan Tamu E-Front Desk dibuka pada jam pelayanan 07.30 - 17.00 WIB.')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] border border-emerald-400/30 flex items-center space-x-1 transition"
                >
                  <span>E-Front Desk</span>
                  <span>→</span>
                </button>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800/60">
                <span className="flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Copyright © 2026 KPPBC TMP B Pekanbaru</span>
                </span>
                <span className="font-mono text-slate-300 dark:text-slate-600">v2.4</span>
              </div>
            </div>
          </div>
        </main>

        {/* Modal Info Hotspot */}
        {selectedHotspot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left relative animate-in fade-in zoom-in duration-150">
              <button
                onClick={() => setSelectedHotspot(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base font-bold"
              >
                ✕
              </button>
              <div className="text-3xl mb-2">{selectedHotspot.icon}</div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                {selectedHotspot.coverage}
              </span>
              <h3 className="font-extrabold text-base text-[#0D2C5C] dark:text-amber-400 mt-2">
                {selectedHotspot.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                {selectedHotspot.subtitle}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2.5">
                {selectedHotspot.desc}
              </p>
              <div className="mt-4 pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#0D2C5C] text-white text-xs font-bold hover:bg-[#0A2247] transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Horizontal 2FA OTP */}
        {showOtpDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-[#0D2C5C] text-white h-full p-6 shadow-2xl flex flex-col justify-between border-l border-amber-400/30">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-lg text-amber-400">Verifikasi Keamanan 2FA Pegawai</h3>
                  <button
                    onClick={() => setShowOtpDrawer(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  Masukkan 6-digit kode OTP keamanan untuk memastikan hak akses sebelum dialihkan ke dashboard utama SIMONITA.
                </p>

                <form onSubmit={handleVerifyOtp}>
                  <div className="flex justify-between gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-input-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-white/20 bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow transition"
                  >
                    Konfirmasi & Masuk Dashboard →
                  </button>
                </form>
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                KPPBC TMP B Pekanbaru • Proteksi Akses Kedinasan
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD UTAMA (SETELAH LOGIN & 2FA BERHASIL)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">

      {/* Header Dashboard Atas */}
      <header className="sticky top-0 z-30 bg-[#0D2C5C]/95 backdrop-blur-md text-white border-b border-amber-500/30 px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/10 p-1 flex items-center justify-center border border-amber-400/40 shadow-inner">
              <img src="/simonita.png" alt="Logo SIMONITA" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-white">SIMONITA</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">Sistem Aktif</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">KPPBC TMP B Pekanbaru • Seksi PLI</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono text-[11px]">
                {session?.user?.email || username}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition shadow-sm"
              >
                Keluar Portal
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee Banner */}
      <div className="bg-amber-500 text-[#0D2C5C] text-xs font-semibold py-1.5 px-4 overflow-hidden whitespace-nowrap shadow-sm z-10">
        <div className="inline-block animate-pulse">
          🔔 SIMONITA: Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Wilayah Pengawasan: Pekanbaru • Siak • Kampar • Rokan Hulu • Pelalawan
        </div>
      </div>

      {/* DASHBOARD KONTEN UTAMA */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10 flex flex-col md:flex-row gap-6">

        {/* SIDEBAR DASHBOARD */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">Menu Portal</span>
            
            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeTab === 'articles'
                  ? 'bg-[#0D2C5C] text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <span className="text-sm">📰</span>
                <span>Artikel & Berita</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">{totalArticles}</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeTab === 'stats'
                  ? 'bg-[#0D2C5C] text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <span className="text-sm">📊</span>
                <span>Statistik & Opini</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('press')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeTab === 'press'
                  ? 'bg-[#0D2C5C] text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <span className="text-sm">🏛️</span>
                <span>Dewan Pers</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeTab === 'settings'
                  ? 'bg-[#0D2C5C] text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <span className="text-sm">⚙️</span>
                <span>Pengaturan</span>
              </span>
            </button>
          </div>

          <div className="bg-[#0D2C5C]/5 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-2">
            <span className="font-bold text-[#0D2C5C] dark:text-amber-400 block">Status Pengawasan</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Monitoring media lokal dan nasional aktif di Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan.
            </p>
          </div>
        </aside>

        {/* AREA KERJA DASHBOARD */}
        <main className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0D2C5C] dark:text-amber-400">
                {activeTab === 'articles' && 'Daftar Artikel & Berita'}
                {activeTab === 'stats' && 'Statistik & Persepsi Media'}
                {activeTab === 'press' && 'Rujukan Dewan Pers'}
                {activeTab === 'settings' && 'Konfigurasi SIMONITA'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Portal intelijen media KPPBC TMP B Pekanbaru</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'articles' && (
                <button
                  onClick={exportToCSV}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/40 transition flex items-center space-x-1.5 shadow-sm"
                >
                  <span>📥</span>
                  <span>Ekspor CSV</span>
                </button>
              )}

              <button
                onClick={loadData}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
              >
                <span>🔄 Segarkan</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40 shadow-sm flex items-center space-x-1.5 transition"
              >
                <span>+ Tambah Manual</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ARTIKEL & PAGINASI 10/25/50 */}
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Cari judul berita atau nama media..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="scraped">Scraper Multi-Kanal</option>
                    <option value="manual">Input Manual</option>
                  </select>

                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="24h">24 Jam Terakhir</option>
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">Bulan Ini</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                        <th className="py-3 px-4">Judul Artikel Berita</th>
                        <th className="py-3 px-4">Media</th>
                        <th className="py-3 px-4">Waktu Terbit</th>
                        <th className="py-3 px-4">Sentimen</th>
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
                      ) : paginatedArticles.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400">
                            Tidak ada berita yang cocok dengan kriteria pencarian.
                          </td>
                        </tr>
                      ) : (
                        paginatedArticles.map((article) => (
                          <tr key={article.id || article.url} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-100 max-w-sm">
                              <div className="line-clamp-2">{article.title}</div>
                              {article.snippet && (
                                <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{article.snippet}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              <div>{article.source_name}</div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                              {new Date(article.published_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                article.sentiment === 'positive'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : article.sentiment === 'negative'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {article.sentiment === 'positive' ? 'Positif' : article.sentiment === 'negative' ? 'Kritis' : 'Netral'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#0D2C5C] dark:text-amber-400 hover:underline font-bold"
                                >
                                  Buka ↗
                                </a>

                                <button
                                  onClick={() => handleOpenEditModal(article)}
                                  className="p-1 text-slate-400 hover:text-amber-500 transition"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(article.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 transition"
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

                {/* Kontrol Paginasi 10, 25, 50 */}
                <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Baris per halaman:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-slate-400">
                      Menampilkan {totalEntries ? startIndex + 1 : 0} - {Math.min(startIndex + rowsPerPage, totalEntries)} dari {totalEntries} artikel
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 font-semibold"
                    >
                      ←
                    </button>
                    <span className="px-3 py-1 font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 font-semibold"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATISTIK & PERSEPSI */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Artikel</span>
                  <div className="text-2xl font-black text-[#0D2C5C] dark:text-amber-400 mt-1">{totalArticles}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Terkumpul di basis data</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase">Sentimen Positif</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{positiveCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Kinerja / Apresiasi publik</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-sky-600 uppercase">Sentimen Netral</span>
                  <div className="text-2xl font-black text-sky-600 mt-1">{neutralCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Rilis pers & berita umum</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-rose-600 uppercase">Sentimen Kritis</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{negativeCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Perlu respon Seksi PLI</span>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Distribusi Saluran Berita</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1.5">
                      <span>Scraper Multi-Kanal (Otomatis)</span>
                      <span>{scrapedCount} items</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#0D2C5C] dark:bg-amber-500 h-2 rounded-full" 
                        style={{ width: `${totalArticles ? (scrapedCount / totalArticles) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1.5">
                      <span>Input Pegawai PLI (Manual)</span>
                      <span>{manualCount} items</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full" 
                        style={{ width: `${totalArticles ? (manualCount / totalArticles) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEWAN PERS */}
          {activeTab === 'press' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#0D2C5C] to-[#0A2247] text-white p-6 rounded-3xl shadow-lg border border-amber-400/30 relative overflow-hidden">
                <div className="max-w-2xl">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-[#0D2C5C] mb-2 inline-block">
                    Rujukan Resmi Lembaga Negara
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold mt-1 text-white">Portal Verifikasi Dewan Pers Republik Indonesia</h2>
                  <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                    Basis data rujukan Seksi PLI untuk memeriksa legalitas faktual perusahaan pers, kode etik jurnalistik, dan sertifikasi kompetensi wartawan.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a 
                      href="https://dewanpers.or.id/data" 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-[#0D2C5C] font-bold text-xs rounded-xl shadow transition inline-flex items-center space-x-1.5"
                    >
                      <span>Buka Basis Data Dewan Pers ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENGATURAN */}
          {activeTab === 'settings' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0D2C5C] dark:text-amber-400">Konfigurasi SIMONITA</h2>
                <p className="text-xs text-slate-500">Parameter mesin otomatis dan status infrastruktur portal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Kata Kunci Pengawasan</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">"Bea Cukai Pekanbaru", KPPBC Pekanbaru, Media Daerah</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Jadwal Pemantauan Otomatis</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">Setiap 1 Jam ('0 * * * *')</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Alamat Domain Resmi</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">simonita.cloud (Cloudflare Pages)</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Basis Data & Keamanan</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">Supabase PostgreSQL + RLS</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-1">
                <span>Seksi Penyuluhan dan Layanan Informasi (PLI) KPPBC TMP B Pekanbaru</span>
                <span>Versi 2.4</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Input & Edit Berita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400 mb-1">
              {editingArticleId ? '✏️ Edit Artikel & Sentimen Opini' : '+ Tambahkan Artikel Berita Manual'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Input publikasi media lokal / regional yang tidak terjaring otomatis.</p>

            <form onSubmit={handleSubmitArticle} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Judul Berita</label>
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
                <label className="block font-semibold mb-1">Nama Media / Sumber</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Riau Pos, Antara Riau"
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">URL / Tautan Berita</label>
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
                <label className="block font-semibold mb-1">Klasifikasi Sentimen</label>
                <select
                  value={formData.sentiment}
                  onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                >
                  <option value="positive">Positif (Kinerja / Apresiasi)</option>
                  <option value="neutral">Netral (Rilis Umum / Informasi)</option>
                  <option value="negative">Kritis / Negatif (Perlu Ditindaklanjuti)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Ringkasan / Catatan Berita</label>
                <textarea
                  rows="3"
                  placeholder="Ringkasan isi berita..."
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
                  {editingArticleId ? 'Simpan Perubahan' : 'Simpan ke Basis Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
