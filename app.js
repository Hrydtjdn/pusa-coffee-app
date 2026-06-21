// ==========================================
// CONFIG CONFIGURATION SUPABASE
// ==========================================
const SUPABASE_URL = 'https://osrlijqkewwmrxzvxpqt.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_3Gy9v5yQa69iQFwoAJwHuQ_JruTy...'; // Tempel Publishable Key lengkap Anda di sini

// Inisialisasi aman tanpa memicu error "already been declared"
let db;
if (typeof supabase !== 'undefined' && supabase.createClient) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("SDK Supabase gagal dimuat dari CDN. Periksa koneksi internet Anda.");
}

// State Management
let currentUser = null;

const MENUS = {
    OWNER: [
        { id: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four' },
        { id: 'master', label: 'Master Data', icon: 'ph-database', sub: ['Master Akses', 'Master Akun', 'Master Produk', 'Master Harga', 'Master Resep'] },
        { id: 'stock', label: 'Stock', icon: 'ph-package', sub: ['Stock Masuk', 'Stock Adjustment', 'Stock Opname', 'Riwayat Stock'] },
        { id: 'shift', label: 'Shift', icon: 'ph-clock', sub: ['Monitoring Shift', 'Approval Shift', 'Riwayat Shift'] },
        { id: 'keuangan', label: 'Keuangan', icon: 'ph-wallet', sub: ['Input Pengeluaran', 'Cash Flow', 'Approval Pengeluaran'] },
        { id: 'laporan', label: 'Laporan', icon: 'ph-chart-line-up', sub: ['Penjualan', 'Stock', 'Laba Rugi', 'Food Cost'] },
        { id: 'pengaturan', label: 'Pengaturan', icon: 'ph-gear' }
    ],
    KARYAWAN: [
        { id: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four' },
        { id: 'shift_k', label: 'Shift Operasional', icon: 'ph-clock', sub: ['Buka Shift', 'Input Laporan', 'Tutup Shift'] },
        { id: 'stock_keluar', label: 'Stock Keluar', icon: 'ph-box-arrow-up' },
        { id: 'riwayat', label: 'Riwayat Laporan', icon: 'ph-clock-counter-clockwise' },
        { id: 'profil', label: 'Profil Saya', icon: 'ph-user' }
    ]
};

// Cek Sesi Otomatis Saat Refresh browser
window.addEventListener('DOMContentLoaded', async () => {
    if (!db) return;
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        fetchUserProfile(session.user);
    }
});

// ==========================================
// PROSES AUTHENTICATION
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    if (!db) {
        alert("Koneksi database belum siap.");
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const err = document.getElementById('login-error');
    
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Memproses...';
    btn.disabled = true;
    err.classList.add('hidden');

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        err.textContent = "Gagal Masuk: " + error.message;
        err.classList.remove('hidden');
        resetLoginBtn(btn);
    } else {
        fetchUserProfile(data.user);
    }
}

async function fetchUserProfile(authUser) {
    const { data: profile, error } = await db
        .from('profiles')
        .select('nama, role, outlet, status')
        .eq('id', authUser.id)
        .single();

    if (error || !profile || profile.status !== 'Aktif') {
        alert("Akun Anda tidak aktif atau profil database tidak ditemukan.");
        logout();
        return;
    }

    currentUser = {
        id: authUser.id,
        nama: profile.nama,
        role: profile.role,
        outlet: profile.outlet
    };
    initApp();
}

function resetLoginBtn(btn) {
    btn.innerHTML = '<span>MASUK</span><i class="ph ph-sign-in text-xl"></i>';
    btn.disabled = false;
}

async function logout() {
    if (db) await db.auth.signOut();
    currentUser = null;
    document.getElementById('view-app').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('form-login').reset();
    resetLoginBtn(document.getElementById('btn-login'));
}

// ==========================================
// RENDER ENGINE SIDEBAR & PAGES
// ==========================================
function initApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');
    
    document.getElementById('user-name-display').textContent = currentUser.nama;
    document.getElementById('user-role-display').textContent = currentUser.role;

    generateSidebar();
    loadPage('dashboard');
}

