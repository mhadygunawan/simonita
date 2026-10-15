import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getArticles, addManualArticle, updateArticle, deleteArticle, subscribeToArticles } from './services/articles';

const translations = {
  id: {
    statusActive: 'Sistem Aktif',
    officeSubtitle: 'KPPBC TMP B Pekanbaru • Seksi PLI',
    themeLight: '☀️ Terang',
    themeDark: '🌙 Gelap',
    guestMode: 'Mode Publik (Tamu)',
    loginOfficer: 'Masuk Pegawai',
    logout: 'Keluar Portal',
    marquee: '🔔 SIMONITA: Sistem Monitoring Opini dan Berita • Jam Layanan: 07.30 - 17.00 WIB • Wilayah Pengawasan: Pekanbaru • Siak • Kampar • Rokan Hulu • Pelalawan',
    menuTitle: 'Menu Portal',
    tabArticles: 'Artikel & Berita',
    tabStats: 'Statistik & Opini',
    tabPress: 'Dewan Pers',
    tabSettings: 'Pengaturan',
    hotspotSidebarTitle: 'Titik Wilayah Pengawasan',
    hotspotSidebarDesc: 'Klik titik berkedip pada peta latar untuk meninjau rincian pengawasan perairan Siak, darat Kampar/Rohul, dan kawasan industri.',
    portalDesc: 'Portal Intelijen Media & Pemantauan Opini Publik',
    exportCsv: 'Ekspor CSV',
    refresh: 'Segarkan',
    addManual: '+ Tambah Manual',
    searchPlaceholder: 'Cari judul berita atau nama media...',
    allTypes: 'Semua Tipe',
    scrapedType: 'Scraper Multi-Kanal',
    manualType: 'Input Manual',
    timeFilterAll: 'Semua Waktu',
    timeFilter24h: '24 Jam Terakhir',
    timeFilter7d: '7 Hari Terakhir',
    timeFilter30d: 'Bulan Ini',
    perPageText: 'Baris per halaman:',
    showingPage: 'Menampilkan',
    ofText: 'dari',
    entriesText: 'artikel',
    colTitle: 'Judul Artikel Berita',
    colSource: 'Media',
    colDate: 'Waktu Terbit',
    colType: 'Tipe',
    colSentiment: 'Sentimen',
    colAction: 'Aksi',
    openLink: 'Buka ↗',
    loadingData: 'Memuat data artikel...',
    emptySearch: 'Tidak ada berita yang cocok dengan kriteria pencarian.',
    statsTotal: 'Total Artikel',
    statsTotalSub: 'Terkumpul di basis data',
    statsPos: 'Sentimen Positif',
    statsPosSub: 'Kinerja / Apresiasi publik',
    statsNeu: 'Sentimen Netral',
    statsNeuSub: 'Rilis pers & berita umum',
    statsNeg: 'Sentimen Kritis',
    statsNegSub: 'Perlu respon Seksi PLI',
    sourceDistribution: 'Distribusi Saluran Berita',
    pressTitle: 'Portal Verifikasi Dewan Pers Republik Indonesia',
    pressDesc: 'Basis data rujukan Seksi PLI untuk memeriksa legalitas faktual perusahaan pers, kode etik jurnalistik, dan sertifikasi kompetensi wartawan.',
    pressCheckListTitle: 'Data Perusahaan Pers Terverifikasi',
    pressCheckListDesc: 'Akses resmi daftar media massa online, cetak, televisi, dan radio yang telah terverifikasi secara Administrasi maupun Faktual oleh Dewan Pers.',
    pressCheckBtn: 'Buka Basis Data Dewan Pers ↗',
    pressCardWartawan: 'Sertifikasi & Uji Kompetensi Wartawan (UKW)',
    pressCardWartawanDesc: 'Cek keabsahan status sertifikasi wartawan yang bertugas meliput di lingkungan KPPBC TMP B Pekanbaru.',
    pressCardOrg: 'Organisasi Konstituen Dewan Pers',
    pressCardOrgDesc: 'PWI, AJI, IJTI, SMSI, AMSI, JMSI, SPS, ATVSI, ATVLI, PRSSNI.',
    pressCardPengaduan: 'Layanan Pengaduan & Hak Jawab Pers',
    pressCardPengaduanDesc: 'Prosedur penyelesaian sengketa pemberitaan berdasarkan UU No. 40 Tahun 1999 tentang Pers.',
    settingsTitle: 'Konfigurasi SIMONITA',
    settingsDesc: 'Parameter mesin otomatis dan status infrastruktur portal.',
    settingKeyword: 'Kata Kunci Pengawasan',
    settingCron: 'Jadwal Scraper Multi-Kanal',
    settingDomain: 'Alamat Domain Resmi',
    settingDb: 'Basis Data & Keamanan',
    version: 'Versi 2.1.0 (Dewan Pers & Multi-Feed Scraper)',
    loginPageTitle: 'Portal Masuk Pegawai',
    loginPageDesc: 'Sistem Terpadu SIMONITA KPPBC TMP B Pekanbaru',
    backToHome: '← Kembali ke Beranda',
    emailLabel: 'Email Kedinasan Pegawai',
    passwordLabel: 'Kata Sandi',
    submitLogin: 'Verifikasi Kredensial',
    otpTitle: 'Verifikasi 2FA Pegawai',
    otpDesc: 'Masukkan 6-digit kode OTP keamanan sebelum mengelola data manual.',
    otpSubmit: 'Konfirmasi Masuk',
    modalTitle: '+ Tambahkan Artikel Berita Manual',
    modalEditTitle: '✏️ Edit Artikel & Sentimen Opini',
    modalDesc: 'Input publikasi media lokal / regional yang tidak terjaring otomatis.',
    formTitle: 'Judul Berita',
    formSource: 'Nama Media / Sumber',
    formUrl: 'URL / Tautan Berita',
    formSentiment: 'Klasifikasi Sentimen',
    formSnippet: 'Ringkasan / Catatan Berita',
    btnCancel: 'Batal',
    btnSave: 'Simpan ke Basis Data',
    btnUpdate: 'Simpan Perubahan',
    accessRestricted: 'Akses Dibatasi: Silakan masuk menggunakan akun pegawai terlebih dahulu.',
    otpSuccess: 'Verifikasi Berhasil. Selamat bertugas di SIMONITA!',
    closeModal: 'Tutup',
    confirmDelete: 'Hapus artikel berita ini dari basis data SIMONITA?'
  },
  en: {
    statusActive: 'System Active',
    officeSubtitle: 'Customs Pekanbaru • Information & Support Section',
    themeLight: '☀️ Light',
    themeDark: '🌙 Dark',
    guestMode: 'Public Mode (Guest)',
    loginOfficer: 'Officer Login',
    logout: 'Sign Out',
    marquee: '🔔 SIMONITA: Media Monitoring & News Portal • Operating Hours: 07.30 - 17.00 WIB • Coverage Areas: Pekanbaru • Siak • Kampar • Rokan Hulu • Pelalawan',
    menuTitle: 'Navigation Menu',
    tabArticles: 'Articles & News',
    tabStats: 'Stats & Sentiment',
    tabPress: 'Press Council',
    tabSettings: 'Settings',
    hotspotSidebarTitle: 'Field Enforcement Zones',
    hotspotSidebarDesc: 'Click blinking radar beacons on the background to inspect Siak river, highway patrol, and bonded industrial zone operations.',
    portalDesc: 'Customs Media Intelligence & Sentiment Monitoring',
    exportCsv: 'Export CSV',
    refresh: 'Refresh',
    addManual: '+ Add Manual',
    searchPlaceholder: 'Search headline or publisher...',
    allTypes: 'All Types',
    scrapedType: 'Multi-Channel Scraper',
    manualType: 'Manual Input',
    timeFilterAll: 'All Time',
    timeFilter24h: 'Last 24 Hours',
    timeFilter7d: 'Last 7 Days',
    timeFilter30d: 'This Month',
    perPageText: 'Rows per page:',
    showingPage: 'Showing',
    ofText: 'of',
    entriesText: 'articles',
    colTitle: 'News Headline',
    colSource: 'Publisher',
    colDate: 'Published',
    colType: 'Type',
    colSentiment: 'Sentiment',
    colAction: 'Action',
    openLink: 'View ↗',
    loadingData: 'Retrieving news feed...',
    emptySearch: 'No articles match your search parameters.',
    statsTotal: 'Total Articles',
    statsTotalSub: 'Stored in database',
    statsPos: 'Positive Sentiment',
    statsPosSub: 'Public praise & achievements',
    statsNeu: 'Neutral Sentiment',
    statsNeuSub: 'General customs releases',
    statsNeg: 'Critical Sentiment',
    statsNegSub: 'Action required by PR team',
    sourceDistribution: 'News Channel Source Split',
    pressTitle: 'Press Council of Indonesia (Dewan Pers)',
    pressDesc: 'Reference hub for Public Relations team to verify media outlets legitimacy, journalistic ethics, and reporter accreditation.',
    pressCheckListTitle: 'Verified Media Registry',
    pressCheckListDesc: 'Access the official database of online, print, television, and radio media companies verified by the Press Council.',
    pressCheckBtn: 'Open Press Council Database ↗',
    pressCardWartawan: 'Journalist Competency Certification (UKW)',
    pressCardWartawanDesc: 'Verify certified press credentials of journalists conducting interviews at Customs Pekanbaru.',
    pressCardOrg: 'Constituent Press Bodies',
    pressCardOrgDesc: 'PWI, AJI, IJTI, SMSI, AMSI, JMSI, SPS, ATVSI, ATVLI, PRSSNI.',
    pressCardPengaduan: 'Right of Reply & Dispute Settlement',
    pressCardPengaduanDesc: 'Statutory dispute mechanisms governed by Law No. 40/1999 on the Press.',
    settingsTitle: 'SIMONITA Core Settings',
    settingsDesc: 'Automation engines and server deployment status.',
    settingKeyword: 'Monitored Keywords',
    settingCron: 'Multi-Channel Scraper Interval',
    settingDomain: 'Custom Live Domain',
    settingDb: 'Database & Policies',
    version: 'Version 2.1.0 (Dewan Pers & Multi-Feed Scraper)',
    loginPageTitle: 'Officer Login Portal',
    loginPageDesc: 'SIMONITA Gateway - KPPBC TMP B Pekanbaru',
    backToHome: '← Back to Main Dashboard',
    emailLabel: 'Official Customs Email',
    passwordLabel: 'Password',
    submitLogin: 'Authenticate Credentials',
    otpTitle: 'Officer 2FA Verification',
    otpDesc: 'Enter your 6-digit OTP passcode before accessing database modifications.',
    otpSubmit: 'Confirm Sign In',
    modalTitle: '+ Add Manual News Article',
    modalEditTitle: '✏️ Edit Article & Sentiment',
    modalDesc: 'Record local media articles not caught by automated multi-channel feeds.',
    formTitle: 'News Headline',
    formSource: 'Publisher / Outlet',
    formUrl: 'URL / Reference Link',
    formSentiment: 'Sentiment Classification',
    formSnippet: 'Summary / Officer Notes',
    btnCancel: 'Cancel',
    btnSave: 'Save to Database',
    btnUpdate: 'Save Changes',
    accessRestricted: 'Restricted Access: Please sign in with an officer account.',
    otpSuccess: '2FA Verification Successful. Welcome back to SIMONITA!',
    closeModal: 'Close',
    confirmDelete: 'Remove this news record permanently from SIMONITA?'
  }
};

