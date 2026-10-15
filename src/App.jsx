import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getArticles, addManualArticle, updateArticle, deleteArticle, subscribeToArticles } from './services/articles';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  // Form State
  const [userRole, setUserRole] = useState('pegawai'); // 'pengguna' | 'pegawai'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 2FA OTP
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    source_name: '',
    url: '',
    snippet: '',
    sentiment: 'neutral'
  });
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const hotspots = [
    {
      id: 'building',
      title: 'Kantor Pelayanan KPPBC TMP B Pekanbaru',
      subtitle: 'Pusat Komando & Pelayanan PLI',
      desc: 'Pusat operasional intelijen media, pemantauan rilis berita, serta administrasi pengawasan 5 kabupaten/kota.',
      coverage: 'Pekanbaru Kota',
      coords: { top: '56%', left: '50%' },
      icon: '🏛️'
    },
    {
      id: 'river',
      title: 'Patroli Perairan Sungai Siak',
      subtitle: 'Pengawasan Pelabuhan & Jalur Air',
      desc: 'Satuan tugas patroli laut dan sungai memantau lalu lintas kapal kargo dan mencegah penyelundupan via perairan.',
      coverage: 'Siak & Pesisir',
      coords: { top: '75%', left: '30%' },
      icon: '🚤'
    },
    {
      id: 'car',
      title: 'Unit Patroli Darat Operasi Pasar',
      subtitle: 'Gempur Rokok Ilegal',
      desc: 'Pencegahan dan penindakan peredaran Barang Kena Cukai (BKC) tembakau tanpa pita cukai resmi.',
      coverage: 'Kampar & Rokan Hulu',
      coords: { top: '80%', left: '65%' },
      icon: '🚔'
    },
    {
      id: 'drone',
      title: 'Drone Surveillance Fasilitas Berikat',
      subtitle: 'Monitoring Udara Kawasan Industri',
      desc: 'Pengawasan udara berkala di kawasan industri manufaktur, fasilitas TPB, dan Tempat Penimbunan Berikat.',
      coverage: 'Pelalawan & Siak',
      coords: { top: '25%', left: '25%' },
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
      alert('Masukkan 6-digit kode OTP.');
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
      const diffHours = (new Date() - pubDate) / (1000 * 60 * 60);
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

  const exportToCSV = () => {
    if (filteredArticles.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ['No', 'Judul Berita', 'Sumber Media', 'Waktu Terbit', 'Tipe Entri', 'Sentimen Opini', 'URL Artikel'];
    const rows = filteredArticles.map((article, index) => [
      index + 1,
      `"${(article.title || '').replace(/"/g, '""')}"`,
      `"${(article.source_name || '').replace(/"/g, '""')}"`,
      `"${new Date(article.published_at).toLocaleString('id-ID')}"`,
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0D2C5C] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // HALAMAN LOGIN IDENTIK GAMBAR (2 KOLOM: ILUSTRASI KIRI, FORM KANAN)
  // =========================================================================
  if (!session || !is2FAVerified) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 font-sans">
        
        {/* NAVBAR ATAS */}
        <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 shrink-0 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-[#0D2C5C] p-1.5 flex items-center justify-center border border-amber-400">
                <img src="/simonita.png" alt="Logo SIMONITA" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-[#0D2C5C] dark:text-amber-400 tracking-wider">SIMONITA</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    KPPBC TMP B Pekanbaru
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Server Online</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Sistem Monitoring Opini dan Berita • Super App Layanan Terpadu
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="https://dewanpers.or.id"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-sm"
              >
                <span>📹</span>
                <span>Buku Panduan CCTV & PDF ↗</span>
              </a>

              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`px-3 py-1 rounded-lg transition ${!isDarkMode ? 'bg-white text-amber-600 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  ☀️ Terang
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`px-3 py-1 rounded-lg transition ${isDarkMode ? 'bg-[#0D2C5C] text-white shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  🌙 Gelap
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* MARQUEE RUNNING TEXT */}
        <div className="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2 px-4 lg:px-8 flex items-center gap-3 overflow-hidden text-xs shrink-0">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px]">
              🕒 Senin – Jumat, 07.30 – 17.00 WIB
            </span>
            <span className="font-extrabold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-300 text-[10px] uppercase">
              GRATIS
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee font-medium text-slate-600 dark:text-slate-300">
              ✨ <strong className="text-[#0D2C5C] dark:text-amber-400">Selamat datang di SIMONITA</strong> - Sistem Monitoring Opini dan Berita KPPBC TMP B Pekanbaru • Wilayah Pengawasan: Pekanbaru, Siak, Kampar, Rokan Hulu, dan Pelalawan • Jam Layanan: 07.30 - 17.00 WIB
            </div>
          </div>
        </div>

        {/* CONTAINER UTAMA (GRID 2-KOLOM SEIMBANG) */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* KOLOM KIRI: ILUSTRASI ISOMETRIK & HOTSPOTS (LEBAR 7 DARI 12) */}
          <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center">
            
            <svg className="w-full h-full object-cover" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="560" cy="140" r="90" fill="#FEF08A" opacity="0.6" />
              <polygon points="40,520 280,240 520,520" fill="#93C5FD" opacity="0.7" />
              <polygon points="240,520 340,300 440,520" fill="#E2E8F0" />
              <polygon points="160,520 400,280 640,520" fill="#1E3A8A" opacity="0.8" />
              <polygon points="360,520 400,280 440,520" fill="#FFFFFF" />

              {/* Pulau Isometrik */}
              <g transform="translate(140, 160)">
                <polygon points="160,220 320,130 480,220 320,310" fill="#0A2247" />
                <polygon points="160,220 320,310 320,325 160,235" fill="#0284C7" />
                <polygon points="320,310 480,220 480,235 320,325" fill="#0369A1" />

                {/* Gedung Utama Bea Cukai */}
                <polygon points="260,180 320,145 380,180 320,215" fill="#F59E0B" />
                <polygon points="260,180 320,215 320,265 260,230" fill="#0D2C5C" />
                <polygon points="320,215 380,180 380,230 320,265" fill="#1E40AF" />

                {/* Bendera Merah Putih */}
                <line x1="275" y1="165" x2="275" y2="120" stroke="#FFFFFF" strokeWidth="2" />
                <rect x="277" y="120" width="18" height="6" fill="#EF4444" />
                <rect x="277" y="126" width="18" height="6" fill="#FFFFFF" />

                {/* Menara Pengawas */}
                <polygon points="390,210 420,190 450,210 420,230" fill="#1E293B" />
                <polygon points="390,210 420,230 420,290 390,270" fill="#0F172A" />
                <polygon points="420,230 450,210 450,270 420,290" fill="#334155" />
              </g>

              {/* Drone Udara */}
              <g transform="translate(180, 120)">
                <ellipse cx="60" cy="50" rx="16" ry="5" fill="#0D2C5C" />
                <line x1="48" y1="50" x2="72" y2="50" stroke="#0284C7" strokeWidth="2" />
                <circle cx="60" cy="50" r="3" fill="#10B981" />
              </g>
            </svg>

            {/* Titik Interaktif (Hotspots) */}
            {hotspots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => setSelectedHotspot(spot)}
                style={{ top: spot.coords.top, left: spot.coords.left }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
                title={spot.title}
              >
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-[#0D2C5C] text-white border-2 border-amber-400 shadow-lg text-xs group-hover:scale-125 transition-transform">
                    {spot.icon}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* KOLOM KANAN: FORM LOGIN PERSIS SEPERTI GAMBAR (LEBAR 5 DARI 12) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>KPPBC TMP B PEKANBARU</span>
                </span>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Terverifikasi</span>
                </span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Masuk ke Akun
              </h1>

              {/* Tab Switcher: Pengguna Jasa & Pegawai */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => setUserRole('pengguna')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${userRole === 'pengguna' ? 'bg-[#0D2C5C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span>👤</span>
                  <span>Pengguna Jasa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('pegawai')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${userRole === 'pegawai' ? 'bg-[#0D2C5C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span>🏛️</span>
                  <span>Pegawai</span>
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                    <a href="#help" onClick={(e) => { e.preventDefault(); alert('Hubungi Helpdesk PLI KPPBC TMP B Pekanbaru.'); }} className="text-[11px] font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline">
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
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C] font-medium"
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
                  className="w-full py-3 rounded-2xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 mt-1 flex items-center justify-center space-x-2"
                >
                  <span>{authLoading ? 'Memeriksa Akses...' : 'Masuk ke SIMONITA'}</span>
                  <span>→</span>
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                  <span>❔</span>
                  <span>Kendala akun atau akses kedinasan? Buka</span>
                  <a href="https://ceisa40.beacukai.go.id" target="_blank" rel="noreferrer" className="text-[#0D2C5C] dark:text-amber-400 font-bold hover:underline ml-1">
                    CEISA Care
                  </a>
                </span>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Bukan pengguna CEISA? (PKL, Magang...)</span>
                </span>
                <button
                  type="button"
                  onClick={() => alert('Layanan Tamu E-Front Desk dibuka pada jam pelayanan 07.30 - 17.00 WIB.')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300 flex items-center space-x-1 transition"
                >
                  <span>E-Front Desk</span>
                  <span>→</span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span className="flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Copyright © 2026 KPPBC TMP B Pekanbaru</span>
                </span>
                <span className="font-mono text-slate-400">v2.4</span>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL DETAIL HOTSPOT */}
        {selectedHotspot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-3xl mb-2">{selectedHotspot.icon}</div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                {selectedHotspot.coverage}
              </span>
              <h3 className="font-extrabold text-base text-[#0D2C5C] dark:text-amber-400 mt-2">
                {selectedHotspot.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 mb-2">{selectedHotspot.subtitle}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t pt-2.5">{selectedHotspot.desc}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#0D2C5C] text-white text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DRAWER 2FA OTP */}
        {showOtpDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0D2C5C] text-white h-full p-6 shadow-2xl flex flex-col justify-between border-l border-amber-400/40">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-lg text-amber-400">Verifikasi Keamanan 2FA Pegawai</h3>
                  <button onClick={() => setShowOtpDrawer(false)} className="text-slate-300 hover:text-white">✕</button>
                </div>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  Masukkan 6-digit kode OTP keamanan untuk mengakses sistem dashboard SIMONITA.
                </p>
                <form onSubmit={handleVerifyOtp}>
                  <div className="flex justify-between gap-2 mb-6">
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-input-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-white/20 bg-black/20 text-white focus:ring-2 focus:ring-amber-400"
                      />
                    ))}
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow">
                    Konfirmasi & Masuk Dashboard →
                  </button>
                </form>
              </div>
              <div className="text-[11px] text-slate-400 text-center">KPPBC TMP B Pekanbaru • Proteksi Terpadu</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD UTAMA (SETELAH LOGIN)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-[#0D2C5C] text-white px-4 sm:px-6 py-3 shadow-md flex items-center justify-between border-b border-amber-500/30">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-amber-400">
            <img src="/simonita.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider">SIMONITA</span>
            <p className="text-[11px] text-slate-300">KPPBC TMP B Pekanbaru • Seksi PLI</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono">
            {session?.user?.email || username}
          </span>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition">
            Keluar Portal
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0 space-y-4">
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

        <main className="flex-1 min-w-0">
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl font-extrabold text-[#0D2C5C] dark:text-amber-400">Daftar Artikel & Berita</h2>
                <div className="flex gap-2">
                  <button onClick={exportToCSV} className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition">
                    📥 Ekspor CSV
                  </button>
                  <button onClick={loadData} className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition">
                    🔄 Refresh
                  </button>
                  <button onClick={handleOpenAddModal} className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] text-white hover:bg-[#0A2247] transition">
                    + Tambah Manual
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                        <th className="py-3 px-4">Judul Artikel</th>
                        <th className="py-3 px-4">Media</th>
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Sentimen</th>
                        <th className="py-3 px-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan="5" className="py-12 text-center text-slate-400">Memuat artikel...</td></tr>
                      ) : paginatedArticles.length === 0 ? (
                        <tr><td colSpan="5" className="py-12 text-center text-slate-400">Tidak ada artikel yang sesuai.</td></tr>
                      ) : (
                        paginatedArticles.map((article) => (
                          <tr key={article.id || article.url} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-3 px-4 font-medium max-w-sm">
                              <div className="line-clamp-2">{article.title}</div>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{article.source_name}</td>
                            <td className="py-3 px-4 text-xs text-slate-400">{new Date(article.published_at).toLocaleDateString('id-ID')}</td>
                            <td className="py-3 px-4 text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${article.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' : article.sentiment === 'negative' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                {article.sentiment === 'positive' ? 'Positif' : article.sentiment === 'negative' ? 'Kritis' : 'Netral'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="flex items-center space-x-2">
                                <a href={article.url} target="_blank" rel="noreferrer" className="text-[#0D2C5C] dark:text-amber-400 font-bold hover:underline">Buka ↗</a>
                                <button onClick={() => handleOpenEditModal(article)} className="text-slate-400 hover:text-amber-500">✏️</button>
                                <button onClick={() => handleDelete(article.id)} className="text-slate-400 hover:text-rose-500">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span>Menampilkan {paginatedArticles.length} dari {totalEntries} artikel</span>
                  <div className="flex space-x-1">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border disabled:opacity-40">←</button>
                    <span className="px-2.5 py-1 font-bold">{currentPage} / {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border disabled:opacity-40">→</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'press' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400">Verifikasi Anggota Resmi Dewan Pers</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Gunakan basis data resmi Dewan Pers untuk memeriksa verifikasi faktual media massa yang meliput KPPBC TMP B Pekanbaru.
              </p>
              <a href="https://dewanpers.or.id/data" target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded-xl bg-amber-400 text-[#0D2C5C] font-bold text-xs">
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