function generateSidebar() {
    const menuContainer = document.getElementById('sidebar-menu');
    menuContainer.innerHTML = ''; 
    const activeMenus = MENUS[currentUser.role];

    activeMenus.forEach(item => {
        const btn = document.createElement('button');
        btn.className = "w-full flex items-center justify-between px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all group";
        btn.innerHTML = `<div class="flex items-center gap-3">
                            <i class="ph ${item.icon} text-xl group-hover:text-pbg transition-colors"></i>
                            <span class="font-medium text-sm tracking-wide">${item.label}</span>
                         </div>` + (item.sub ? `<i class="ph ph-caret-down text-xs opacity-50"></i>` : '');
        menuContainer.appendChild(btn);

        if(item.sub) {
            const subDiv = document.createElement('div');
            subDiv.className = "pl-11 pr-4 py-2 space-y-1 hidden"; 
            item.sub.forEach(subItem => {
                const subBtn = document.createElement('div');
                subBtn.className = "text-xs font-medium text-white/60 hover:text-pbg cursor-pointer py-2 transition-colors flex items-center gap-2";
                subBtn.innerHTML = `<div class="w-1.5 h-1.5 rounded-full bg-white/30"></div> ${subItem}`;
                subBtn.onclick = (e) => { e.stopPropagation(); loadPage(item.id, subItem); };
                subDiv.appendChild(subBtn);
            });
            menuContainer.appendChild(subDiv);
            btn.onclick = () => subDiv.classList.toggle('hidden');
        } else {
            btn.onclick = () => loadPage(item.id, item.label);
        }
    });
}

function loadPage(pageId, title = "Dashboard") {
    document.getElementById('page-title').textContent = title;
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="flex justify-center mt-20"><i class="ph ph-spinner animate-spin text-4xl text-pdark"></i></div>';

    setTimeout(async () => {
        if(pageId === 'dashboard') {
            if(currentUser.role === 'OWNER') {
                const { data: dbStocks } = await db.from('stocks').select('nama_bahan, qty, satuan').lt('qty', 50);
                
                renderDashboard({
                    omzet: "Rp 4.500.000",
                    laba: "Rp 1.250.000",
                    cup: 245,
                    lowStock: dbStocks && dbStocks.length ? dbStocks.map(s => ({ item: s.nama_bahan, sisa: s.qty + " " + s.satuan })) : [
                        { item: "Bubuk Kopi", sisa: "120 gr" },
                        { item: "UHT", sisa: "3 pcs" }
                    ]
                });
            } else {
                renderDashboard({ shiftStatus: "OPEN", kasAwal: "Rp 500.000", cupHariIni: 45 });
            }
        } else {
            renderDefaultView(title);
        }
    }, 300);
}

function renderDashboard(data) {
    const content = document.getElementById('main-content');
    if(currentUser.role === 'OWNER') {
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 fade-in">
                <div class="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center"><i class="ph ph-trend-up text-2xl text-green-600"></i></div>
                    <div><div class="text-xs font-bold text-gray-400 uppercase">Total Omzet</div><div class="text-xl font-black text-gray-800 mt-1">${data.omzet}</div></div>
                </div>
                <div class="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-14 h-14 bg-pbg rounded-2xl flex items-center justify-center"><i class="ph ph-money text-2xl text-pdark"></i></div>
                    <div><div class="text-xs font-bold text-gray-400 uppercase">Laba Bersih</div><div class="text-xl font-black text-gray-800 mt-1">${data.laba}</div></div>
                </div>
                <div class="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center"><i class="ph ph-coffee text-2xl text-orange-600"></i></div>
                    <div><div class="text-xs font-bold text-gray-400 uppercase">Cup Terjual</div><div class="text-xl font-black text-gray-800 mt-1">${data.cup} Cup</div></div>
                </div>
            </div>`;
    } else {
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 fade-in">
                <div class="bg-pdark text-white p-6 rounded-3xl shadow-lg">
                    <h3 class="text-pbg text-sm font-bold mb-1 uppercase">Status Shift</h3>
                    <div class="text-3xl font-black">${data.shiftStatus}</div>
                </div>
            </div>`;
    }
}

function renderDefaultView(title) {
    document.getElementById('main-content').innerHTML = `<div class="bg-white p-12 rounded-3xl text-center mt-10 fade-in"><h3 class="text-2xl font-bold text-pdark mb-2">Modul ${title}</h3><p class="text-gray-400">Terhubung ke Tabel PostgreSQL.</p><button onclick="loadPage('dashboard')" class="mt-8 bg-plight text-pdark font-bold px-6 py-3 rounded-xl">Kembali</button></div>`;
}