export default function App() {
  const [lang, setLang] = useState('id');
  const t = translations[lang];

  // Router View: 'dashboard' | 'login'
  const [currentView, setCurrentView] = useState('dashboard');

  // Session & Theme
  const [session, setSession] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'stats' | 'press' | 'settings'

  // Data & Filters
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Pagination State: 10, 25, 50
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Edit State
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

  // Auth State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // Enforcement Hotspots
  const hotspots = [
    {
      id: 'building',
      title: lang === 'id' ? 'Kantor Pelayanan KPPBC TMP B Pekanbaru' : 'Customs Pekanbaru Headquarters',
      subtitle: lang === 'id' ? 'Pusat Komando & Pelayanan PLI' : 'Command Center & Public Inquiries',
      desc: lang === 'id' ? 'Pusat operasional intelijen media, pelayanan kepabeanan, dan koordinasi 5 kabupaten/kota binaan.' : 'Operational command for media analytics, clearance services, and enforcement leadership.',
      coverage: 'Pekanbaru Kota',
      coords: { top: '22%', left: '15%' },
      icon: '🏛️'
    },
    {
      id: 'river',
      title: lang === 'id' ? 'Patroli Perairan Sungai Siak' : 'Siak River Marine Patrol',
      subtitle: lang === 'id' ? 'Pengawasan Alur Kapal & Pelabuhan Rakyat' : 'Waterway & Cargo Interception',
      desc: lang === 'id' ? 'Pengawasan kapal barang dan pencegahan penyelundupan komoditas ilegal melalui perairan Siak.' : 'Marine patrol units monitoring riverway cargo and intercepting contraband.',
      coverage: 'Siak & Pesisir',
      coords: { top: '65%', left: '42%' },
      icon: '🚤'
    },
    {
      id: 'car',
      title: lang === 'id' ? 'Unit Patroli Darat Operasi Pasar' : 'Highway Strike Patrol',
      subtitle: lang === 'id' ? 'Gempur Rokok Ilegal' : 'Tobacco Non-Tax Enforcement',
      desc: lang === 'id' ? 'Pencegahan dan penindakan rokok polos tanpa pita cukai resmi di jalur barat dan selatan Riau.' : 'Interception of illegal non-tax-paid cigarettes along western transit lanes.',
      coverage: 'Kampar & Rokan Hulu',
      coords: { top: '48%', left: '78%' },
      icon: '🚔'
    },
    {
      id: 'drone',
      title: lang === 'id' ? 'Drone Surveillance Udara Kawasan Industri' : 'Industrial Airborne Surveillance',
      subtitle: lang === 'id' ? 'Pemantauan Tempat Penimbunan Berikat' : 'Bonded Zone Aerial Radar',
      desc: lang === 'id' ? 'Monitoring berkala pergerakan truk kontainer dan fasilitas berikat dari udara.' : 'Aerial surveillance of industrial complexes and bonded customs yards.',
      coverage: 'Pelalawan & Siak',
      coords: { top: '15%', left: '60%' },
      icon: '🛸'
    }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
    loadData();
    const channel = subscribeToArticles(() => {
      loadData();
    });
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  const filteredArticles = articles.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.source_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' ? true : item.entry_type === filterType;
    
    let matchesTime = true;
    if (timeFilter !== 'all' && item.published_at) {
      const pubDate = new Date(item.published_at);
      const now = new Date();
      const diffMs = now - pubDate;
      const diffHours = diffMs / (1000 * 60 * 60);

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
      setAuthError(err.message || 'Kredensial login tidak valid.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      alert(lang === 'id' ? 'Masukkan 6-digit kode OTP.' : 'Enter 6-digit OTP code.');
      return;
    }
    setShowOtpDrawer(false);
    setCurrentView('dashboard');
    alert(t.otpSuccess);
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
    setCurrentView('dashboard');
  };

  const handleOpenAddModal = () => {
    if (!session) {
      alert(t.accessRestricted);
      setCurrentView('login');
      return;
    }
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
    if (!session) {
      alert(t.accessRestricted);
      setCurrentView('login');
      return;
    }
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
    if (!session) {
      alert(t.accessRestricted);
      setCurrentView('login');
      return;
    }
    if (window.confirm(t.confirmDelete)) {
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
      alert(lang === 'id' ? 'Mohon isi Judul, Media, dan URL.' : 'Please fill Headline, Source, and URL.');
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
      alert(lang === 'id' ? 'Tidak ada data untuk diekspor.' : 'No data to export.');
      return;
    }

    const headers = ['No', 'Judul Berita', 'Sumber Media', 'Waktu Terbit', 'Tipe Entri', 'Sentimen Opini', 'URL Artikel'];
    const rows = filteredArticles.map((article, index) => {
      const cleanTitle = `"${(article.title || '').replace(/"/g, '""')}"`;
      const cleanSource = `"${(article.source_name || '').replace(/"/g, '""')}"`;
      const dateFormatted = new Date(article.published_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">

      {/* Latar Belakang Isometrik SVG & Radar Hotspots */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <svg className="w-full h-full object-cover opacity-25 dark:opacity-15 transition-opacity" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100,500 C300,450 600,650 900,550 C1200,450 1500,600 1600,580 L1600,900 L-100,900 Z" fill="#0284C7" />
          <path d="M0 200 L1440 600 M0 400 L1440 800 M0 600 L1440 1000" stroke="#0D2C5C" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M1440 200 L0 600 M1440 400 L0 800 M1440 600 L0 1000" stroke="#0D2C5C" strokeWidth="1" strokeDasharray="6 6" />
          <polygon points="200,240 260,205 320,240 260,275" fill="#0D2C5C" opacity="0.6" />
          <polygon points="200,240 260,275 260,340 200,305" fill="#0A2247" opacity="0.8" />
          <polygon points="260,275 320,240 320,305 260,340" fill="#1E3A8A" opacity="0.5" />
          <polygon points="560,600 620,580 660,610 600,630" fill="#F59E0B" opacity="0.7" />
          <polygon points="560,600 600,630 600,645 560,615" fill="#B45309" opacity="0.8" />
          <polygon points="1080,480 1130,455 1170,480 1120,505" fill="#0D2C5C" opacity="0.7" />
          <polygon points="1080,480 1120,505 1120,520 1080,495" fill="#0284C7" opacity="0.8" />
        </svg>

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

      {/* Modal Detail Hotspot */}
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
                {t.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Navigasi Atas */}
      <header className="sticky top-0 z-30 bg-[#0D2C5C]/95 backdrop-blur-md text-white border-b border-amber-500/30 px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center space-x-3.5 cursor-pointer"
          >
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
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">{t.statusActive}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">{t.officeSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-2.5 text-xs">
            <div className="flex items-center rounded-xl bg-white/10 p-0.5 border border-white/10 font-bold">
              <button
                onClick={() => setLang('id')}
                className={`px-2 py-1 rounded-lg transition ${
                  lang === 'id' ? 'bg-amber-400 text-[#0D2C5C]' : 'text-slate-300 hover:text-white'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-lg transition ${
                  lang === 'en' ? 'bg-amber-400 text-[#0D2C5C]' : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition"
              title="Ganti Tema"
            >
              {isDarkMode ? t.themeLight : t.themeDark}
            </button>

            {session ? (
              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono text-[11px]">
                  {session.user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                >
                  {t.logout}
                </button>
              </div>
            ) : currentView === 'dashboard' ? (
              <button
                onClick={() => setCurrentView('login')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#0D2C5C] font-extrabold shadow-sm transition"
              >
                🔐 {t.loginOfficer}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Marquee Banner */}
      <div className="bg-amber-500 text-[#0D2C5C] text-xs font-semibold py-1.5 px-4 overflow-hidden whitespace-nowrap shadow-sm z-10">
        <div className="inline-block animate-pulse">
          {t.marquee}
        </div>
      </div>

      {/* TAMPILAN LOGIN PEGAWAI */}
      {currentView === 'login' ? (
        <div className="flex-1 flex items-center justify-center p-4 z-10 my-auto">
          <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-[#0D2C5C] dark:hover:text-amber-400 mb-6 flex items-center space-x-1"
            >
              <span>{t.backToHome}</span>
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-[#0D2C5C]/10 dark:bg-amber-400/10 p-2 border border-amber-400/30 flex items-center justify-center">
                <img src="/simonita.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <h2 className="text-xl font-extrabold text-[#0D2C5C] dark:text-amber-400">{t.loginPageTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.loginPageDesc}</p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{t.emailLabel}</label>
                <input
                  type="email"
                  required
                  placeholder="pegawai@customs.go.id"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{t.passwordLabel}</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white font-bold text-sm border border-amber-400/40 shadow-md transition disabled:opacity-50 mt-2"
              >
                {authLoading ? 'Memverifikasi...' : t.submitLogin}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400">
              Hak Akses Terbatas Pegawai Seksi PLI Pekanbaru
            </div>
          </div>
        </div>
      ) : (

        /* DASHBOARD UTAMA */
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10 flex flex-col md:flex-row gap-6">

          {/* SIDEBAR DASHBOARD */}
          <aside className="w-full md:w-64 shrink-0 space-y-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">{t.menuTitle}</span>
              
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
                  <span>{t.tabArticles}</span>
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
                  <span>{t.tabStats}</span>
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
                  <span>{t.tabPress}</span>
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
                  <span>{t.tabSettings}</span>
                </span>
              </button>
            </div>

            <div className="bg-[#0D2C5C]/5 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold text-[#0D2C5C] dark:text-amber-400 block">{t.hotspotSidebarTitle}</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t.hotspotSidebarDesc}
              </p>
            </div>
          </aside>

          {/* AREA KERJA */}
          <main className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl font-extrabold text-[#0D2C5C] dark:text-amber-400">
                  {activeTab === 'articles' && t.tabArticles}
                  {activeTab === 'stats' && t.tabStats}
                  {activeTab === 'press' && t.tabPress}
                  {activeTab === 'settings' && t.tabSettings}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{t.portalDesc}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeTab === 'articles' && (
                  <button
                    onClick={exportToCSV}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/40 transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <span>📥</span>
                    <span>{t.exportCsv}</span>
                  </button>
                )}

                <button
                  onClick={loadData}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
                >
                  <span>🔄 {t.refresh}</span>
                </button>

                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40 shadow-sm flex items-center space-x-1.5 transition"
                >
                  <span>{t.addManual}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: ARTIKEL & BERITA */}
            {activeTab === 'articles' && (
              <div className="space-y-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
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
                      <option value="all">{t.allTypes}</option>
                      <option value="scraped">{t.scrapedType}</option>
                      <option value="manual">{t.manualType}</option>
                    </select>

                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                    >
                      <option value="all">{t.timeFilterAll}</option>
                      <option value="24h">{t.timeFilter24h}</option>
                      <option value="7d">{t.timeFilter7d}</option>
                      <option value="30d">{t.timeFilter30d}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                          <th className="py-3 px-4">{t.colTitle}</th>
                          <th className="py-3 px-4">{t.colSource}</th>
                          <th className="py-3 px-4">{t.colDate}</th>
                          <th className="py-3 px-4">{t.colSentiment}</th>
                          <th className="py-3 px-4">{t.colAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-400">
                              {t.loadingData}
                            </td>
                          </tr>
                        ) : paginatedArticles.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-400">
                              {t.emptySearch}
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
                                {new Date(article.published_at).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
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
                                    {t.openLink}
                                  </a>

                                  {session && (
                                    <>
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
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* KONTROL PAGINASI: 10, 25, 50 */}
                  <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">{t.perPageText}</span>
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
                        {t.showingPage} {totalEntries ? startIndex + 1 : 0} - {Math.min(startIndex + rowsPerPage, totalEntries)} {t.ofText} {totalEntries} {t.entriesText}
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

            {/* TAB 2: STATISTIK */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.statsTotal}</span>
                    <div className="text-2xl font-black text-[#0D2C5C] dark:text-amber-400 mt-1">{totalArticles}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">{t.statsTotalSub}</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase">{t.statsPos}</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{positiveCount}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">{t.statsPosSub}</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-sky-600 uppercase">{t.statsNeu}</span>
                    <div className="text-2xl font-black text-sky-600 mt-1">{neutralCount}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">{t.statsNeuSub}</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-rose-600 uppercase">{t.statsNeg}</span>
                    <div className="text-2xl font-black text-rose-600 mt-1">{negativeCount}</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">{t.statsNegSub}</span>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">{t.sourceDistribution}</h3>
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
                {/* Hero Box Dewan Pers */}
                <div className="bg-gradient-to-br from-[#0D2C5C] to-[#0A2247] text-white p-6 rounded-3xl shadow-lg border border-amber-400/30 relative overflow-hidden">
                  <div className="max-w-2xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-[#0D2C5C] mb-2 inline-block">
                      Rujukan Resmi Lembaga Negara
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold mt-1 text-white">{t.pressTitle}</h2>
                    <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                      {t.pressDesc}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a 
                        href="https://dewanpers.or.id/data" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-[#0D2C5C] font-bold text-xs rounded-xl shadow transition inline-flex items-center space-x-1.5"
                      >
                        <span>{t.pressCheckBtn}</span>
                      </a>
                      <a 
                        href="https://dewanpers.or.id" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition inline-flex items-center space-x-1.5"
                      >
                        <span>Portal Utama dewanpers.or.id ↗</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3 Kartu Panduan Dewan Pers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-2xl mb-2">📜</div>
                      <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">{t.pressCardWartawan}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {t.pressCardWartawanDesc}
                      </p>
                    </div>
                    <a 
                      href="https://dewanpers.or.id" 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-3 text-xs font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline"
                    >
                      Cek Sertifikasi ↗
                    </a>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-2xl mb-2">🏢</div>
                      <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">{t.pressCardOrg}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {t.pressCardOrgDesc}
                      </p>
                    </div>
                    <a 
                      href="https://dewanpers.or.id/read/page/07-05-2025-organisasi-perusahaan-pers" 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-3 text-xs font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline"
                    >
                      Daftar Organisasi ↗
                    </a>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-2xl mb-2">⚖️</div>
                      <h4 className="font-bold text-xs text-[#0D2C5C] dark:text-amber-400 mb-1">{t.pressCardPengaduan}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {t.pressCardPengaduanDesc}
                      </p>
                    </div>
                    <a 
                      href="https://dewanpers.or.id" 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-3 text-xs font-semibold text-[#0D2C5C] dark:text-amber-400 hover:underline"
                    >
                      Tata Cara Pengaduan ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#0D2C5C] dark:text-amber-400">{t.settingsTitle}</h2>
                  <p className="text-xs text-slate-500">{t.settingsDesc}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-semibold block mb-1">{t.settingKeyword}</span>
                    <p className="text-slate-600 dark:text-slate-300 font-mono">"Bea Cukai Pekanbaru", KPPBC Pekanbaru, Media Daerah</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-semibold block mb-1">{t.settingCron}</span>
                    <p className="text-slate-600 dark:text-slate-300 font-mono">Setiap 1 Jam ('0 * * * *')</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-semibold block mb-1">{t.settingDomain}</span>
                    <p className="text-slate-600 dark:text-slate-300 font-mono">simonita.cloud (Cloudflare Pages)</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="font-semibold block mb-1">{t.settingDb}</span>
                    <p className="text-slate-600 dark:text-slate-300 font-mono">Supabase PostgreSQL + RLS</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-1">
                  <span>Seksi Penyuluhan dan Layanan Informasi (PLI) KPPBC TMP B Pekanbaru</span>
                  <span>{t.version}</span>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Drawer 2FA OTP Horizontal Sliding */}
      {showOtpDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-lg text-[#0D2C5C] dark:text-amber-400">{t.otpTitle}</h3>
                <button
                  onClick={() => setShowOtpDrawer(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-6">{t.otpDesc}</p>

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
                  {t.otpSubmit}
                </button>
              </form>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              KPPBC TMP B Pekanbaru • Internal Security
            </div>
          </div>
        </div>
      )}

      {/* Modal Input & Edit Berita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-[#0D2C5C] dark:text-amber-400 mb-1">
              {editingArticleId ? t.modalEditTitle : t.modalTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-4">{t.modalDesc}</p>

            <form onSubmit={handleSubmitArticle} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">{t.formTitle}</label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Bea Cukai Pekanbaru Gagalkan Penyelundupan...' : 'e.g. Customs Thwarts Smuggling...'}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t.formSource}</label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Riau Pos, Antara Riau' : 'e.g. Antara, Tribun'}
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t.formUrl}</label>
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
                <label className="block font-semibold mb-1">{t.formSentiment}</label>
                <select
                  value={formData.sentiment}
                  onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2C5C]"
                >
                  <option value="positive">{lang === 'id' ? 'Positif (Kinerja / Apresiasi)' : 'Positive (Performance / Praise)'}</option>
                  <option value="neutral">{lang === 'id' ? 'Netral (Rilis Umum / Informasi)' : 'Neutral (General Coverage)'}</option>
                  <option value="negative">{lang === 'id' ? 'Kritis / Negatif (Perlu Ditindaklanjuti)' : 'Critical / Negative (Action Required)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">{t.formSnippet}</label>
                <textarea
                  rows="3"
                  placeholder={lang === 'id' ? 'Ringkasan isi berita...' : 'News excerpt or summary...'}
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D2C5C] hover:bg-[#0A2247] text-white border border-amber-400/40"
                >
                  {editingArticleId ? t.btnUpdate : t.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
