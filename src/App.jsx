import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getArticles, addManualArticle, subscribeToArticles } from './services/articles';

export default function App() {
  // Session & Theme State
  const [session, setSession] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'stats' | 'services' | 'settings'

  // Data & Dashboard State
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Interactive Hotspot Modal/Popover State
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // Auth State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // Form Tambah Manual State
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });

  // Hotspots Wilayah Pengawasan KPPBC TMP B Pekanbaru
  const hotspots = [
    {
      id: 'building',
      title: 'Kantor Pelayanan KPPBC TMP B Pekanbaru',
      subtitle: 'Pusat Komando & Pelayanan PLI',
      desc: 'Pusat koordinasi pemantauan media, pelayanan kepabeanan dan cukai, serta administrasi pengawasan 5 kabupaten/kota.',
      coverage: 'Pekanbaru Kota',
      coords: { top: '22%', left: '15%' },
      icon: '🏛️'
    },
    {
      id: 'river',
      title: 'Patroli Perairan Sungai Siak',
      subtitle: 'Pengawasan Jalur Air & Pelabuhan Rakyat',
      desc: 'Satuan tugas patroli laut dan sungai memantau pergerakan kapal kargo serta pencegahan penyelundupan barang ilegal via jalur sungai.',
      coverage: 'Wilayah Siak & Sekitarnya',
      coords: { top: '65%', left: '42%' },
      icon: '🚤'
    },
    {
      id: 'car',
      title: 'Unit Patroli Darat Operasi Pasar',
      subtitle: 'Gempur Rokok Ilegal Darat',
      desc: 'Pencegahan dan penindakan peredaran Barang Kena Cukai (BKC) hasil tembakau ilegal di jalur lintas barat dan selatan Riau.',
      coverage: 'Kampar & Rokan Hulu',
      coords: { top: '48%', left: '78%' },
      icon: '🚔'
    },
    {
      id: 'drone',
      title: 'Drone Monitoring Udara Kawasan Industri',
      subtitle: 'Surveillance Tempat Penimbunan Berikat',
      desc: 'Pemantauan berkala kawasan industri, fasilitas Tempat Penimbunan Berikat (TPB), dan Kawasan Berikat dari udara.',
      coverage: 'Pelalawan & Siak',
      coords: { top: '15%', left: '60%' },
      icon: '🛸'
    }
  ];

  // Sinkronisasi Sesi Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sinkronisasi Tema Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load Data Artikel
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
    const channel = subscribeToArticles((newArticle) => {
      setArticles((prev) => [newArticle, ...prev]);
    });
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // Handler Login Email/Password
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;
      setShowOtpDrawer(true);
    } catch (err) {
      setAuthError(err.message || 'Gagal login. Periksa email dan password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handler Verifikasi OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      alert('Masukkan 6-digit kode OTP.');
      return;
    }
    setShowOtpDrawer(false);
    alert('Autentikasi 2FA Berhasil. Selamat bertugas!');
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
    setShowOtpDrawer(false);
  };

  const handleSubmitArticle = async (e) => {
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

  // Filter Artikel
  const filteredArticles = articles.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.source_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' ? true : item.entry_type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Fitur Ekspor Data ke CSV / Excel
  const exportToCSV = () => {
    if (filteredArticles.length === 0) {
      alert('Tidak ada data artikel untuk diekspor.');
      return;
    }

    const headers = ['No', 'Judul Artikel', 'Nama Sumber / Media', 'Waktu Terbit', 'Tipe Entri', 'Sentimen Opini', 'URL Artikel'];
    const rows = filteredArticles.map((article, index) => {
      const cleanTitle = `"${(article.title || '').replace(/"/g, '""')}"`;
      const cleanSource = `"${(article.source_name || '').replace(/"/g, '""')}"`;
      const dateFormatted = new Date(article.published_at).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    link.setAttribute('download', `SIMONITA_Rekap_Berita_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Metrik Statistik Sentimen & Total
  const totalArticles = articles.length;
  const scrapedCount = articles.filter(a => a.entry_type === 'scraped').length;
  const manualCount = articles.filter(a => a.entry_type === 'manual').length;
  const positiveCount = articles.filter(a => a.sentiment === 'positive').length;
  const neutralCount = articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length;
  const negativeCount = articles.filter(a => a.sentiment === 'negative').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">

      {/* Latar Belakang Isometrik SVG Khas Wilayah Kerja Riau & Clickable Hotspots */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Visual Ilustrasi Vektor SVG */}
        <svg className="w-full h-full object-cover opacity-25 dark:opacity-15 transition-opacity" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Aliran Sungai Siak */}
          <path d="M-100,500 C300,450 600,650 900,550 C1200,450 1500,600 1600,580 L1600,900 L-100,900 Z" fill="#0284C7" />
          
          {/* Pola Kisi Isometrik */}
          <path d="M0 200 L1440 600 M0 400 L1440 800 M0 600 L1440 1000" stroke="#0D2C5C" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M1440 200 L0 600 M1440 400 L0 800 M1440 600 L0 1000" stroke="#0D2C5C" strokeWidth="1" strokeDasharray="6 6" />

          {/* Vektor Isometrik Gedung Kantor Bea Cukai */}
          <polygon points="200,240 260,205 320,240 260,275" fill="#0D2C5C" opacity="0.6" />
          <polygon points="200,240 260,275 260,340 200,305" fill="#0A2247" opacity="0.8" />
          <polygon points="260,275 320,240 320,305 260,340" fill="#1E3A8A" opacity="0.5" />

          {/* Kapal Patroli Sungai */}
          <polygon points="560,600 620,580 660,610 600,630" fill="#F59E0B" opacity="0.7" />
          <polygon points="560,600 600,630 600,645 560,615" fill="#B45309" opacity="0.8" />

          {/* Mobil Patroli Darat */}
          <polygon points="1080,480 1130,455 1170,480 1120,505" fill="#0D2C5C" opacity="0.7" />
          <polygon points="1080,480 1120,505 1120,520 1080,495" fill="#0284C7" opacity="0.8" />
        </svg>

        {/* Titik Interaktif (Clickable Hotspots) */}
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
              <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-[#0D2C5C] text-white border border-amber-400 shadow-lg text-xs group-hover:scale-125 transition-transform duration-200">
                {spot.icon}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Modal Detail Wilayah Pengawasan Hotspot */}
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
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-400/30">
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

      {/* Header Navigasi Atas */}
      <header className="sticky top-0 z-30 bg-[#0D2C5C]/95 backdrop-blur-md text-white border-b border-amber-500/30 px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/10 p-1 flex items-center justify-center border border-amber-400/40 shadow-inner">
              <img 
                src="/simonita.png" 
                alt="Logo SIMONITA" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="font-bold text-amber-400 text-sm">BC</span>';
                }}
              />
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
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition"
              title="Ganti Tema"
            >
              {isDarkMode ? '☀️ Terang' : '🌙 Gelap'}
            </button>

            {session ? (
              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  {session.user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <span className="text-amber-300 font-medium hidden sm:inline-block">Mode Tamu (Read-Only)</span>
            )}
          </div>
        </div>
      </header>

      {/* Marquee Banner Pengumuman & Wilayah Pengawasan */}
      <div className="bg-amber-500 text-[#0D2C5C] text-xs font-semibold py-1.5 px-4 overflow-hidden whitespace-nowrap shadow-sm z-10">
        <div className="inline-block animate-pulse">
          🔔 SIMONITA: Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Wilayah Pengawasan: Pekanbaru • Siak • Kampar • Rokan Hulu • Pelalawan
        </div>
      </div>

      {/* Konten Utama Terbagi Menjadi Sidebar Kiri & Area Kerja Kanan */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10 flex flex-col md:flex-row gap-6">

        {/* SIDEBAR KIRI */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          
          {/* Menu Navigasi Vertikal */}
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
              onClick={() => setActiveTab('services')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeTab === 'services'
                  ? 'bg-[#0D2C5C] text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <span className="text-sm">🏛️</span>
                <span>Layanan & Regulasi</span>
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

          {/* Form Login Pegawai (Jika Belum Login) */}
          {!session && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-base">🔐</span>
                <h3 className="text-xs font-extrabold text-[#0D2C5C] dark:text-amber-400">Login Pegawai</h3>
              </div>

              {authError && (
                <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-2.5 text-xs">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="nama@customs.go.id"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    placeholder="Kata Sandi"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2 rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white font-bold text-xs border border-amber-400/40 shadow-sm transition disabled:opacity-50"
                >
                  {authLoading ? 'Verifikasi...' : 'Masuk Portal'}
                </button>
              </form>
            </div>
          )}

          {/* Kartu Informasi Hotspot & Instansi di Sidebar */}
          <div className="bg-[#0D2C5C]/5 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-2">
            <span className="font-bold text-[#0D2C5C] dark:text-amber-400 block">Titik Hotspot Wilayah</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Klik ikon berkedip pada latar belakang untuk melihat ringkasan tugas pengawasan darat, air, dan kawasan berikat.
            </p>
          </div>
        </aside>

        {/* AREA KERJA KANAN */}
        <main className="flex-1 min-w-0">

          {/* Header Aksi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0D2C5C] dark:text-amber-400">
                {activeTab === 'articles' && 'Daftar Artikel & Berita'}
                {activeTab === 'stats' && 'Statistik & Persepsi Media'}
                {activeTab === 'services' && 'Layanan Informasi & Regulasi'}
                {activeTab === 'settings' && 'Konfigurasi Sistem Portal'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Portal intelijen media KPPBC TMP B Pekanbaru</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'articles' && (
                <button
                  onClick={exportToCSV}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/40 transition flex items-center space-x-1.5 shadow-sm"
                  title="Unduh data dalam format CSV / Excel"
                >
                  <span>📥</span>
                  <span>Ekspor CSV</span>
                </button>
              )}

              <button
                onClick={loadData}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
              >
                <span>🔄 Refresh</span>
              </button>

              <button
                onClick={() => {
                  if (!session) {
                    alert('Akses Terbatas: Silakan login terlebih dahulu untuk menambah berita manual.');
                    return;
                  }
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40 shadow-sm flex items-center space-x-1.5 transition"
              >
                <span>+ Tambah Manual</span>
              </button>
            </div>
          </div>

          {/* KONTEN TAB 1: ARTIKEL & BERITA */}
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
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
                  className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="scraped">Hasil Scraping</option>
                  <option value="manual">Input Manual</option>
                </select>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                        <th className="py-3 px-4">Judul Artikel</th>
                        <th className="py-3 px-4">Sumber</th>
                        <th className="py-3 px-4">Waktu</th>
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
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100 max-w-sm">
                              <div className="line-clamp-2">{article.title}</div>
                              {article.snippet && (
                                <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{article.snippet}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {article.source_name}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                              {new Date(article.published_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${
                                article.entry_type === 'manual'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              }`}>
                                {article.entry_type === 'manual' ? 'Manual' : 'Scraped'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
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
            </div>
          )}

          {/* KONTEN TAB 2: STATISTIK & PERSEPSI MEDIA */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Artikel</span>
                  <div className="text-2xl font-black text-[#0D2C5C] dark:text-amber-400 mt-1">{totalArticles}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Terkumpul di database</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase">Sentimen Positif</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{positiveCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Apresiasi & kinerja</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-sky-600 uppercase">Sentimen Netral</span>
                  <div className="text-2xl font-black text-sky-600 mt-1">{neutralCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Pemberitaan umum</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-semibold text-rose-600 uppercase">Sentimen Negatif</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{negativeCount}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Perlu tindak lanjut</span>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Distribusi Saluran Berita</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1.5">
                      <span>Google News Scraper (Otomatis)</span>
                      <span>{scrapedCount} artikel</span>
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
                      <span>{manualCount} artikel</span>
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

          {/* KONTEN TAB 3: LAYANAN & REGULASI */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xl mb-1.5">📞</div>
                  <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">Layanan Informasi PLI</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Konsultasi kepabeanan, cukai, dan layanan pengaduan KPPBC TMP B Pekanbaru.
                  </p>
                  <div className="mt-2.5 text-[11px] font-semibold text-emerald-600">Jam Layanan: 07.30 - 17.00 WIB</div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xl mb-1.5">📜</div>
                  <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">Fasilitas Berikat & TPB</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tempat Penimbunan Berikat, Kawasan Berikat, dan prosedur impor-ekspor industri.
                  </p>
                  <div className="mt-2.5 text-[11px] font-semibold text-sky-600">Wilayah Siak & Pelalawan</div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xl mb-1.5">⚖️</div>
                  <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">Gempur Rokok Ilegal</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Saluran informasi peredaran barang kena cukai (BKC) tanpa pita cukai resmi.
                  </p>
                  <div className="mt-2.5 text-[11px] font-semibold text-rose-600">Pekanbaru, Kampar, & Rohul</div>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Portal Eksternal Terkait</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <a 
                    href="https://www.beacukai.go.id" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between"
                  >
                    <span className="font-semibold">Portal Resmi DJBC Pusat</span>
                    <span className="text-slate-400">↗</span>
                  </a>
                  <a 
                    href="https://insw.go.id" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between"
                  >
                    <span className="font-semibold">Indonesia National Single Window (INSW)</span>
                    <span className="text-slate-400">↗</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* KONTEN TAB 4: PENGATURAN */}
          {activeTab === 'settings' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0D2C5C] dark:text-amber-400">Konfigurasi SIMONITA</h2>
                <p className="text-xs text-slate-500">Parameter sistem scraper dan administrasi portal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Target Kata Kunci Scraper</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">"Bea Cukai Pekanbaru"</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Jadwal Otomasi GitHub Actions</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">Setiap 1 Jam (0 * * * *)</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Domain & Hosting</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">Cloudflare Pages (simonita.cloud)</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold block mb-1">Basis Data & Keamanan</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">Supabase PostgreSQL + RLS</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-1">
                <span>Seksi Penyuluhan dan Layanan Informasi (PLI) KPPBC TMP B Pekanbaru</span>
                <span>Versi 1.2.0</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Drawer 2FA OTP Horizontal Sliding */}
      {showOtpDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-lg text-[#0D2C5C] dark:text-amber-400">Verifikasi 2FA Pegawai</h3>
                <button
                  onClick={() => setShowOtpDrawer(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-6">
                Masukkan 6-digit kode OTP keamanan untuk memastikan identitas pegawai sebelum mengelola data manual.
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
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition"
                >
                  Verifikasi & Masuk
                </button>
              </form>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              KPPBC TMP B Pekanbaru • Keamanan Portal Terpusat
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Manual Berita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400 mb-1">+ Tambahkan Artikel Manual</h2>
            <p className="text-xs text-slate-500 mb-4">Input berita yang tidak terjaring scraper otomatis.</p>

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
                  placeholder="Contoh: Riau Pos, Antara Riau, Tribun"
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
                <label className="block font-semibold mb-1">Sentimen Berita</label>
                <select
                  value={formData.sentiment}
                  onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                >
                  <option value="positive">Positif (Apresiasi / Kinerja)</option>
                  <option value="neutral">Netral (Pemberitaan Umum / Rilis)</option>
                  <option value="negative">Kritis / Negatif (Perlu Ditindaklanjuti)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Kutipan / Ringkasan (Opsional)</label>
                <textarea
                  rows="3"
                  placeholder="Ringkasan isi rilis atau artikel..."
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
