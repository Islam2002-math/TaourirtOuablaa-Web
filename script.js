// ===== CONFIGURATION =====
const ADMIN_PASSWORD_HASH = 'b8b8eb83374c0bf3b1c3224159f6119dbfff1b7ed6dfecdd80d4e8a895790a34';

// Supabase Configuration
const SUPABASE_URL = 'https://ovanwwkubcgvrkjxqmfu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BA-BOwfzVNqNldduusYbuw_Ih_1n5ac';

// Tables Supabase
const TABLES = {
    tournois: 'tournois',
    scores: 'scores',
    standings: 'standings',
    gallery: 'gallery',
    news: 'news',
    bracket: 'bracket'
};

// SHA-256 hash function for password verification
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let isAdmin = false;
let pendingConfirmAction = null;
let cloudLoaded = false;

// ===== PERFORMANCE HELPERS =====
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// getData cache - avoid repeated JSON.parse on same tick
const _dataCache = {};
const _dataCacheTs = {};
const DATA_CACHE_TTL = 2000; // ms - cache longer to avoid repeated JSON.parse

// ===== DATA MANAGEMENT =====
function getData(key) {
    const now = Date.now();
    if (_dataCache[key] && (now - (_dataCacheTs[key] || 0)) < DATA_CACHE_TTL) {
        return _dataCache[key];
    }
    const data = localStorage.getItem('to_' + key);
    const parsed = data ? JSON.parse(data) : [];
    _dataCache[key] = parsed;
    _dataCacheTs[key] = now;
    return parsed;
}

function setData(key, data) {
    _dataCache[key] = data;
    _dataCacheTs[key] = Date.now();
    localStorage.setItem('to_' + key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== DONNÉES PAR DÉFAUT =====
const DEFAULT_STANDINGS = {
    A: [
        { team: 'TAOURIRT-OUABLA "A"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'ALLAGHENE', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'RIQUET "AKBOU"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'AKBOU "SOUMMAM"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'TIZI-ALLOUANE', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 }
    ],
    B: [
        { team: 'TAOURIRT-OUABLA "B"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'SEDDOUK', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'ARRAFOU "AKBOU"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'QUIZRANE', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 }
    ],
    C: [
        { team: "EQUIPE DES AMIS", mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'GUENZET', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'GUENDOUZA "AKBOU"', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'TAZMALT', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 }
    ],
    D: [
        { team: 'APC AIT R\'ZINE', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'GUENDOUZE', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'AOURIR DJEDIDA', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 },
        { team: 'TIGHILT OUMIAL', mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0 }
    ]
};

const SITE_DEFAULT_DATA = {
    tournois: [
        {
            id: 't1',
            name: "Tournoi Ramadan 2026",
            startDate: '2026-02-22',
            endDate: '2026-03-08',
            teams: 17,
            status: 'active',
            description: 'Le grand tournoi de Ramadan 2026 avec 17 équipes réparties en 4 groupes.',
            image: ''
        }
    ],
    scores: [
        { id: 'j1m1', homeTeam: 'TAOURIRT-OUABLA "A"', awayTeam: 'AKBOU "SOUMMAM"', homeScore: 0, awayScore: 0, date: '2026-02-22T20:00', status: 'upcoming', journee: 'J1', buteurs: [] },
        { id: 'j1m2', homeTeam: 'ALLAGHENE', awayTeam: 'TIZI-ALLOUANE', homeScore: 0, awayScore: 0, date: '2026-02-22T21:00', status: 'upcoming', journee: 'J1', buteurs: [] },
        { id: 'j2m1', homeTeam: 'TAOURIRT-OUABLA "B"', awayTeam: 'ARRAFOU "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-02-23T20:00', status: 'upcoming', journee: 'J2', buteurs: [] },
        { id: 'j2m2', homeTeam: 'SEDDOUK', awayTeam: 'QUIZRANE', homeScore: 0, awayScore: 0, date: '2026-02-23T21:00', status: 'upcoming', journee: 'J2', buteurs: [] },
        { id: 'j3m1', homeTeam: 'EQUIPE DES AMIS', awayTeam: 'GUENDOUZA "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-02-24T20:00', status: 'upcoming', journee: 'J3', buteurs: [] },
        { id: 'j3m2', homeTeam: 'GUENZET', awayTeam: 'TAZMALT', homeScore: 0, awayScore: 0, date: '2026-02-24T21:00', status: 'upcoming', journee: 'J3', buteurs: [] },
        { id: 'j4m1', homeTeam: 'APC AIT R\'ZINE', awayTeam: 'AOURIR DJEDIDA', homeScore: 0, awayScore: 0, date: '2026-02-25T20:00', status: 'upcoming', journee: 'J4', buteurs: [] },
        { id: 'j4m2', homeTeam: 'GUENDOUZE', awayTeam: 'TIGHILT OUMIAL', homeScore: 0, awayScore: 0, date: '2026-02-25T21:00', status: 'upcoming', journee: 'J4', buteurs: [] },
        { id: 'j5m1', homeTeam: 'TAOURIRT-OUABLA "A"', awayTeam: 'RIQUET "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-02-26T20:00', status: 'upcoming', journee: 'J5', buteurs: [] },
        { id: 'j5m2', homeTeam: 'ALLAGHENE', awayTeam: 'AKBOU "SOUMMAM"', homeScore: 0, awayScore: 0, date: '2026-02-26T21:00', status: 'upcoming', journee: 'J5', buteurs: [] },
        { id: 'j6m1', homeTeam: 'TAOURIRT-OUABLA "B"', awayTeam: 'QUIZRANE', homeScore: 0, awayScore: 0, date: '2026-02-27T20:00', status: 'upcoming', journee: 'J6', buteurs: [] },
        { id: 'j6m2', homeTeam: 'SEDDOUK', awayTeam: 'ARRAFOU "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-02-27T21:00', status: 'upcoming', journee: 'J6', buteurs: [] },
        { id: 'j7m1', homeTeam: 'AKBOU "SOUMMAM"', awayTeam: 'RIQUET "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-02-28T20:00', status: 'upcoming', journee: 'J7', buteurs: [] },
        { id: 'j8m1', homeTeam: 'EQUIPE DES AMIS', awayTeam: 'TAZMALT', homeScore: 0, awayScore: 0, date: '2026-03-01T20:00', status: 'upcoming', journee: 'J8', buteurs: [] },
        { id: 'j8m2', homeTeam: 'GUENZET', awayTeam: 'GUENDOUZA "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-03-01T21:00', status: 'upcoming', journee: 'J8', buteurs: [] },
        { id: 'j9m1', homeTeam: 'APC AIT R\'ZINE', awayTeam: 'TIGHILT OUMIAL', homeScore: 0, awayScore: 0, date: '2026-03-02T20:00', status: 'upcoming', journee: 'J9', buteurs: [] },
        { id: 'j9m2', homeTeam: 'GUENDOUZE', awayTeam: 'AOURIR DJEDIDA', homeScore: 0, awayScore: 0, date: '2026-03-02T21:00', status: 'upcoming', journee: 'J9', buteurs: [] },
        { id: 'j10m1', homeTeam: 'ALLAGHENE', awayTeam: 'RIQUET "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-03-03T20:00', status: 'upcoming', journee: 'J10', buteurs: [] },
        { id: 'j10m2', homeTeam: 'AKBOU "SOUMMAM"', awayTeam: 'TIZI-ALLOUANE', homeScore: 0, awayScore: 0, date: '2026-03-03T21:00', status: 'upcoming', journee: 'J10', buteurs: [] },
        { id: 'j11m1', homeTeam: 'TAOURIRT-OUABLA "B"', awayTeam: 'SEDDOUK', homeScore: 0, awayScore: 0, date: '2026-03-04T20:00', status: 'upcoming', journee: 'J11', buteurs: [] },
        { id: 'j11m2', homeTeam: 'ARRAFOU "AKBOU"', awayTeam: 'QUIZRANE', homeScore: 0, awayScore: 0, date: '2026-03-04T21:00', status: 'upcoming', journee: 'J11', buteurs: [] },
        { id: 'j12m1', homeTeam: 'TAOURIRT-OUABLA "A"', awayTeam: 'TIZI-ALLOUANE', homeScore: 0, awayScore: 0, date: '2026-03-05T20:00', status: 'upcoming', journee: 'J12', buteurs: [] },
        { id: 'j13m1', homeTeam: 'EQUIPE DES AMIS', awayTeam: 'GUENZET', homeScore: 0, awayScore: 0, date: '2026-03-06T20:00', status: 'upcoming', journee: 'J13', buteurs: [] },
        { id: 'j13m2', homeTeam: 'GUENDOUZA "AKBOU"', awayTeam: 'TAZMALT', homeScore: 0, awayScore: 0, date: '2026-03-06T21:00', status: 'upcoming', journee: 'J13', buteurs: [] },
        { id: 'j14m1', homeTeam: 'APC AIT R\'ZINE', awayTeam: 'GUENDOUZE', homeScore: 0, awayScore: 0, date: '2026-03-07T20:00', status: 'upcoming', journee: 'J14', buteurs: [] },
        { id: 'j14m2', homeTeam: 'AOURIR DJEDIDA', awayTeam: 'TIGHILT OUMIAL', homeScore: 0, awayScore: 0, date: '2026-03-07T21:00', status: 'upcoming', journee: 'J14', buteurs: [] },
        { id: 'j15m1', homeTeam: 'TAOURIRT-OUABLA "A"', awayTeam: 'ALLAGHENE', homeScore: 0, awayScore: 0, date: '2026-03-08T20:00', status: 'upcoming', journee: 'J15', buteurs: [] },
        { id: 'j15m2', homeTeam: 'TIZI-ALLOUANE', awayTeam: 'RIQUET "AKBOU"', homeScore: 0, awayScore: 0, date: '2026-03-08T21:00', status: 'upcoming', journee: 'J15', buteurs: [] }
    ],
    news: [],
    gallery: [],
    standings: DEFAULT_STANDINGS
};

// ===== CLOUD SYNC OPTIMISÉ (Firebase Realtime Database) =====
// Chaque section est sauvegardée séparément pour éviter les gros envois

// Firebase converts arrays to objects with numeric keys - convert back
function firebaseToArray(data) {
    if (Array.isArray(data)) return data.filter(x => x != null);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        // Check if all keys are numeric (Firebase array-like object)
        if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            return keys.map(k => data[k]).filter(x => x != null);
        }
    }
    return null;
}

// ===== SUPABASE FUNCTIONS =====

async function supabaseGet(table) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?select=*`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                signal: controller.signal
            }
        );
        clearTimeout(timeout);
        if (res.ok) return await res.json();
    } catch (e) {
        console.log('Supabase get error:', e);
    }
    return null;
}

async function supabasePut(table, data) {
    try {
        // First try to delete existing records
        await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Then insert new data
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(data)
            }
        );
        return res.ok;
    } catch (e) {
        console.log('Supabase put error:', e);
        return false;
    }
}

// Legacy Firebase functions (now use Supabase)
async function firebasePut(path, data) {
    // Map path to table name
    const tableName = path.replace('/', '');
    if (TABLES[tableName]) {
        // For array data, we need to handle it differently
        if (Array.isArray(data)) {
            // Delete existing and insert new
            await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
        }
        return await supabasePut(tableName, data);
    }
    return false;
}

async function firebaseGet(path) {
    const tableName = path.replace('/', '');
    if (TABLES[tableName]) {
        return await supabaseGet(tableName);
    }
    return null;
}

async function loadFromCloud() {
    try {
        // Load critical data first (scores, standings, tournois)
        const [rawTournois, rawScores, standings, lastUpdate] = await Promise.all([
            supabaseGet('tournois'),
            supabaseGet('scores'),
            supabaseGet('standings'),
            supabaseGet('lastUpdate')
        ]);

        // Process arrays
        const tournois = Array.isArray(rawTournois) ? rawTournois : [];
        const scores = Array.isArray(rawScores) ? rawScores : [];
        
        // For standings, convert each group's teams array
        if (standings && typeof standings === 'object') {
            Object.keys(standings).forEach(group => {
                if (standings[group] && !Array.isArray(standings[group])) {
                    standings[group] = standings[group] || [];
                }
            });
        }

        const hasData =
            (tournois && tournois.length > 0) ||
            (scores && scores.length > 0) ||
            (standings && typeof standings === 'object' && Object.keys(standings).length > 0);

        if (hasData) {
            if (tournois && tournois.length > 0) setData('tournois', tournois);
            if (scores && scores.length > 0) setData('scores', scores);
            if (standings && typeof standings === 'object' && Object.keys(standings).length > 0) setData('standings', standings);
            if (lastUpdate) lastUpdateHash = lastUpdate;
            cloudLoaded = true;
        }

        // Defer non-critical data (gallery, news, bracket) - load in background
        Promise.all([
            supabaseGet('news'),
            supabaseGet('gallery'),
            supabaseGet('bracket')
        ]).then(([rawNews, rawGallery, bracket]) => {
            const news = Array.isArray(rawNews) ? rawNews : [];
            const gallery = Array.isArray(rawGallery) ? rawGallery : [];
            if (news && news.length > 0) setData('news', news);
            if (gallery && gallery.length > 0) {
                setData('gallery', gallery);
                renderGallery();
            }
            if (bracket && typeof bracket === 'object' && Object.keys(bracket).length > 0) {
                setBracketData(bracket);
                migrateBracketData();
                renderBracket();
            }
        }).catch(() => {});

        return hasData;
    } catch (e) {
        console.log('Firebase non disponible, utilisation des données locales');
    }
    return false;
}

// Backup automatique avant chaque modification (garde les 3 derniers)
let _lastBackupTs = 0;
async function autoBackup() {
    const now = Date.now();
    // Max 1 backup toutes les 60 secondes
    if (now - _lastBackupTs < 60000) return;
    _lastBackupTs = now;
    try {
        const backup = {
            scores: getData('scores'),
            standings: getStandingsData(),
            tournois: getData('tournois'),
            bracket: getBracketData(),
            ts: new Date().toISOString()
        };
        // Rotation : garder 3 backups (slot 0, 1, 2)
        const slot = Math.floor(now / 60000) % 3;
        await firebasePut('/backups/' + slot, backup);
    } catch(e) {}
}

// Sauvegarde ciblée : envoie uniquement la section modifiée
async function saveToCloud(section) {
    // Auto-backup avant de modifier
    await autoBackup();
    try {
        if (!section || section === 'all') {
            // Sauvegarde complète (import, reset)
            const results = await Promise.all([
                firebasePut('/tournois', getData('tournois')),
                firebasePut('/scores', getData('scores')),
                firebasePut('/standings', getStandingsData()),
                firebasePut('/news', getData('news')),
                firebasePut('/gallery', getData('gallery')),
                firebasePut('/bracket', getBracketData()),
                firebasePut('/lastUpdate', new Date().toISOString())
            ]);
            return results.every(r => r);
        }
        // Sauvegarde ciblée : seulement la section modifiée
        const sectionData = {
            tournois: getData('tournois'),
            scores: getData('scores'),
            standings: getStandingsData(),
            news: getData('news'),
            gallery: getData('gallery'),
            bracket: getBracketData(),
        };
        const ok = await firebasePut('/' + section, sectionData[section] || null);
        if (ok) await firebasePut('/lastUpdate', new Date().toISOString());
        return ok;
    } catch (e) {
        console.log('Erreur sauvegarde Firebase:', e);
        return false;
    }
}

// Sauvegarde auto après chaque modification admin (avec retry)
async function syncAfterChange(section) {
    if (!isAdmin) return;
    let ok = await saveToCloud(section);
    if (!ok) {
        // Retry once after 2s
        await new Promise(r => setTimeout(r, 2000));
        ok = await saveToCloud(section);
    }
    if (ok) {
        showToast('Données en ligne ✓ (visible par tous)', 'success');
    } else {
        showToast('⚠ Échec sync cloud — sauvegardé localement. Réessayez avec le bouton Synchroniser.', 'error');
    }
}

// ===== CORRECTION DATES =====
function corrigerDates() {
    const corrections = {
        'j7m1': '2026-02-28T20:00',
        'j9m1': '2026-02-28T20:00',
        'j9m2': '2026-02-28T21:00',
    };
    let scores = getData('scores');
    let changed = false;
    scores = scores.map(s => {
        if (corrections[s.id] && s.date !== corrections[s.id]) {
            changed = true;
            return { ...s, date: corrections[s.id] };
        }
        return s;
    });
    if (changed) {
        setData('scores', scores);
    }
}

// ===== CHARGEMENT DES DONNÉES =====
async function initData() {
    // 1) Essayer le cloud en priorité (contient les modifs admin)
    const fromCloud = await loadFromCloud();
    if (fromCloud) {
        if (!localStorage.getItem('to_standings')) {
            setData('standings', DEFAULT_STANDINGS);
        }
        corrigerDates();
        return true;
    }

    // 2) Si on a deja des données locales (sessions précédentes), les utiliser
    const hasLocal = localStorage.getItem('to_scores') || localStorage.getItem('to_tournois');
    if (hasLocal) {
        if (!localStorage.getItem('to_standings')) {
            setData('standings', DEFAULT_STANDINGS);
        }
        corrigerDates();
        return false;
    }

    // 3) Sinon essayer data.json (premier chargement uniquement)
    let fromFile = false;
    try {
        const response = await fetch('data.json');
        if (response.ok) {
            const fileData = await response.json();
            if (fileData.tournois) setData('tournois', fileData.tournois);
            if (fileData.scores) setData('scores', fileData.scores);
            if (fileData.news) setData('news', fileData.news);
            if (fileData.gallery) setData('gallery', fileData.gallery);
            if (fileData.standings) setData('standings', fileData.standings);
            fromFile = true;
            saveToCloud();
        }
    } catch (e) {
        console.log('data.json non disponible:', e);
    }

    // 4) Toujours initialiser standings si vide
    if (!localStorage.getItem('to_standings')) {
        setData('standings', DEFAULT_STANDINGS);
    }

    // 5) Initialiser avec données par défaut si rien d'autre
    if (!fromFile && !localStorage.getItem('to_initialized')) {
        setData('tournois', SITE_DEFAULT_DATA.tournois);
        setData('scores', SITE_DEFAULT_DATA.scores);
        setData('news', SITE_DEFAULT_DATA.news);
        setData('gallery', SITE_DEFAULT_DATA.gallery);
        localStorage.setItem('to_initialized', 'true');
    }
    return false;
}

// ===== EXPORT / IMPORT DONNÉES =====
function exportData() {
    const data = {
        tournois: getData('tournois'),
        scores: getData('scores'),
        news: getData('news'),
        gallery: getData('gallery'),
        standings: getStandingsData(),
        exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Données exportées !', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.tournois) setData('tournois', data.tournois);
            if (data.scores) setData('scores', data.scores);
            if (data.news) setData('news', data.news);
            if (data.gallery) setData('gallery', data.gallery);
            if (data.standings) setData('standings', data.standings);

            renderAll();
            await syncAfterChange('all');
        } catch (err) {
            showToast('Erreur : fichier JSON invalide', 'error');
        }
    };
    input.click();
}

function resetToDefault() {
    showConfirm('Remettre toutes les données par défaut ? Toutes vos modifications seront perdues.', async () => {
        setData('tournois', SITE_DEFAULT_DATA.tournois);
        setData('scores', SITE_DEFAULT_DATA.scores);
        setData('news', SITE_DEFAULT_DATA.news);
        setData('gallery', SITE_DEFAULT_DATA.gallery);
        setData('standings', SITE_DEFAULT_DATA.standings);

        renderAll();
        await syncAfterChange('all');
    });
}

async function forceSyncToCloud() {
    showToast('Synchronisation en cours...', 'info');
    const ok = await saveToCloud('all');
    if (ok) {
        showToast('Toutes les données sont synchronisées en ligne !', 'success');
    } else {
        showToast('Erreur de synchronisation', 'error');
    }
}

function renderAll() {
    renderJourneeNav();
    renderScores();
    renderStandings();
    renderButeurs();
    initHeroCards();

    requestAnimationFrame(() => {
        renderTournois();
        refreshStats();
        updateMatchTournoiSelect();
        renderBracket();
        renderGallery();
        initMatchDuJour();
        initCountdown();
    });
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = document.createElement('i');
    icon.className = icons[type] || icons.info;
    const span = document.createElement('span');
    span.className = 'toast-message';
    span.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(icon);
    toast.appendChild(span);
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== MODAL MANAGEMENT =====
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => {
            m.classList.remove('active');
        });
        const lightbox = document.getElementById('lightbox');
        if (lightbox.classList.contains('active')) {
            closeLightbox();
        }
        document.body.style.overflow = '';
    }
});

// ===== ADMIN MODE =====
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 1000; // 30 secondes
const AUTO_LOGOUT_DELAY = 30 * 60 * 1000; // 30 minutes
let loginAttempts = 0;
let lockoutUntil = 0;
let adminActivityTimer = null;

function resetAdminActivityTimer() {
    if (!isAdmin) return;
    clearTimeout(adminActivityTimer);
    adminActivityTimer = setTimeout(() => {
        if (isAdmin) {
            isAdmin = false;
            updateAdminUI();
            showToast('Session admin expirée (inactivité 30 min)', 'info');
        }
    }, AUTO_LOGOUT_DELAY);
}

function toggleAdminMode() {
    if (isAdmin) {
        isAdmin = false;
        clearTimeout(adminActivityTimer);
        updateAdminUI();
        showToast('Mode administrateur désactivé', 'info');
    } else {
        openModal('adminLoginModal');
    }
}

async function loginAdmin(e) {
    e.preventDefault();
    const now = Date.now();
    if (now < lockoutUntil) {
        const secsLeft = Math.ceil((lockoutUntil - now) / 1000);
        showToast(`Trop de tentatives. Réessayez dans ${secsLeft}s.`, 'error');
        return;
    }
    const password = document.getElementById('adminPassword').value;
    const passwordHash = await sha256(password);
    if (passwordHash === ADMIN_PASSWORD_HASH) {
        loginAttempts = 0;
        lockoutUntil = 0;
        isAdmin = true;
        closeModal('adminLoginModal');
        document.getElementById('adminPassword').value = '';
        updateAdminUI();
        resetAdminActivityTimer();
        document.addEventListener('click', resetAdminActivityTimer, { passive: true });
        document.addEventListener('keydown', resetAdminActivityTimer, { passive: true });
        showToast('Mode administrateur active', 'success');
    } else {
        loginAttempts++;
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            lockoutUntil = Date.now() + LOCKOUT_DURATION;
            loginAttempts = 0;
            showToast('5 tentatives echouees. Bloque 30 secondes.', 'error');
        } else {
            showToast(`Mot de passe incorrect (${loginAttempts}/${MAX_LOGIN_ATTEMPTS})`, 'error');
        }
        document.getElementById('adminPassword').value = '';
    }
}

function updateAdminUI() {
    const adminBtn = document.getElementById('adminToggle');
    const adminActions = document.querySelectorAll('.admin-actions');
    const deleteButtons = document.querySelectorAll('.galerie-delete');
    const adminToolbar = document.getElementById('adminToolbar');

    if (isAdmin) {
        adminBtn.classList.add('active');
        adminBtn.innerHTML = '<i class="fas fa-unlock"></i> Admin';
        adminActions.forEach(el => el.style.display = 'block');
        deleteButtons.forEach(el => el.style.display = 'block');
        if (adminToolbar) adminToolbar.style.display = 'flex';
    } else {
        adminBtn.classList.remove('active');
        adminBtn.innerHTML = '<i class="fas fa-lock"></i> Admin';
        adminActions.forEach(el => el.style.display = 'none');
        deleteButtons.forEach(el => el.style.display = 'none');
        if (adminToolbar) adminToolbar.style.display = 'none';
    }
    ajusterMarginHero();

    renderTournois();
    renderScores();
    // renderNews(); // section actualites supprimee
    renderGallery();
    renderStandings();
    renderBracket();
}

// ===== CONFIRM DELETE =====
function showConfirm(message, action) {
    document.getElementById('confirmMessage').textContent = message;
    pendingConfirmAction = action;
    openModal('confirmModal');
}

function confirmAction() {
    if (pendingConfirmAction) {
        pendingConfirmAction();
        pendingConfirmAction = null;
    }
    closeModal('confirmModal');
}

// ===== IMAGE HANDLING =====
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.classList.add('has-image');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewMultipleImages(input) {
    const preview = document.getElementById('galleryImagesPreview');
    if (input.files && input.files.length > 0) {
        preview.classList.add('has-image');
        preview.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'multi-preview';

        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                grid.appendChild(img);
            };
            reader.readAsDataURL(file);
        });

        preview.appendChild(grid);
    }
}

function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

// ===== HERO CARDS =====
function initHeroCards() {
    const scores = getData('scores');
    const today = getLocalToday();
    const now = new Date();

    // Next match
    const upcoming = scores
        .filter(s => s.status !== 'finished' && s.date && new Date(s.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    // Also check bracket matches for upcoming
    const bracketData = getBracketData();
    const bracketUpcoming = [];
    ['quarters', 'semis', 'final'].forEach(phase => {
        (bracketData[phase] || []).forEach(bm => {
            if (bm.status !== 'finished' && bm.date && new Date(bm.date) > now && bm.team1 && bm.team2) {
                const phaseLabel = phase === 'quarters' ? 'Quart' : phase === 'semis' ? 'Demi' : 'Finale';
                bracketUpcoming.push({ homeTeam: bm.team1, awayTeam: bm.team2, date: bm.date, status: bm.status, journee: phaseLabel, homeScore: bm.score1, awayScore: bm.score2 });
            }
        });
    });
    const allUpcoming = upcoming.concat(bracketUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date));

    const nextBody = document.getElementById('heroNextMatchBody');
    if (nextBody && allUpcoming.length > 0) {
        const m = allUpcoming[0];
        const heure = new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        nextBody.innerHTML = `
            <div class="hero-match-row">
                <span class="hero-team">${m.homeTeam}</span>
                <span class="hero-vs">${m.status === 'live' ? m.homeScore + ' - ' + m.awayScore : 'VS'}</span>
                <span class="hero-team hero-team-away">${m.awayTeam}</span>
            </div>
            <span class="hero-match-time">${m.journee ? m.journee + ' · ' : ''}${dateStr} · ${heure}</span>`;
    } else if (nextBody) {
        nextBody.innerHTML = '<div class="hero-card-placeholder">Aucun match a venir</div>';
    }

    // Last result
    const finished = scores.filter(s => s.status === 'finished').sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const resultBody = document.getElementById('heroLastResultBody');
    if (resultBody && finished.length > 0) {
        const m = finished[0];
        resultBody.innerHTML = `
            <div class="hero-match-row">
                <span class="hero-team">${m.homeTeam}</span>
                <span class="hero-vs">${m.homeScore} - ${m.awayScore}</span>
                <span class="hero-team hero-team-away">${m.awayTeam}</span>
            </div>
            <span class="hero-match-time">${m.journee || ''}</span>`;
    } else if (resultBody) {
        resultBody.innerHTML = '<div class="hero-card-placeholder">Aucun resultat</div>';
    }

    // Top scorer
    const buteurs = getClassementButeurs();
    const scorerBody = document.getElementById('heroTopScorerBody');
    if (scorerBody && buteurs.length > 0) {
        const top = buteurs[0];
        scorerBody.innerHTML = `
            <div class="hero-scorer-row">
                <div>
                    <div class="hero-scorer-name">${top.nom}</div>
                    <div class="hero-scorer-team">${top.equipe}</div>
                </div>
                <span class="hero-scorer-goals">${top.buts} <i class="fas fa-futbol"></i></span>
            </div>`;
    } else if (scorerBody) {
        scorerBody.innerHTML = '<div class="hero-card-placeholder">Aucun buteur</div>';
    }
}

// ===== NAVBAR =====
function initNavbar() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Secret : 5 clics rapides sur le logo pour afficher le bouton Admin
    let logoClicks = 0;
    let logoTimer = null;
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            logoClicks++;
            clearTimeout(logoTimer);
            logoTimer = setTimeout(() => { logoClicks = 0; }, 2000);
            if (logoClicks >= 5) {
                logoClicks = 0;
                const adminBtn = document.getElementById('adminToggle');
                if (adminBtn) {
                    adminBtn.style.display = 'inline-flex';
                    showToast('Mode admin disponible', 'info');
                }
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navbarH = document.querySelector('.navbar').offsetHeight;
                window.scrollTo({
                    top: target.offsetTop - navbarH,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Cache DOM references outside scroll handler
    const navbar = document.querySelector('.navbar');
    const scrollTopBtn = document.getElementById('scrollTop');
    const sections = document.querySelectorAll('section[id]');
    let scrollTicking = false;

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                if (scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }

                if (scrollY > 500) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }

                let current = '';
                sections.forEach(section => {
                    if (scrollY >= section.offsetTop - 100) {
                        current = section.getAttribute('id');
                    }
                });
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${current}`) {
                        link.classList.add('active');
                    }
                });
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== STATS - CALCULÉES EN TEMPS RÉEL =====
function updateRealStats() {
    const tournois = getData('tournois');
    const scores = getData('scores');
    const finishedMatches = scores.filter(s => s.status === 'finished');

    const nbTournois = tournois.length;
    const nbEquipes = tournois.reduce((sum, t) => sum + (parseInt(t.teams) || 0), 0);
    const nbMatchs = finishedMatches.length;
    const nbButs = finishedMatches.reduce((sum, s) => sum + (parseInt(s.homeScore) || 0) + (parseInt(s.awayScore) || 0), 0);

    document.getElementById('statTournois').dataset.target = nbTournois;
    document.getElementById('statEquipes').dataset.target = nbEquipes;
    document.getElementById('statMatchs').dataset.target = nbMatchs;
    document.getElementById('statButs').dataset.target = nbButs;
}

function initStatsAnimation() {
    updateRealStats();

    const statNumbers = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => observer.observe(el));
}

function refreshStats() {
    updateRealStats();
    document.getElementById('statTournois').textContent = document.getElementById('statTournois').dataset.target;
    document.getElementById('statEquipes').textContent = document.getElementById('statEquipes').dataset.target;
    document.getElementById('statMatchs').textContent = document.getElementById('statMatchs').dataset.target;
    document.getElementById('statButs').textContent = document.getElementById('statButs').dataset.target;
}

function animateCounter(el, target) {
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current = Math.min(Math.round(increment * step), target);
        el.textContent = current;
        if (step >= steps) {
            el.textContent = target;
            clearInterval(timer);
        }
    }, stepTime);
}

// ===== SECTION ANIMATIONS =====
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// ===== FORMAT HELPERS =====
function formatDate(dateStr) {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

function getLocalToday() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function getStatusBadge(status) {
    const badges = {
        upcoming: { class: 'badge-upcoming', text: 'À venir' },
        active: { class: 'badge-active', text: 'En cours' },
        finished: { class: 'badge-finished', text: 'Terminé' },
        live: { class: 'badge-active', text: 'En direct' }
    };
    const b = badges[status] || badges.upcoming;
    return `<span class="tournoi-badge ${b.class}">${b.text}</span>`;
}

function getMatchStatusBadge(status) {
    const badges = {
        upcoming: { class: 'status-upcoming', text: 'À venir' },
        live: { class: 'status-live', text: 'En direct' },
        finished: { class: 'status-finished', text: 'Terminé' }
    };
    const b = badges[status] || badges.upcoming;
    return `<span class="match-status ${b.class}">${b.text}</span>`;
}

// ===== RENDER TOURNOIS =====
function renderTournois() {
    const grid = document.getElementById('tournoiGrid');
    const empty = document.getElementById('tournoiEmpty');
    const tournois = getData('tournois');

    if (tournois.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = tournois.map(t => `
        <div class="tournoi-card">
            ${t.image

                ? `<div class="tournoi-card-image">
                    <img src="${t.image}" alt="${t.name}" loading="lazy">
                    ${getStatusBadge(t.status)}
                   </div>`
                : `<div class="tournoi-no-image">
                    <i class="fas fa-trophy"></i>
                    ${getStatusBadge(t.status)}
                   </div>`
            }
            <div class="tournoi-card-body">
                <h3>${t.name}</h3>
                <div class="tournoi-info">
                    <span><i class="far fa-calendar"></i> ${formatDate(t.startDate)} - ${formatDate(t.endDate)}</span>
                    <span><i class="fas fa-users"></i> ${t.teams} Équipes</span>
                    ${t.description ? `<span><i class="fas fa-info-circle"></i> ${t.description}</span>` : ''}
                </div>
                ${isAdmin ? `
                <div class="tournoi-card-actions">
                    <button class="btn btn-small btn-primary" onclick="editTournoi('${t.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteTournoi('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            </div>
        </div>
    `).join('');

    renderFooterTournois();
}

function renderFooterTournois() {
    const container = document.getElementById('footerTournois');
    const tournois = getData('tournois').slice(0, 3);
    container.innerHTML = tournois.map(t => `
        <div class="footer-tournoi-item">
            <i class="fas fa-futbol"></i>
            <span>${t.name}</span>
        </div>
    `).join('') || '<p style="color: rgba(255,255,255,0.5); font-size: 0.9rem;">Aucun tournoi</p>';
}

// ===== TOURNOI CRUD =====
async function saveTournoi(e) {
    e.preventDefault();
    const id = document.getElementById('tournoiId').value;
    const imageInput = document.getElementById('tournoiImage');
    let imageData = '';

    if (imageInput.files && imageInput.files[0]) {
        imageData = await fileToBase64(imageInput.files[0]);
    } else if (id) {
        const existing = getData('tournois').find(t => t.id === id);
        if (existing) imageData = existing.image;
    }

    const tournoi = {
        id: id || generateId(),
        name: document.getElementById('tournoiName').value,
        startDate: document.getElementById('tournoiStartDate').value,
        endDate: document.getElementById('tournoiEndDate').value,
        teams: parseInt(document.getElementById('tournoiTeams').value),
        status: document.getElementById('tournoiStatus').value,
        description: document.getElementById('tournoiDescription').value,
        image: imageData
    };

    let tournois = getData('tournois');
    if (id) {
        tournois = tournois.map(t => t.id === id ? tournoi : t);
        showToast('Tournoi modifié avec succès');
    } else {
        tournois.unshift(tournoi);
        showToast('Tournoi ajouté avec succès');
    }

    setData('tournois', tournois);
    addLog('tournoi', id ? `Tournoi modifié: ${tournoi.name}` : `Tournoi ajouté: ${tournoi.name}`);
    closeModal('tournoiModal');
    resetTournoiForm();
    renderTournois();
    updateMatchTournoiSelect();
    refreshStats();
    await syncAfterChange('tournois');
}

function editTournoi(id) {
    const tournoi = getData('tournois').find(t => t.id === id);
    if (!tournoi) return;

    document.getElementById('tournoiModalTitle').textContent = 'Modifier le Tournoi';
    document.getElementById('tournoiId').value = tournoi.id;
    document.getElementById('tournoiName').value = tournoi.name;
    document.getElementById('tournoiStartDate').value = tournoi.startDate;
    document.getElementById('tournoiEndDate').value = tournoi.endDate;
    document.getElementById('tournoiTeams').value = tournoi.teams;
    document.getElementById('tournoiStatus').value = tournoi.status;
    document.getElementById('tournoiDescription').value = tournoi.description || '';

    const preview = document.getElementById('tournoiImagePreview');
    if (tournoi.image) {
        preview.classList.add('has-image');
        preview.innerHTML = `<img src="${tournoi.image}" alt="Preview">`;
    }

    openModal('tournoiModal');
}

function deleteTournoi(id) {
    showConfirm('Êtes-vous sûr de vouloir supprimer ce tournoi ?', async () => {
        let tournois = getData('tournois').filter(t => t.id !== id);
        setData('tournois', tournois);
        addLog('tournoi', `Tournoi supprimé: ${id}`);
        renderTournois();
        updateMatchTournoiSelect();
        refreshStats();
        showToast('Tournoi supprimé', 'info');
        await syncAfterChange('tournois');
    });
}

function resetTournoiForm() {
    document.getElementById('tournoiForm').reset();
    document.getElementById('tournoiId').value = '';
    document.getElementById('tournoiModalTitle').textContent = 'Ajouter un Tournoi';
    const preview = document.getElementById('tournoiImagePreview');
    preview.classList.remove('has-image');
    preview.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Cliquez ou glissez une image</p>';
}

// ===== PARTAGE =====
// ===== LOGS =====
function addLog(type, message) {
    const logs = JSON.parse(localStorage.getItem('to_logs') || '[]');
    logs.unshift({ id: generateId(), ts: new Date().toISOString(), type, message });
    localStorage.setItem('to_logs', JSON.stringify(logs.slice(0, 100)));
}
function renderLogs() {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    const logs = JSON.parse(localStorage.getItem('to_logs') || '[]');
    container.innerHTML = logs.length ? logs.map(l => `
        <div class="log-row">
            <span class="log-time">${new Date(l.ts).toLocaleString('fr-FR')}</span>
            <span class="log-type">${l.type.toUpperCase()}</span>
            <span class="log-message">${l.message}</span>
        </div>
    `).join('') : '<p style="color:var(--gray-600)">Aucun log</p>';
}
function openLogs() {
    renderLogs();
    openModal('logsModal');
}
function clearLogs() {
    localStorage.removeItem('to_logs');
    renderLogs();
}

// ===== RENDER SCORES =====
let currentJournee = null;
let currentStatusFilter = 'auto'; // sera defini dans initSmartFilter()
let currentScoresSearch = '';
let favoriteTeams = [];

function getJournees(scores) {
    const journees = [];
    scores.forEach(s => {
        if (s.journee && !journees.includes(s.journee)) {
            journees.push(s.journee);
        }
    });
    journees.sort((a, b) => {
        const numA = parseInt(a.replace('J', ''));
        const numB = parseInt(b.replace('J', ''));
        return numA - numB;
    });
    return journees;
}

function renderJourneeNav() {
    const nav = document.getElementById('journeeNav');
    const scores = getData('scores');
    const journees = getJournees(scores);

    if (journees.length === 0) {
        nav.innerHTML = '';
        return;
    }

    if (!currentJournee) currentJournee = journees[journees.length - 1];

    nav.innerHTML = `
        <button class="journee-arrow" onclick="changeJournee(-1)">
            <i class="fas fa-chevron-left"></i>
        </button>
        <div class="journee-tabs" id="journeeTabs">
            ${journees.map(j => `
                <button class="journee-btn ${j === currentJournee ? 'active' : ''}" onclick="selectJournee('${j}')">
                    ${j}
                </button>
            `).join('')}
        </div>
        <button class="journee-arrow" onclick="changeJournee(1)">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    // Swipe mobile
    let touchStartX = 0;
    let touchEndX = 0;
    nav.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    nav.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const delta = touchEndX - touchStartX;
        if (Math.abs(delta) > 50) {
            changeJournee(delta > 0 ? -1 : 1);
        }
    }, { passive: true });
}

function selectJournee(journee) {
    currentJournee = journee;
    renderJourneeNav();
    renderScores();
}

function changeJournee(direction) {
    const scores = getData('scores');
    const journees = getJournees(scores);
    if (journees.length === 0) return;

    const idx = journees.indexOf(currentJournee);
    const newIdx = Math.max(0, Math.min(journees.length - 1, idx + direction));
    currentJournee = journees[newIdx];
    renderJourneeNav();
    renderScores();
}

function getBracketAsScores() {
    const data = getBracketData();
    const result = [];
    const phaseNames = { quarters: 'Quart', semis: 'Demi', final: 'Finale' };
    ['quarters', 'semis', 'final'].forEach(phase => {
        (data[phase] || []).forEach(m => {
            if (m.team1 || m.team2) {
                result.push({
                    id: 'bk_' + m.id,
                    homeTeam: m.team1 || 'A determiner',
                    awayTeam: m.team2 || 'A determiner',
                    homeScore: m.score1 || 0,
                    awayScore: m.score2 || 0,
                    date: m.date || '',
                    status: m.status || 'upcoming',
                    journee: phaseNames[phase],
                    buteurs: Array.isArray(m.buteurs) ? m.buteurs : [],
                    cartons: Array.isArray(m.cartons) ? m.cartons : [],
                    _isBracket: true,
                    _bracketId: m.id
                });
            }
        });
    });
    return result;
}

function renderScores() {
    const container = document.getElementById('scoresContainer');
    const empty = document.getElementById('scoreEmpty');
    const nav = document.getElementById('journeeNav');
    let scores = getData('scores').concat(getBracketAsScores());
    const today = getLocalToday();

    // Favorites filter FIRST
    if (currentStatusFilter === 'favorites') {
        if (favoriteTeams.length) {
            scores = scores.filter(s => favoriteTeams.includes(s.homeTeam) || favoriteTeams.includes(s.awayTeam));
        } else {
            scores = [];
        }
        nav.style.display = 'none';
    } else if (currentStatusFilter === 'today') {
        scores = scores.filter(s => s.status === 'live' || (s.date && s.date.split('T')[0] === today));
        nav.style.display = 'none';
    } else if (currentStatusFilter !== 'all') {
        scores = scores.filter(s => s.status === currentStatusFilter);
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }

    // Recherche équipe
    if (currentScoresSearch && currentScoresSearch.trim() !== '') {
        const q = currentScoresSearch.trim().toLowerCase();
        scores = scores.filter(s => s.homeTeam.toLowerCase().includes(q) || s.awayTeam.toLowerCase().includes(q));
    }

    if (scores.length === 0) {
        const filterMessages = {
            'live': '<i class="fas fa-broadcast-tower"></i><p>Aucun match en direct pour le moment</p>',
            'finished': '<i class="fas fa-flag-checkered"></i><p>Aucun match termine pour le moment</p>',
            'upcoming': '<i class="fas fa-clock"></i><p>Aucun match a venir</p>',
            'today': '<i class="fas fa-calendar-day"></i><p>Aucun match programme aujourd\'hui</p>',
            'favorites': '<i class="fas fa-star"></i><p>Aucun favori selectionne.<br><small>Cliquez sur l\'etoile a cote d\'une equipe pour l\'ajouter.</small></p>',
            'all': '<i class="fas fa-futbol"></i><p>Aucun match trouve</p>'
        };
        container.innerHTML = '';
        empty.innerHTML = filterMessages[currentStatusFilter] || filterMessages.all;
        empty.style.display = 'block';
        renderPreviousResults();
        return;
    }

    empty.style.display = 'none';
    const tournois = getData('tournois');
    window._scoreTeamNames = [];

    if (currentStatusFilter === 'all' && !currentScoresSearch) {
        // Sectioned display: LIVE, TODAY, then current journee
        const liveMatches = scores.filter(s => s.status === 'live');
        const todayMatches = scores.filter(s => s.status !== 'live' && s.date && s.date.split('T')[0] === today);
        const journeeMatches = currentJournee ? scores.filter(s => s.journee === currentJournee && s.status !== 'live' && !(s.date && s.date.split('T')[0] === today)) : [];

        let html = '';
        if (liveMatches.length > 0) {
            html += '<div class="scores-section scores-section-live"><h3 class="scores-section-title"><span class="live-dot"></span> En Direct</h3>';
            html += liveMatches.map(s => renderMatchCard(s, tournois, true)).join('');
            html += '</div>';
        }
        if (todayMatches.length > 0) {
            html += '<div class="scores-section scores-section-today"><h3 class="scores-section-title"><i class="fas fa-calendar-day"></i> Aujourd\'hui</h3>';
            html += todayMatches.map(s => renderMatchCard(s, tournois, true)).join('');
            html += '</div>';
        }
        if (journeeMatches.length > 0) {
            html += `<div class="scores-section scores-section-journee"><h3 class="scores-section-title"><i class="fas fa-layer-group"></i> ${currentJournee || 'Journée'}</h3>`;
            html += journeeMatches.map(s => renderMatchCard(s, tournois, true)).join('');
            html += '</div>';
        }
        if (html === '') {
            const fallback = currentJournee ? scores.filter(s => s.journee === currentJournee) : scores;
            if (fallback.length > 0) {
                html = fallback.map(s => renderMatchCard(s, tournois, true)).join('');
            } else {
                container.innerHTML = '';
                empty.style.display = 'block';
                renderPreviousResults();
                return;
            }
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = scores.map(s => renderMatchCard(s, tournois, false)).join('');
    }
    renderPreviousResults();
}

function renderMatchCard(s, tournois, showScorersAlways) {
    const tournoiName = s.tournoi ? (tournois.find(t => t.id === s.tournoi)?.name || '') : '';
    const isLive = s.status === 'live';
    const dateStr = s.date ? formatDate(s.date.split('T')[0]) : '';
    const heure = s.date ? new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const showJournee = currentStatusFilter !== 'all' && s.journee;
    const homeScorers = Array.isArray(s.buteurs) ? s.buteurs.filter(b => b.equipe === s.homeTeam) : [];
    const awayScorers = Array.isArray(s.buteurs) ? s.buteurs.filter(b => b.equipe === s.awayTeam) : [];
    const today = getLocalToday();
    const shouldShowScorers = showScorersAlways ||
        (currentStatusFilter === 'today' && s.date && s.date.split('T')[0] === today) ||
        (currentStatusFilter === 'all' && s.journee && s.journee === currentJournee) ||
        s.status === 'live' ||
        s.status === 'finished';

    const hiIdx = window._scoreTeamNames.length;
    window._scoreTeamNames.push(s.homeTeam);
    const aiIdx = window._scoreTeamNames.length;
    window._scoreTeamNames.push(s.awayTeam);

    const statusClass = s.status === 'live' ? 'match-card-live' : s.status === 'finished' ? 'match-card-finished' : 'match-card-upcoming';

    return `
    <div class="match-card ${isLive ? 'live' : ''} ${statusClass}">
        <div class="match-header">
            <span class="match-date">
                ${showJournee ? `<strong>${s.journee}</strong> &middot; ` : ''}
                <i class="far fa-calendar"></i> ${dateStr} &middot; ${heure}
            </span>
            ${tournoiName ? `<span class="match-tournoi-name">${tournoiName}</span>` : ''}
            ${getMatchStatusBadge(s.status)}
        </div>
        <div class="match-content">
            <div class="team team-home">
                <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                <span class="team-name team-name-link" onclick="openTeamModalByName(${hiIdx})">${s.homeTeam}</span>
                <button class="favorite-btn" title="Favori" onclick="toggleFavoriteTeam('${s.homeTeam}')">
                    <i class="${favoriteTeams.includes(s.homeTeam) ? 'fas fa-star' : 'far fa-star'}"></i>
                </button>
            </div>
            <div class="match-score">
                <span class="score">${s.status === 'upcoming' ? 'VS' : s.homeScore + ' - ' + s.awayScore}</span>
                ${isLive ? '<span class="live-indicator"><span class="live-pulse-dot"></span></span>' : ''}
            </div>
            <div class="team team-away">
                <span class="team-name team-name-link" onclick="openTeamModalByName(${aiIdx})">${s.awayTeam}</span>
                <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                <button class="favorite-btn" title="Favori" onclick="toggleFavoriteTeam('${s.awayTeam}')">
                    <i class="${favoriteTeams.includes(s.awayTeam) ? 'fas fa-star' : 'far fa-star'}"></i>
                </button>
            </div>
        </div>
        ${shouldShowScorers && (homeScorers.length || awayScorers.length) ? `
        <div class="match-scorers-pro">
            <div class="scorers-col scorers-home">
                ${homeScorers.length ? homeScorers.map(b => `
                    <div class="scorer-item">
                        <i class="fas fa-futbol scorer-icon"></i>
                        <span class="scorer-name">${b.nom}</span>
                        ${(parseInt(b.buts) || 1) > 1 ? `<span class="scorer-goals">x${b.buts}</span>` : ''}
                    </div>`).join('') : '<div class="scorer-none">—</div>'}
            </div>
            <div class="scorers-divider"></div>
            <div class="scorers-col scorers-away">
                ${awayScorers.length ? awayScorers.map(b => `
                    <div class="scorer-item scorer-item-away">
                        ${(parseInt(b.buts) || 1) > 1 ? `<span class="scorer-goals">x${b.buts}</span>` : ''}
                        <span class="scorer-name">${b.nom}</span>
                        <i class="fas fa-futbol scorer-icon"></i>
                    </div>`).join('') : '<div class="scorer-none">—</div>'}
            </div>
        </div>` : ''}
        ${(() => {
            const homeCartons = Array.isArray(s.cartons) ? s.cartons.filter(c => c.equipe === s.homeTeam) : [];
            const awayCartons = Array.isArray(s.cartons) ? s.cartons.filter(c => c.equipe === s.awayTeam) : [];
            return shouldShowScorers && (homeCartons.length || awayCartons.length) ? `
            <div class="match-cartons">
                <div class="cartons-col cartons-home">
                    ${homeCartons.map(c => `<div class="carton-item"><span class="carton-icone carton-${c.type}"></span><span class="scorer-name">${c.nom}</span></div>`).join('')}
                </div>
                <div class="scorers-divider"></div>
                <div class="cartons-col cartons-away">
                    ${awayCartons.map(c => `<div class="carton-item carton-item-away"><span class="scorer-name">${c.nom}</span><span class="carton-icone carton-${c.type}"></span></div>`).join('')}
                </div>
            </div>` : '';
        })()}
        ${s.status === 'upcoming' || s.status === 'live' ? renderH2HBlock(s.homeTeam, s.awayTeam) : ''}
        ${isAdmin ? `
        <div class="match-footer">
            ${s._isBracket ? `
            <button class="btn btn-small btn-primary" onclick="editBracketMatch('${s._bracketId}')">
                <i class="fas fa-edit"></i> Modifier
            </button>` : `
            <button class="btn btn-small btn-primary" onclick="editScore('${s.id}')">
                <i class="fas fa-edit"></i> Modifier
            </button>
            ${s.status === 'live' ? `
            <button class="btn btn-small btn-secondary" onclick="updateLiveScore('${s.id}','home',1)">+1 ${s.homeTeam}</button>
            <button class="btn btn-small btn-secondary" onclick="updateLiveScore('${s.id}','away',1)">+1 ${s.awayTeam}</button>
            <button class="btn btn-small btn-danger" onclick="finishLiveMatch('${s.id}')">Terminer</button>` : ''}
            <button class="btn btn-small btn-danger" onclick="deleteScore('${s.id}')">
                <i class="fas fa-trash"></i>
            </button>`}
        </div>` : ''}
    </div>`;
}

// ===== HISTORIQUE DES RÉSULTATS =====
function renderPreviousResults() {
    const container = document.getElementById('previousResultsContainer');
    const title = container ? container.previousElementSibling : null;
    if (!container) return;

    // Only show previous results in "finished" or "all" mode
    if (currentStatusFilter !== 'all' && currentStatusFilter !== 'finished') {
        container.innerHTML = '';
        container.style.display = 'none';
        if (title && title.classList.contains('section-subtitle')) title.style.display = 'none';
        return;
    }

    container.style.display = '';
    if (title && title.classList.contains('section-subtitle')) title.style.display = '';

    const all = getData('scores');
    const finished = all
        .filter(s => s.status === 'finished')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 10);
    if (finished.length === 0) {
        container.innerHTML = '';
        if (title && title.classList.contains('section-subtitle')) title.style.display = 'none';
        return;
    }
    const tournois = getData('tournois');
    container.innerHTML = finished.map(s => {
        const tournoiName = s.tournoi ? (tournois.find(t => t.id === s.tournoi)?.name || '') : '';
        const dateStr = s.date ? formatDate(s.date.split('T')[0]) : '';
        const heure = s.date ? new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
        <div class="match-card">
            <div class="match-header">
                <span class="match-date"><i class="far fa-calendar"></i> ${dateStr} &middot; ${heure}</span>
                ${tournoiName ? `<span class="match-tournoi-name">${tournoiName}</span>` : ''}
                ${getMatchStatusBadge('finished')}
            </div>
            <div class="match-content">
                <div class="team team-home">
                    <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                    <span class="team-name">${s.homeTeam}</span>
                </div>
                <div class="match-score"><span class="score">${s.homeScore} - ${s.awayScore}</span></div>
                <div class="team team-away">
                    <span class="team-name">${s.awayTeam}</span>
                    <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ===== BUTEURS FORMULAIRE VISUEL =====
function ajouterButeur(side) {
    const homeTeam = document.getElementById('homeTeam').value || 'Domicile';
    const awayTeam = document.getElementById('awayTeam').value || 'Extérieur';
    // Mettre à jour les titres dynamiquement
    document.getElementById('buteurs-home-title').textContent = homeTeam;
    document.getElementById('buteurs-away-title').textContent = awayTeam;
    updateRosterDatalists(homeTeam, awayTeam);
    ajouterButeurLigne(side, '', 1);
}

function ajouterButeurLigne(side, nom, buts) {
    const listId = side === 'home' ? 'buteursHomeList' : 'buteursAwayList';
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'buteur-row';
    row.innerHTML = `
        <input type="text" class="buteur-nom" placeholder="Nom du joueur" value="${nom || ''}" list="${side === 'home' ? 'homeRosterDatalist' : 'awayRosterDatalist'}">
        <input type="number" class="buteur-buts" min="1" max="20" value="${buts || 1}" title="Nombre de buts">
        <button type="button" class="btn-remove-buteur" onclick="this.parentElement.remove()" title="Supprimer">
            <i class="fas fa-times"></i>
        </button>`;
    list.appendChild(row);
    row.querySelector('.buteur-nom').focus();
}

function viderButeursFormulaire() {
    document.getElementById('buteursHomeList').innerHTML = '';
    document.getElementById('buteursAwayList').innerHTML = '';
}

function lireButeursFormulaire() {
    const buteurs = [];
    const homeTeam = document.getElementById('homeTeam').value;
    const awayTeam = document.getElementById('awayTeam').value;

    document.querySelectorAll('#buteursHomeList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const buts = parseInt(row.querySelector('.buteur-buts').value) || 1;
        if (nom) {
            buteurs.push({ nom, buts, equipe: homeTeam });
            addPlayerToRoster(homeTeam, nom);
        }
    });

    document.querySelectorAll('#buteursAwayList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const buts = parseInt(row.querySelector('.buteur-buts').value) || 1;
        if (nom) {
            buteurs.push({ nom, buts, equipe: awayTeam });
            addPlayerToRoster(awayTeam, nom);
        }
    });

    return buteurs;
}

function getRosters() {
    try { return JSON.parse(localStorage.getItem('to_rosters') || '{}'); } catch(e) { return {}; }
}
function setRosters(obj) {
    localStorage.setItem('to_rosters', JSON.stringify(obj));
}
function getRoster(team) {
    const r = getRosters();
    return Array.isArray(r[team]) ? r[team] : [];
}
function addPlayerToRoster(team, player) {
    if (!team || !player) return;
    const r = getRosters();
    const list = Array.isArray(r[team]) ? r[team] : [];
    if (!list.includes(player)) list.push(player);
    r[team] = list;
    setRosters(r);
}
function updateRosterDatalists(homeTeam, awayTeam) {
    const homeList = document.getElementById('homeRosterDatalist');
    const awayList = document.getElementById('awayRosterDatalist');
    if (homeList) homeList.innerHTML = getRoster(homeTeam).map(n => `<option value="${n}"></option>`).join('');
    if (awayList) awayList.innerHTML = getRoster(awayTeam).map(n => `<option value="${n}"></option>`).join('');
}
function initRosterAutocomplete() {
    const homeInput = document.getElementById('homeTeam');
    const awayInput = document.getElementById('awayTeam');
    const update = () => { updateRosterDatalists(homeInput.value, awayInput.value); if (typeof updateChips === 'function') updateChips(); };
    if (homeInput) homeInput.addEventListener('input', update);
    if (awayInput) awayInput.addEventListener('input', update);
}

// Mise à jour dynamique des titres buteurs quand on tape les équipes
document.addEventListener('DOMContentLoaded', () => {
    const homeTeamInput = document.getElementById('homeTeam');
    const awayTeamInput = document.getElementById('awayTeam');
    if (homeTeamInput) {
        homeTeamInput.addEventListener('input', () => {
            document.getElementById('buteurs-home-title').textContent = homeTeamInput.value || 'Domicile';
            document.getElementById('cartons-home-title').textContent = homeTeamInput.value || 'Domicile';
        });
    }
    if (awayTeamInput) {
        awayTeamInput.addEventListener('input', () => {
            document.getElementById('buteurs-away-title').textContent = awayTeamInput.value || 'Extérieur';
            document.getElementById('cartons-away-title').textContent = awayTeamInput.value || 'Exterieur';
        });
    }

    // Dynamic bracket buteur titles + chips
    const bTeam1 = document.getElementById('bracketTeam1');
    const bTeam2 = document.getElementById('bracketTeam2');
    if (bTeam1) {
        bTeam1.addEventListener('input', () => {
            document.getElementById('bracket-buteurs-home-title').textContent = bTeam1.value || 'Equipe 1';
            document.getElementById('bracket-cartons-home-title').textContent = bTeam1.value || 'Equipe 1';
            updateBracketChips(bTeam1.value || '', (bTeam2 ? bTeam2.value : '') || '');
        });
    }
    if (bTeam2) {
        bTeam2.addEventListener('input', () => {
            document.getElementById('bracket-buteurs-away-title').textContent = bTeam2.value || 'Equipe 2';
            document.getElementById('bracket-cartons-away-title').textContent = bTeam2.value || 'Equipe 2';
            updateBracketChips((bTeam1 ? bTeam1.value : '') || '', bTeam2.value || '');
        });
    }
});

// ===== SCORE CRUD =====
function updateMatchTournoiSelect() {
    const select = document.getElementById('matchTournoi');
    const tournois = getData('tournois');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Sélectionner un tournoi --</option>' +
        tournois.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    select.value = currentVal;
}

async function saveScore(e) {
    e.preventDefault();
    const id = document.getElementById('scoreId').value;

    // Garder la journee si on modifie un match existant
    let existingJournee = '';
    if (id) {
        const existing = getData('scores').find(s => s.id === id);
        if (existing) existingJournee = existing.journee || '';
    }

    // Récupérer les buteurs depuis le formulaire visuel
    const buteurs = lireButeursFormulaire();
    const cartons = lireCartonsFormulaire();

    const score = {
        id: id || generateId(),
        homeTeam: document.getElementById('homeTeam').value,
        awayTeam: document.getElementById('awayTeam').value,
        homeScore: parseInt(document.getElementById('homeScore').value) || 0,
        awayScore: parseInt(document.getElementById('awayScore').value) || 0,
        date: document.getElementById('matchDate').value,
        status: document.getElementById('matchStatus').value,
        tournoi: document.getElementById('matchTournoi').value,
        journee: (document.getElementById('matchJournee') ? document.getElementById('matchJournee').value : '') || existingJournee,
        buteurs: buteurs,
        cartons: cartons
    };

    let scores = getData('scores');
    if (id) {
        scores = scores.map(s => s.id === id ? score : s);
        showToast('Match modifié avec succès');
    } else {
        scores.unshift(score);
        showToast('Match ajouté avec succès');
    }

    setData('scores', scores);
    addLog('score', id ? `Score modifié: ${score.homeTeam} ${score.homeScore}-${score.awayScore} ${score.awayTeam}` : `Match ajouté: ${score.homeTeam} vs ${score.awayTeam} (${score.status})`);

    // Notification score
    if (score.status === 'live') {
        envoyerNotification('⚽ Match en direct !', `${score.homeTeam} vs ${score.awayTeam} — ${score.journee || ''}`);
    } else if (score.status === 'finished') {
        envoyerNotification('🏁 Résultat', `${score.homeTeam} ${score.homeScore} - ${score.awayScore} ${score.awayTeam}`);
    }

    closeModal('scoreModal');
    resetScoreForm();
    renderScores();
    renderStandings();
    renderButeurs();
    refreshStats();
    initHeroCards();
    // Sync scores + standings together
    if (isAdmin) {
        const ok1 = await saveToCloud('scores');
        const ok2 = await saveToCloud('standings');
        if (ok1 && ok2) {
            showToast('Scores + classement en ligne ✓ (visible par tous)', 'success');
        } else if (!ok1 && !ok2) {
            showToast('⚠ Échec sync cloud — réessayez avec Synchroniser', 'error');
        } else {
            showToast('⚠ Sync partielle — cliquez Synchroniser pour tout envoyer', 'error');
        }
    }
}

function editScore(id) {
    const score = getData('scores').find(s => s.id === id);
    if (!score) return;

    document.getElementById('scoreModalTitle').textContent = 'Modifier le Match';
    document.getElementById('scoreId').value = score.id;
    document.getElementById('homeTeam').value = score.homeTeam;
    document.getElementById('awayTeam').value = score.awayTeam;
    document.getElementById('homeScore').value = score.homeScore;
    document.getElementById('awayScore').value = score.awayScore;
    document.getElementById('matchDate').value = score.date;
    document.getElementById('matchStatus').value = score.status;
    document.getElementById('matchTournoi').value = score.tournoi || '';
    const journeeInput = document.getElementById('matchJournee');
    if (journeeInput) journeeInput.value = score.journee || '';

    // Mettre à jour les titres des colonnes buteurs
    document.getElementById('buteurs-home-title').textContent = score.homeTeam || 'Domicile';
    document.getElementById('buteurs-away-title').textContent = score.awayTeam || 'Extérieur';
    updateRosterDatalists(score.homeTeam, score.awayTeam);
    if (typeof updateChips === 'function') updateChips();

    // Pré-remplir les buteurs
    viderButeursFormulaire();
    if (score.buteurs && score.buteurs.length > 0) {
        score.buteurs.forEach(b => {
            const side = b.equipe === score.homeTeam ? 'home' : 'away';
            ajouterButeurLigne(side, b.nom, b.buts);
        });
    }

    // Pré-remplir les cartons
    viderCartonsFormulaire();
    document.getElementById('cartons-home-title').textContent = score.homeTeam || 'Domicile';
    document.getElementById('cartons-away-title').textContent = score.awayTeam || 'Exterieur';
    if (Array.isArray(score.cartons)) {
        score.cartons.forEach(c => {
            const side = c.equipe === score.homeTeam ? 'home' : 'away';
            ajouterCartonLigne(side, c.nom, c.type);
        });
    }

    openModal('scoreModal');
}

function deleteScore(id) {
    showConfirm('Êtes-vous sûr de vouloir supprimer ce match ?', async () => {
        let scores = getData('scores').filter(s => s.id !== id);
        setData('scores', scores);
        addLog('score', `Match supprimé: ${id}`);
        renderScores();
        renderStandings();
        renderButeurs();
        refreshStats();
        initHeroCards();
        showToast('Match supprimé', 'info');
        if (isAdmin) {
            const ok1 = await saveToCloud('scores');
            const ok2 = await saveToCloud('standings');
            if (ok1 && ok2) showToast('Suppression en ligne ✓', 'success');
            else showToast('⚠ Sync cloud échouée — cliquez Synchroniser', 'error');
        }
    });
}

function resetScoreForm() {
    document.getElementById('scoreForm').reset();
    document.getElementById('scoreId').value = '';
    const jInput = document.getElementById('matchJournee');
    if (jInput) jInput.value = '';
    document.getElementById('scoreModalTitle').textContent = 'Ajouter un Match';
    document.getElementById('homeScore').value = 0;
    document.getElementById('awayScore').value = 0;
    document.getElementById('buteurs-home-title').textContent = 'Domicile';
    document.getElementById('buteurs-away-title').textContent = 'Extérieur';
    viderButeursFormulaire();
    viderCartonsFormulaire();
    document.getElementById('cartons-home-title').textContent = 'Domicile';
    document.getElementById('cartons-away-title').textContent = 'Exterieur';
    updateRosterDatalists(document.getElementById('homeTeam').value, document.getElementById('awayTeam').value);
}

function openRosterModal() {
    const teamInput = document.getElementById('rosterTeamName');
    const list = document.getElementById('rosterList');
    const home = document.getElementById('homeTeam') ? document.getElementById('homeTeam').value : '';
    const away = document.getElementById('awayTeam') ? document.getElementById('awayTeam').value : '';
    if (teamInput && !teamInput.value) teamInput.value = home || away || '';
    const team = teamInput ? teamInput.value : '';
    const roster = getRoster(team);
    if (list) {
        list.innerHTML = roster.map(name => `
            <div class="roster-item">
                <span>${name}</span>
                <button class="remove" onclick="removeRosterPlayer('${team}','${name}')"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
    openModal('rosterModal');
}
function addRosterPlayer() {
    const team = document.getElementById('rosterTeamName').value.trim();
    const input = document.getElementById('rosterPlayerInput');
    const name = input.value.trim();
    if (!team || !name) return;
    addPlayerToRoster(team, name);
    input.value = '';
    openRosterModal();
}
function removeRosterPlayer(team, name) {
    const r = getRosters();
    const list = Array.isArray(r[team]) ? r[team] : [];
    const idx = list.indexOf(name);
    if (idx >= 0) list.splice(idx, 1);
    r[team] = list;
    setRosters(r);
    openRosterModal();
}
// ===== SYNC ROSTERS FROM SCORES =====
function syncRostersFromScores() {
    const scores = getData('scores');
    scores.forEach(s => {
        if (!s.buteurs) return;
        s.buteurs.forEach(b => {
            if (b.nom && b.equipe) addPlayerToRoster(b.equipe, b.nom);
        });
    });
}

// ===== PLAYER CHIPS =====
function renderPlayerChips(side) {
    const teamInput = document.getElementById(side === 'home' ? 'homeTeam' : 'awayTeam');
    const team = teamInput ? teamInput.value : '';
    const container = document.getElementById(side === 'home' ? 'chips-home' : 'chips-away');
    if (!container) return;
    const roster = getRoster(team);
    if (roster.length === 0) {
        container.innerHTML = '<span class="chips-empty">Aucun joueur connu</span>';
        return;
    }
    container.innerHTML = roster.map(name =>
        `<button type="button" class="player-chip" onclick="chipAddButeur('${side}','${name.replace(/'/g, "\\\'")}')"><i class="fas fa-plus-circle"></i> ${name}</button>`
    ).join('');
}

function chipAddButeur(side, playerName) {
    const listId = side === 'home' ? 'buteursHomeList' : 'buteursAwayList';
    const list = document.getElementById(listId);
    const existingRows = list.querySelectorAll('.buteur-row');
    for (const row of existingRows) {
        const nomInput = row.querySelector('.buteur-nom');
        if (nomInput && nomInput.value.trim() === playerName) {
            const butsInput = row.querySelector('.buteur-buts');
            butsInput.value = (parseInt(butsInput.value) || 1) + 1;
            butsInput.classList.add('chip-flash');
            setTimeout(() => butsInput.classList.remove('chip-flash'), 300);
            return;
        }
    }
    ajouterButeurLigne(side, playerName, 1);
}

function updateChips() {
    renderPlayerChips('home');
    renderPlayerChips('away');
}

// ===== SCORE FILTERS =====
function initSmartFilter() {
    const scores = getData('scores');
    const today = getLocalToday();
    const hasLive = scores.some(s => s.status === 'live');
    const hasToday = scores.some(s => s.date && s.date.split('T')[0] === today);

    if (hasLive || hasToday) {
        currentStatusFilter = 'today';
    } else {
        currentStatusFilter = 'all';
    }

    // Mettre a jour le bouton actif
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === currentStatusFilter) btn.classList.add('active');
    });
}

function initScoreFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Quick visual feedback before render
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentStatusFilter = this.dataset.filter;
            renderScores();
            renderLiveTicker();
        });
    });
    const input = document.getElementById('rechercheScoresInput');
    if (input) {
        const debouncedSearch = debounce(() => {
            currentScoresSearch = input.value;
            renderScores();
        }, 200);
        input.addEventListener('input', debouncedSearch);
    }
    initRosterAutocomplete();
}

// ===== FAVORIS =====
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('to_favorites') || '[]'); } catch(e) { return []; }
}
function setFavorites(arr) {
    favoriteTeams = Array.from(new Set(arr));
    localStorage.setItem('to_favorites', JSON.stringify(favoriteTeams));
}
function toggleFavoriteTeam(team) {
    const favs = getFavorites();
    const idx = favs.indexOf(team);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(team);
    setFavorites(favs);
    renderScores();
}

// ===== GLOBAL SEARCH =====
function initRechercheGlobale() {
    const input = document.getElementById('rechercheGlobalInput');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            currentStatusFilter = 'all';
            currentScoresSearch = input.value;
            renderJourneeNav();
            renderScores();
            window.location.hash = '#scores';
        }
    });
}

// ===== ICS CALENDAR =====
function buildICSLink(s) {
    const dt = new Date(s.date);
    const pad = (n) => String(n).padStart(2, '0');
    const toICSDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const end = new Date(dt.getTime() + 90*60000);
    const title = `${s.homeTeam} vs ${s.awayTeam}`;
    const body = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Taourirt-Ouablaa//Match//FR',
        'BEGIN:VEVENT',
        `UID:${s.id}@taourirt-ouablaa`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(dt)}`,
        `DTEND:${toICSDate(end)}`,
        `SUMMARY:${title}`,
        'DESCRIPTION:Match du tournoi Taourirt-Ouablaa',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
}

// ===== LIVE TICKER =====
function renderLiveTicker() {
    const bar = document.getElementById('liveTicker');
    const lives = getData('scores').filter(s => s.status === 'live');
    if (!bar) return;
    if (lives.length === 0) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }
    bar.style.display = 'flex';
    bar.innerHTML = `<span class="dot"></span>` + lives.map(s => `${s.homeTeam} ${s.homeScore} - ${s.awayScore} ${s.awayTeam}`).join(' · ');
}

function updateLiveScore(id, side, delta) {
    let scores = getData('scores');
    scores = scores.map(s => {
        if (s.id === id) {
            if (side === 'home') s.homeScore = (parseInt(s.homeScore)||0) + delta;
            if (side === 'away') s.awayScore = (parseInt(s.awayScore)||0) + delta;
        }
        return s;
    });
    setData('scores', scores);
    renderScores();
    renderLiveTicker();
    refreshStats();
}
function finishLiveMatch(id) {
    let scores = getData('scores');
    scores = scores.map(s => s.id === id ? { ...s, status: 'finished' } : s);
    setData('scores', scores);
    renderScores();
    renderStandings();
    renderLiveTicker();
    refreshStats();
}

// ===== RENDER NEWS =====
function renderNews() {
    const grid = document.getElementById('actualitesGrid');
    const empty = document.getElementById('newsEmpty');
    const news = getData('news');

    if (news.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = news.map(n => `
        <article class="news-card">
            ${n.image
                ? `<div class="news-image">
                    <img src="${n.image}" alt="${n.title}" loading="lazy">
                    <span class="news-badge">${n.category}</span>
                   </div>`
                : `<div class="news-no-image">
                    <i class="fas fa-newspaper"></i>
                   </div>`
            }
            <div class="news-content">
                <div class="news-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(n.date)}</span>
                    <span><i class="fas fa-tag"></i> ${n.category}</span>
                </div>
                <h3>${n.title}</h3>
                <p>${n.content}</p>
                ${isAdmin ? `
                <div class="news-card-actions">
                    <button class="btn btn-small btn-primary" onclick="editNews('${n.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteNews('${n.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            </div>
        </article>
    `).join('');
}

// ===== NEWS CRUD =====
async function saveNews(e) {
    e.preventDefault();
    const id = document.getElementById('newsId').value;
    const imageInput = document.getElementById('newsImage');
    let imageData = '';

    if (imageInput.files && imageInput.files[0]) {
        imageData = await fileToBase64(imageInput.files[0]);
    } else if (id) {
        const existing = getData('news').find(n => n.id === id);
        if (existing) imageData = existing.image;
    }

    const newsItem = {
        id: id || generateId(),
        title: document.getElementById('newsTitle').value,
        category: document.getElementById('newsCategory').value,
        content: document.getElementById('newsContent').value,
        date: document.getElementById('newsDate').value || new Date().toISOString().split('T')[0],
        image: imageData
    };

    let news = getData('news');
    if (id) {
        news = news.map(n => n.id === id ? newsItem : n);
        showToast('Actualité modifiée avec succès');
    } else {
        news.unshift(newsItem);
        showToast('Actualité publiée avec succès');
    }

    setData('news', news);
    closeModal('newsModal');
    resetNewsForm();
    // renderNews(); // section actualites supprimee
    await syncAfterChange('news');
}

function editNews(id) {
    const newsItem = getData('news').find(n => n.id === id);
    if (!newsItem) return;

    document.getElementById('newsModalTitle').textContent = "Modifier l'Actualité";
    document.getElementById('newsId').value = newsItem.id;
    document.getElementById('newsTitle').value = newsItem.title;
    document.getElementById('newsCategory').value = newsItem.category;
    document.getElementById('newsContent').value = newsItem.content;
    document.getElementById('newsDate').value = newsItem.date || '';

    const preview = document.getElementById('newsImagePreview');
    if (newsItem.image) {
        preview.classList.add('has-image');
        preview.innerHTML = `<img src="${newsItem.image}" alt="Preview">`;
    }

    openModal('newsModal');
}

function deleteNews(id) {
    showConfirm('Êtes-vous sûr de vouloir supprimer cette actualité ?', async () => {
        let news = getData('news').filter(n => n.id !== id);
        setData('news', news);
        // renderNews(); // section actualites supprimee
        showToast('Actualité supprimée', 'info');
        await syncAfterChange('news');
    });
}

function resetNewsForm() {
    document.getElementById('newsForm').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('newsModalTitle').textContent = 'Ajouter une Actualité';
    const preview = document.getElementById('newsImagePreview');
    preview.classList.remove('has-image');
    preview.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Cliquez ou glissez une image</p>';
}

// ===== RENDER GALLERY =====
function renderGallery() {
    const grid = document.getElementById('galerieGrid');
    const empty = document.getElementById('galerieEmpty');
    if (!grid) return; // Skip if gallery section doesn't exist
    const photos = getData('gallery');

    if (photos.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    grid.innerHTML = photos.map((p, i) => `
        <div class="galerie-item" onclick="openLightbox(${i})">
            <img src="${p.src}" alt="${p.title || 'Photo'}" loading="lazy">
            <div class="galerie-overlay">
                <i class="fas fa-search-plus"></i>
                ${p.title ? `<span>${p.title}</span>` : ''}
            </div>
            ${isAdmin ? `
            <button class="btn btn-icon btn-danger galerie-delete" onclick="event.stopPropagation(); deletePhoto('${p.id}')" style="display:${isAdmin ? 'flex' : 'none'}">
                <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
    `).join('');
}

// ===== GALLERY CRUD =====
async function saveGalleryPhotos(e) {
    e.preventDefault();
    const imageInput = document.getElementById('galleryImages');
    const title = document.getElementById('galleryPhotoTitle').value;

    if (!imageInput.files || imageInput.files.length === 0) {
        showToast('Veuillez sélectionner au moins une image', 'error');
        return;
    }

    let gallery = getData('gallery');

    for (const file of imageInput.files) {
        const base64 = await fileToBase64(file);
        gallery.push({
            id: generateId(),
            src: base64,
            title: title || file.name.replace(/\.[^/.]+$/, '')
        });
    }

    setData('gallery', gallery);
    closeModal('galleryModal');
    resetGalleryForm();
    renderGallery();
    showToast(`${imageInput.files.length} photo(s) ajoutée(s)`);
    await syncAfterChange('gallery');
}

function deletePhoto(id) {
    showConfirm('Êtes-vous sûr de vouloir supprimer cette photo ?', async () => {
        let gallery = getData('gallery').filter(p => p.id !== id);
        setData('gallery', gallery);
        renderGallery();
        showToast('Photo supprimée', 'info');
        await syncAfterChange('gallery');
    });
}

function resetGalleryForm() {
    const form = document.getElementById('galleryForm');
    if (form) form.reset();
    const preview = document.getElementById('galleryImagesPreview');
    if (preview) {
        preview.classList.remove('has-image');
        preview.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Cliquez ou glissez des images</p>';
    }
}

// ===== LIGHTBOX =====
let currentLightboxIndex = 0;

function openLightbox(index) {
    const photos = getData('gallery');
    if (photos.length === 0) return;

    currentLightboxIndex = index;
    const photo = photos[index];

    document.getElementById('lightboxImage').src = photo.src;
    document.getElementById('lightboxCaption').textContent = photo.title || '';
    document.getElementById('lightboxCounter').textContent = `${index + 1} / ${photos.length}`;
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    const photos = getData('gallery');
    currentLightboxIndex = (currentLightboxIndex + direction + photos.length) % photos.length;
    const photo = photos[currentLightboxIndex];

    document.getElementById('lightboxImage').src = photo.src;
    document.getElementById('lightboxCaption').textContent = photo.title || '';
    document.getElementById('lightboxCounter').textContent = `${currentLightboxIndex + 1} / ${photos.length}`;
}

document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
});

// ===== RECALCUL AUTOMATIQUE DU CLASSEMENT =====
function recalculerClassementDepuisScores() {
    const scores = getData('scores');
    const standings = getStandingsData();

    // Remettre toutes les stats à zéro
    ['A', 'B', 'C', 'D'].forEach(group => {
        standings[group].forEach(team => {
            team.mj = 0; team.v = 0; team.n = 0; team.d = 0; team.bp = 0; team.bc = 0;
            // image preserved intentionally
        });
    });

    // Pour chaque match terminé, mettre à jour les deux équipes
    scores.filter(s => s.status === 'finished').forEach(s => {
        const home = parseInt(s.homeScore) || 0;
        const away = parseInt(s.awayScore) || 0;

        ['A', 'B', 'C', 'D'].forEach(group => {
            const homeTeam = standings[group].find(t => t.team === s.homeTeam);
            const awayTeam = standings[group].find(t => t.team === s.awayTeam);

            if (homeTeam) {
                homeTeam.mj++;
                homeTeam.bp += home;
                homeTeam.bc += away;
                if (home > away) homeTeam.v++;
                else if (home === away) homeTeam.n++;
                else homeTeam.d++;
            }

            if (awayTeam) {
                awayTeam.mj++;
                awayTeam.bp += away;
                awayTeam.bc += home;
                if (away > home) awayTeam.v++;
                else if (away === home) awayTeam.n++;
                else awayTeam.d++;
            }
        });
    });

    setStandingsData(standings);
}

// Bouton admin : recalculer et afficher
async function recalculerEtAfficher() {
    recalculerClassementDepuisScores();
    _lastRecalcTs = Date.now(); // eviter double recalcul dans renderStandings
    renderStandings();
    showToast('Classement recalculé avec succès', 'success');
    await syncAfterChange('standings');
}

// ===== CLASSEMENT DES BUTEURS =====
function getClassementButeurs() {
    const scores = getData('scores');
    const buteursMap = {};

    scores.forEach(s => {
        if (!s.buteurs) return;
        s.buteurs.forEach(b => {
            const key = b.nom + '||' + b.equipe;
            if (!buteursMap[key]) {
                buteursMap[key] = { nom: b.nom, equipe: b.equipe, buts: 0 };
            }
            buteursMap[key].buts += (parseInt(b.buts) || 1);
        });
    });

    // Ajouter les buteurs du bracket (phases eliminatoires)
    const bracketData = getBracketData();
    ['quarters', 'semis', 'final'].forEach(phase => {
        (bracketData[phase] || []).forEach(m => {
            if (!Array.isArray(m.buteurs)) return;
            m.buteurs.forEach(b => {
                const key = b.nom + '||' + b.equipe;
                if (!buteursMap[key]) {
                    buteursMap[key] = { nom: b.nom, equipe: b.equipe, buts: 0 };
                }
                buteursMap[key].buts += (parseInt(b.buts) || 1);
            });
        });
    });

    return Object.values(buteursMap).sort((a, b) => b.buts - a.buts);
}

let buteursShowAll = false;

function renderButeurs(filterText) {
    const container = document.getElementById('buteursContainer');
    if (!container) return;
    let buteurs = getClassementButeurs();

    // Filtre recherche
    if (filterText && filterText.trim() !== '') {
        const q = filterText.trim().toLowerCase();
        buteurs = buteurs.filter(b => b.nom.toLowerCase().includes(q) || b.equipe.toLowerCase().includes(q));
    }

    if (buteurs.length === 0) {
        container.innerHTML = '<p class="empty-message"><i class="fas fa-futbol"></i> Aucun buteur enregistré</p>';
        return;
    }

    const LIMIT = 5;
    const showAll = buteursShowAll || (filterText && filterText.trim() !== '');
    const displayed = showAll ? buteurs : buteurs.slice(0, LIMIT);
    const hasMore = buteurs.length > LIMIT;

    container.innerHTML = `
        <div class="buteurs-table-wrapper">
            <table class="standings-table buteurs-table">
                <thead>
                    <tr>
                        <th class="col-rank">#</th>
                        <th class="col-team">Joueur</th>
                        <th>Équipe</th>
                        <th class="col-pts">Buts</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayed.map((b, i) => `
                    <tr class="${i === 0 && !filterText ? 'qualified-row' : ''}">
                        <td class="col-rank">
                            <span class="rank-num ${i === 0 && !filterText ? 'qualified' : ''}">${i + 1}</span>
                        </td>
                        <td class="col-team">
                            ${i === 0 && !filterText ? '<i class="fas fa-crown" style="color:#f59e0b;margin-right:5px;"></i>' : ''}
                            ${b.nom}
                        </td>
                        <td>${b.equipe}</td>
                        <td class="col-pts"><strong>${b.buts}</strong></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${hasMore && !filterText ? `
        <div style="text-align:center;margin-top:1rem;">
            <button class="btn-voir-plus-buteurs" onclick="toggleButeurs()">
                ${showAll
                    ? '<i class="fas fa-chevron-up"></i> Voir moins'
                    : `<i class="fas fa-chevron-down"></i> Voir tous les buteurs (${buteurs.length})`}
            </button>
        </div>` : ''}`;
}

function toggleButeurs() {
    buteursShowAll = !buteursShowAll;
    const searchVal = document.getElementById('rechercheButeursInput') ? document.getElementById('rechercheButeursInput').value : '';
    renderButeurs(searchVal);
}

function initRechercheButeurs() {
    const input = document.getElementById('rechercheButeursInput');
    if (!input) return;
    const debouncedSearch = debounce(() => {
        buteursShowAll = false;
        renderButeurs(input.value);
    }, 200);
    input.addEventListener('input', debouncedSearch);
}

// ===== STANDINGS / CLASSEMENT =====
function getStandingsData() {
    const data = localStorage.getItem('to_standings');
    if (data) {
        const parsed = JSON.parse(data);
        // Vérifier que les 4 groupes existent
        if (parsed.A && parsed.B && parsed.C && parsed.D) {
            return parsed;
        }
    }
    // Sinon utiliser les données par défaut et les sauvegarder
    setStandingsData(DEFAULT_STANDINGS);
    return DEFAULT_STANDINGS;
}

function setStandingsData(data) {
    localStorage.setItem('to_standings', JSON.stringify(data));
}

function sortStandings(teams) {
    return [...teams].sort((a, b) => {
        // 1. Points (V*3 + N)
        const ptsA = (a.v * 3) + a.n;
        const ptsB = (b.v * 3) + b.n;
        if (ptsB !== ptsA) return ptsB - ptsA;
        // 2. Différence de buts
        const diffA = a.bp - a.bc;
        const diffB = b.bp - b.bc;
        if (diffB !== diffA) return diffB - diffA;
        // 3. Buts marqués
        if (b.bp !== a.bp) return b.bp - a.bp;
        // 4. Victoires
        if (b.v !== a.v) return b.v - a.v;
        // 5. Alphabétique
        return a.team.localeCompare(b.team);
    });
}

let _lastRecalcTs = 0;
function renderStandings() {
    // Recalcul automatique (max une fois par seconde pour la perf)
    const now = Date.now();
    if (now - _lastRecalcTs > 1000) {
        recalculerClassementDepuisScores();
        _lastRecalcTs = now;
    }

    const container = document.getElementById('standingsContainer');
    const standings = getStandingsData();
    const groups = ['A', 'B', 'C', 'D'];

    container.innerHTML = groups.map(group => {
        const teams = sortStandings(standings[group] || []);
        // Au moins 1 match joue dans le groupe pour afficher les qualifies
        const groupHasMatches = teams.some(t => t.mj > 0);
        return `
        <div class="standings-group-card" data-group="${group}">
            <div class="standings-group-header">
                <span class="group-letter">Groupe ${group}</span>
            </div>
            <div class="standings-table-wrapper">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th class="col-rank">#</th>
                            <th class="col-team">Équipe</th>
                            <th>MJ</th>
                            <th>V</th>
                            <th>N</th>
                            <th>D</th>
                            <th>BP</th>
                            <th>BC</th>
                            <th>+/-</th>
                            <th class="col-pts">PTS</th>
                            ${isAdmin ? '<th class="col-action"></th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${teams.map((t, i) => {
                            const pts = (t.v * 3) + t.n;
                            const diff = t.bp - t.bc;
                            const diffClass = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : '';
                            const diffStr = diff > 0 ? '+' + diff : diff.toString();
                            const isQualified = i < 2 && groupHasMatches;
                            const originalIndex = (standings[group] || []).findIndex(orig => orig.team === t.team);
                            return `
                            <tr class="${isQualified ? 'qualified-row' : ''}">
                                <td class="col-rank">
                                    <span class="rank-num ${isQualified ? 'qualified' : ''}">${i+1}</span>
                                </td>
                                <td class="col-team">
                                    ${t.image ? `<img src="${t.image}" class="team-logo-sm" alt="">` : ''}
                                    <span class="team-name-link" onclick="openTeamModalByIndex('${group}', ${originalIndex})">${t.team}</span>
                                    ${isQualified ? '<span class="qualified-badge">Q</span>' : ''}
                                    ${isAdmin ? `<button class="edit-btn" onclick="editTeamPhoto('${group}', ${originalIndex})" title="Photo"><i class="fas fa-camera"></i></button>` : ''}
                                </td>
                                <td>${t.mj}</td>
                                <td>${t.v}</td>
                                <td>${t.n}</td>
                                <td>${t.d}</td>
                                <td>${t.bp}</td>
                                <td>${t.bc}</td>
                                <td class="${diffClass}">${diffStr}</td>
                                <td class="col-pts"><strong>${pts}</strong></td>
                                ${isAdmin ? `<td class="col-action"><button class="edit-btn" onclick="editStanding('${group}', ${originalIndex})" title="Modifier"><i class="fas fa-pen"></i></button></td>` : ''}
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

function editStanding(group, teamIndex) {
    const standings = getStandingsData();
    const team = standings[group][teamIndex];
    if (!team) return;

    document.getElementById('standingModalTitle').textContent = `Modifier - ${team.team}`;
    document.getElementById('standingGroup').value = group;
    document.getElementById('standingTeamIndex').value = teamIndex;
    document.getElementById('standingTeamName').value = team.team;
    document.getElementById('standingMJ').value = team.mj;
    document.getElementById('standingV').value = team.v;
    document.getElementById('standingN').value = team.n;
    document.getElementById('standingD').value = team.d;
    document.getElementById('standingBP').value = team.bp;
    document.getElementById('standingBC').value = team.bc;

    openModal('standingModal');
}

async function saveStanding(e) {
    e.preventDefault();
    const group = document.getElementById('standingGroup').value;
    const teamIndex = parseInt(document.getElementById('standingTeamIndex').value);
    const standings = getStandingsData();

    standings[group][teamIndex] = {
        team: standings[group][teamIndex].team,
        image: standings[group][teamIndex].image || '',
        mj: parseInt(document.getElementById('standingMJ').value) || 0,
        v: parseInt(document.getElementById('standingV').value) || 0,
        n: parseInt(document.getElementById('standingN').value) || 0,
        d: parseInt(document.getElementById('standingD').value) || 0,
        bp: parseInt(document.getElementById('standingBP').value) || 0,
        bc: parseInt(document.getElementById('standingBC').value) || 0
    };

    setStandingsData(standings);
    closeModal('standingModal');
    renderStandings();
    showToast('Classement mis à jour avec succès');
    await syncAfterChange('standings');
}

// ===== NOTIFICATIONS =====

function toggleNotifications() {
    openModal('notifModal');
    updateNotifModalUI();
}

function updateNotifModalUI() {
    const btn = document.getElementById('notifMainBtn');
    const icon = document.querySelector('#notifStatusBox .notif-icon-big i');
    const text = document.getElementById('notifStatusText');

    if (!('Notification' in window)) {
        text.textContent = 'Votre navigateur ne supporte pas les notifications.';
        btn.style.display = 'none';
        return;
    }

    if (Notification.permission === 'granted') {
        icon.className = 'fas fa-bell';
        icon.style.color = 'var(--primary)';
        text.textContent = 'Notifications activées ! Vous recevrez les scores en temps réel.';
        btn.textContent = 'Désactiver';
        btn.className = 'btn btn-secondary btn-full';
        btn.onclick = desactiverNotifications;
        document.getElementById('notifBadge').style.display = 'none';
    } else if (Notification.permission === 'denied') {
        icon.className = 'fas fa-bell-slash';
        icon.style.color = 'var(--danger)';
        text.textContent = 'Notifications bloquées par votre navigateur. Allez dans les paramètres du site pour les autoriser.';
        btn.style.display = 'none';
    } else {
        icon.className = 'fas fa-bell-slash';
        icon.style.color = 'var(--gray-400)';
        text.textContent = 'Activez les notifications pour recevoir les scores en temps réel !';
        btn.textContent = '🔔 Activer les notifications';
        btn.className = 'btn btn-primary btn-full';
        btn.onclick = demanderPermissionNotif;
        btn.style.display = 'block';
    }
}

async function demanderPermissionNotif() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    updateNotifModalUI();
    if (perm === 'granted') {
        showToast('Notifications activées !', 'success');
        envoyerNotification('✅ Notifications activées', 'Vous recevrez les scores de Taourirt-Ouablaa en temps réel !');
    }
}

function desactiverNotifications() {
    // On ne peut pas révoquer la permission via JS, on informe l'utilisateur
    showToast('Pour désactiver, allez dans les paramètres de votre navigateur.', 'info');
    closeModal('notifModal');
}

function envoyerNotification(titre, corps) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(titre, {
            body: corps,
            icon: 'logo.png',
            badge: 'logo.png',
            vibrate: [200, 100, 200]
        });
    } catch(e) {}
}

// Polling : vérifier toutes les 30 secondes si les données ont changé
let lastUpdateHash = '';
let pollingInterval = null;

function demarrerPolling() {
    if (pollingInterval) return;
    pollingInterval = setInterval(async () => {
        try {
            const lastUpdate = await firebaseGet('/lastUpdate');
            if (lastUpdate && lastUpdate !== lastUpdateHash) {
                if (lastUpdateHash !== '') {
                    // Données ont changé — recharger tout
                    const loaded = await loadFromCloud();
                    if (loaded) {
                        renderAll();

                        // Notifier si permission accordée
                        if (Notification.permission === 'granted') {
                            envoyerNotification('Mise a jour des scores', 'Les resultats ont ete mis a jour !');
                        }
                        const badge = document.getElementById('notifBadge');
                        if (badge) { badge.style.display = 'flex'; }
                    }
                }
                lastUpdateHash = lastUpdate;
            }
        } catch(e) {}
    }, 15000); // toutes les 15 secondes pour plus de réactivité

    // Pause polling quand l'onglet est cache, refresh immédiat au retour
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        } else {
            // Refresh immédiat au retour sur l'onglet
            loadFromCloud().then(loaded => {
                if (loaded) renderAll();
            });
            demarrerPolling();
        }
    });
}

// ===== MATCH DU JOUR =====
function initMatchDuJour() {
    const scores = getData('scores');
    // Utiliser la date locale (pas UTC) pour éviter le décalage horaire
    const now = new Date();
    const today = now.getFullYear() + '-'
        + String(now.getMonth() + 1).padStart(2, '0') + '-'
        + String(now.getDate()).padStart(2, '0');

    // Include bracket matches
    const bracketData = getBracketData();
    const bracketMatches = [];
    ['quarters', 'semis', 'final'].forEach(phase => {
        (bracketData[phase] || []).forEach(bm => {
            if (bm.team1 && bm.team2) {
                const phaseName = phase === 'quarters' ? 'Quart' : phase === 'semis' ? 'Demi' : 'Finale';
                bracketMatches.push({ homeTeam: bm.team1, awayTeam: bm.team2, homeScore: bm.score1, awayScore: bm.score2, date: bm.date, status: bm.status, journee: phaseName });
            }
        });
    });
    const allScores = scores.concat(bracketMatches);

    // Chercher matchs live d'abord, sinon matchs du jour uniquement
    let matchsDuJour = allScores.filter(s => s.status === 'live');
    if (matchsDuJour.length === 0) {
        matchsDuJour = allScores.filter(s => s.date && s.date.split('T')[0] === today);
    }

    const banner = document.getElementById('matchDuJourBanner');
    if (!banner) return;

    if (matchsDuJour.length === 0) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    // Ajuster le hero apres affichage du banner
    requestAnimationFrame(() => ajusterMarginHero());
    const anyLive = matchsDuJour.some(s => s.status === 'live');
    const jourees = matchsDuJour.map(s => s.journee).filter((j, i, a) => j && a.indexOf(j) === i).join(', ');

    document.getElementById('matchDuJourContent').innerHTML = `
        <div class="mdj-badge ${anyLive ? 'mdj-live' : 'mdj-today'}">
            ${anyLive ? '<span class="mdj-dot"></span> EN DIRECT' : `<i class="fas fa-calendar-day"></i> AUJOURD'HUI${jourees ? ' · ' + jourees : ''}`}
        </div>
        <div class="mdj-matches">
            ${matchsDuJour.slice(0, 3).map(s => {
                const heureMatch = s.date ? new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                const scoreAffiche = s.status === 'upcoming' ? heureMatch : (s.status === 'live' ? `${s.homeScore} - ${s.awayScore}` : `${s.homeScore} - ${s.awayScore}`);
                return `
            <div class="mdj-match">
                <span class="mdj-team">${s.homeTeam}</span>
                <span class="mdj-score">${scoreAffiche}</span>
                <span class="mdj-team mdj-team-away">${s.awayTeam}</span>
            </div>`;
            }).join('')}
            ${matchsDuJour.length > 3 ? `<div class="mdj-more">+${matchsDuJour.length - 3} autre(s) match(s)</div>` : ''}
        </div>
        <button class="mdj-close" onclick="fermerMdjBanner()" title="Fermer">&times;</button>
    `;
}

function fermerMdjBanner() {
    const banner = document.getElementById('matchDuJourBanner');
    if (banner) banner.style.display = 'none';
    ajusterMarginHero();
}

function ajusterMarginHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const navbar = document.querySelector('.navbar');
    const toolbar = document.getElementById('adminToolbar');
    const banner = document.getElementById('matchDuJourBanner');
    let top = navbar ? navbar.offsetHeight : 60;
    if (toolbar && toolbar.style.display !== 'none') top += toolbar.offsetHeight;
    if (banner && banner.style.display !== 'none') top += banner.offsetHeight;
    hero.style.marginTop = top + 'px';
}

// ===== CONTACT FORM =====
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Message envoyé avec succès ! Nous vous répondrons bientôt.', 'success');
            form.reset();
        });
    }
}

// ===== MODE SOMBRE =====
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
    const icon = document.querySelector('#darkToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    const icon = document.querySelector('#darkToggle i');
    if (saved === '1') {
        document.documentElement.classList.add('dark');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        document.documentElement.classList.remove('dark');
        if (icon) icon.className = 'fas fa-moon';
    }
}

// ===== PHOTO ÉQUIPE =====
function editTeamPhoto(group, teamIndex) {
    const standings = getStandingsData();
    const team = standings[group][teamIndex];
    if (!team) return;

    document.getElementById('teamPhotoGroup').value = group;
    document.getElementById('teamPhotoIndex').value = teamIndex;
    document.getElementById('teamPhotoLabel').textContent = team.team;

    const preview = document.getElementById('teamPhotoPreview');
    if (team.image) {
        preview.classList.add('has-image');
        preview.innerHTML = `<img src="${team.image}" alt="Preview">`;
    } else {
        preview.classList.remove('has-image');
        preview.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Cliquez ou glissez une image</p>';
    }
    document.getElementById('teamPhotoFile').value = '';
    openModal('teamPhotoModal');
}

async function saveTeamPhoto(event) {
    event.preventDefault();
    const group = document.getElementById('teamPhotoGroup').value;
    const teamIndex = parseInt(document.getElementById('teamPhotoIndex').value);
    const fileInput = document.getElementById('teamPhotoFile');
    const standings = getStandingsData();

    if (fileInput.files && fileInput.files[0]) {
        const base64 = await fileToBase64(fileInput.files[0]);
        standings[group][teamIndex].image = base64;
        setStandingsData(standings);
        closeModal('teamPhotoModal');
        renderStandings();
        showToast('Photo enregistrée !', 'success');
        await syncAfterChange('standings');
    } else {
        showToast('Veuillez sélectionner une image', 'error');
    }
}

// ===== FICHE ÉQUIPE =====
// Entrée depuis le classement (group + index dans standings)
function openTeamModalByIndex(group, index) {
    const standings = getStandingsData();
    const team = standings[group] && standings[group][index];
    if (!team) return;
    openTeamModal(team.team);
}

// Entrée depuis les scores (index dans _scoreTeamNames)
function openTeamModalByName(idx) {
    const name = window._scoreTeamNames && window._scoreTeamNames[idx];
    if (!name) return;
    openTeamModal(name);
}

function openTeamModal(teamName) {
    const standings = getStandingsData();
    const scores = getData('scores');
    const buteurs = getClassementButeurs();

    // Trouver les stats de l'équipe
    let teamData = null;
    let groupName = '';
    ['A', 'B', 'C', 'D'].forEach(g => {
        const found = standings[g].find(t => t.team === teamName);
        if (found) { teamData = found; groupName = g; }
    });

    // Matchs de l'équipe
    const teamMatches = scores.filter(s => s.homeTeam === teamName || s.awayTeam === teamName)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);

    // Buteurs de l'équipe
    const teamScorers = buteurs.filter(b => b.equipe === teamName);

    const pts = teamData ? (teamData.v * 3) + teamData.n : 0;
    const diff = teamData ? teamData.bp - teamData.bc : 0;

    let html = `
        <div class="team-modal-header">
            ${teamData && teamData.image
                ? `<img src="${teamData.image}" class="team-logo-lg" alt="${teamName}">`
                : `<div class="team-logo-lg team-logo-placeholder"><i class="fas fa-shield-alt"></i></div>`}
            <div>
                <h2 class="team-modal-name">${teamName}</h2>
                ${groupName ? `<span class="team-modal-group">Groupe ${groupName}</span>` : ''}
            </div>
        </div>`;

    if (teamData) {
        html += `
        <div class="team-modal-stats">
            <div class="tms-item"><span class="tms-val">${teamData.mj}</span><span class="tms-lbl">MJ</span></div>
            <div class="tms-item"><span class="tms-val tms-win">${teamData.v}</span><span class="tms-lbl">V</span></div>
            <div class="tms-item"><span class="tms-val">${teamData.n}</span><span class="tms-lbl">N</span></div>
            <div class="tms-item"><span class="tms-val tms-loss">${teamData.d}</span><span class="tms-lbl">D</span></div>
            <div class="tms-item"><span class="tms-val">${teamData.bp}</span><span class="tms-lbl">BP</span></div>
            <div class="tms-item"><span class="tms-val">${teamData.bc}</span><span class="tms-lbl">BC</span></div>
            <div class="tms-item"><span class="tms-val ${diff > 0 ? 'tms-win' : diff < 0 ? 'tms-loss' : ''}">${diff > 0 ? '+' + diff : diff}</span><span class="tms-lbl">+/-</span></div>
            <div class="tms-item tms-pts"><span class="tms-val tms-pts-val">${pts}</span><span class="tms-lbl">PTS</span></div>
        </div>`;
    }

    if (teamMatches.length > 0) {
        html += `<h4 class="team-modal-section-title"><i class="fas fa-futbol"></i> Matchs récents</h4>
        <div class="team-modal-matches">
            ${teamMatches.map(s => {
                const isHome = s.homeTeam === teamName;
                const opponent = isHome ? s.awayTeam : s.homeTeam;
                const scoreStr = s.status === 'upcoming'
                    ? `<span class="tma-upcoming">À venir</span>`
                    : `<strong>${isHome ? s.homeScore : s.awayScore} - ${isHome ? s.awayScore : s.homeScore}</strong>`;
                const dateStr = s.date ? new Date(s.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'}) : '';
                return `<div class="tma-row">
                    <span class="tma-date">${dateStr}</span>
                    <span class="tma-side">${isHome ? 'DOM' : 'EXT'}</span>
                    <span class="tma-opp">${opponent}</span>
                    <span class="tma-score">${scoreStr}</span>
                </div>`;
            }).join('')}
        </div>`;
    }

    if (teamScorers.length > 0) {
        html += `<h4 class="team-modal-section-title"><i class="fas fa-star"></i> Buteurs</h4>
        <div class="team-modal-scorers">
            ${teamScorers.map(b => `
            <div class="tmscore-row">
                <span class="tmscore-name">${b.nom}</span>
                <span class="tmscore-goals">${b.buts} <i class="fas fa-futbol"></i></span>
            </div>`).join('')}
        </div>`;
    }

    document.getElementById('teamModalTitle').textContent = teamName;
    document.getElementById('teamModalBody').innerHTML = html;
    openModal('teamModal');
}

// ===== COMPTE À REBOURS =====
let countdownInterval = null;

function initCountdown() {
    const scores = getData('scores');
    const now = new Date();

    // Include bracket matches in countdown
    const bracketData = getBracketData();
    const bracketList = [];
    ['quarters', 'semis', 'final'].forEach(phase => {
        const phaseName = phase === 'quarters' ? 'Quart' : phase === 'semis' ? 'Demi' : 'Finale';
        (bracketData[phase] || []).forEach(bm => {
            if (bm.team1 && bm.team2 && bm.date && bm.status !== 'finished') {
                bracketList.push({ homeTeam: bm.team1, awayTeam: bm.team2, date: bm.date, status: bm.status, journee: phaseName });
            }
        });
    });

    // Trouver le prochain match non terminé (groupes + eliminatoires)
    const upcoming = scores.concat(bracketList)
        .filter(s => s.status !== 'finished' && s.date)
        .map(s => ({ ...s, dateObj: new Date(s.date) }))
        .filter(s => s.dateObj > now)
        .sort((a, b) => a.dateObj - b.dateObj);

    const section = document.getElementById('countdownSection');
    if (!section) return;

    if (upcoming.length === 0) {
        // Fallback visible: afficher dernier résultat si aucun match à venir
        const all = getData('scores');
        const past = all.filter(s => s.date).sort((a, b) => new Date(b.date) - new Date(a.date));
        const last = past[0];
        section.style.display = 'block';
        section.innerHTML = last
            ? `<div class="countdown-label-top">Dernier match · ${last.homeTeam} ${last.homeScore} - ${last.awayScore} ${last.awayTeam}</div>
               <div class="countdown-items"><div class="countdown-block"><span class="countdown-value">00</span><span class="countdown-unit">J</span></div>
               <span class="countdown-sep">:</span><div class="countdown-block"><span class="countdown-value">00</span><span class="countdown-unit">H</span></div>
               <span class="countdown-sep">:</span><div class="countdown-block"><span class="countdown-value">00</span><span class="countdown-unit">MIN</span></div>
               <span class="countdown-sep">:</span><div class="countdown-block"><span class="countdown-value">00</span><span class="countdown-unit">SEC</span></div></div>`
            : `<div class="countdown-label-top">Aucun match à venir</div>`;
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
        return;
    }

    const next = upcoming[0];
    section.style.display = 'block';

    function update() {
        const now2 = new Date();
        const diff = next.dateObj - now2;

        if (diff <= 0) {
            section.style.display = 'none';
            clearInterval(countdownInterval);
            countdownInterval = null;
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const urgent = diff < 3600000; // moins d'1h

        section.innerHTML = `
            <div class="countdown-label-top">Prochain match · ${next.homeTeam} vs ${next.awayTeam}</div>
            <div class="countdown-items ${urgent ? 'countdown-urgent' : ''}">
                <div class="countdown-block"><span class="countdown-value">${String(days).padStart(2,'0')}</span><span class="countdown-unit">J</span></div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block"><span class="countdown-value">${String(hours).padStart(2,'0')}</span><span class="countdown-unit">H</span></div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block"><span class="countdown-value">${String(minutes).padStart(2,'0')}</span><span class="countdown-unit">MIN</span></div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block"><span class="countdown-value">${String(seconds).padStart(2,'0')}</span><span class="countdown-unit">SEC</span></div>
            </div>`;
    }

    update();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(update, 1000);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    initDarkMode();
    backupLocalDataIfMissing();
    favoriteTeams = getFavorites();

    function renderCritical() {
        initNavbar();
        initScoreFilters();
        initSmartFilter();
        renderJourneeNav();
        renderScores();
        renderStandings();
        renderButeurs();
        initHeroCards();
    }

    function renderDeferred() {
        requestAnimationFrame(() => {
            initStatsAnimation();
            initAnimations();
            initRechercheGlobale();
            initContactForm();
            renderTournois();
            renderGallery();
            updateMatchTournoiSelect();
            renderLiveTicker();
            initMatchDuJour();
            initRechercheButeurs();
            initCountdown();
            syncRostersFromScores();
            renderBracket();
        });
    }

    const hasLocal = localStorage.getItem('to_tournois') || localStorage.getItem('to_initialized');
    if (hasLocal) {
        // Render immediately with local data
        renderCritical();
        renderDeferred();

        // Then update from Firebase in background
        initData().then(fromCloud => {
            if (fromCloud) {
                renderCritical();
                requestAnimationFrame(() => {
                    renderTournois();
                    updateMatchTournoiSelect();
                    renderLiveTicker();
                    refreshStats();
                    initMatchDuJour();
                    initCountdown();
                    renderBracket();
                    renderGallery();
                });
            }
        });
    } else {
        // First load: wait for data
        await initData();
        renderCritical();
        renderDeferred();
    }

    demarrerPolling();
    initPWA();
    setTimeout(() => showFinaleSpotlight(), 1500);
    requestAnimationFrame(() => ajusterMarginHero());
    window.addEventListener('resize', () => ajusterMarginHero());
});

// ===== BACKUP LOCAL NON DESTRUCTIF =====
function backupLocalDataIfMissing() {
    try {
        if (!localStorage.getItem('to_backup')) {
            const snapshot = {
                tournois: getData('tournois'),
                scores: getData('scores'),
                news: getData('news'),
                gallery: getData('gallery'),
                standings: getStandingsData ? getStandingsData() : getData('standings')
            };
            localStorage.setItem('to_backup', JSON.stringify(snapshot));
        }
    } catch(e) {
        // ignore
    }
}

// ===== BRACKET / ARBRE TOURNOI - FIFA STYLE =====
function getBracketData() {
    try { return JSON.parse(localStorage.getItem('to_bracket') || '{}'); } catch(e) { return {}; }
}

function setBracketData(data) {
    localStorage.setItem('to_bracket', JSON.stringify(data));
}

// Auto-generate bracket from group standings (top 2 of each group)
function generateDefaultBracket() {
    return {
        quarters: [
            { id: 'qf1', team1: '', team2: '', score1: 0, score2: 0, status: 'upcoming', label: '1A vs 2B' },
            { id: 'qf2', team1: '', team2: '', score1: 0, score2: 0, status: 'upcoming', label: '1B vs 2A' },
            { id: 'qf3', team1: '', team2: '', score1: 0, score2: 0, status: 'upcoming', label: '1C vs 2D' },
            { id: 'qf4', team1: '', team2: '', score1: 0, score2: 0, status: 'upcoming', label: '1D vs 2C' }
        ],
        semis: [
            { id: 'sf1', team1: 'ALLAGHENE', team2: 'QUIZRANE', score1: 2, score2: 2, status: 'finished', label: 'DF1', hasPenalties: true, pen1: 3, pen2: 2, buteurs: [], cartons: [] },
            { id: 'sf2', team1: 'TAZMALT', team2: 'SEDDOUK', score1: 8, score2: 7, status: 'finished', label: 'DF2', hasPenalties: false, pen1: 0, pen2: 0, buteurs: [], cartons: [] }
        ],
        final: [
            { id: 'f1', team1: 'ALLAGHENE', team2: 'TAZMALT', score1: 0, score2: 0, status: 'upcoming', label: 'FINALE' }
        ]
    };
}

function getMatchWinner(m) {
    if (m.status !== 'finished') return '';
    const s1 = parseInt(m.score1) || 0;
    const s2 = parseInt(m.score2) || 0;
    // Si tirs au but (penalties)
    if (m.hasPenalties) {
        const p1 = parseInt(m.pen1) || 0;
        const p2 = parseInt(m.pen2) || 0;
        if (p1 > p2) return m.team1;
        if (p2 > p1) return m.team2;
    }
    if (s1 > s2) return m.team1;
    if (s2 > s1) return m.team2;
    return m.team1; // tie goes to team1 (admin should set correctly)
}

function propagateWinners(data) {
    // Propagation desactivee : l'admin saisit manuellement les equipes
    // dans chaque phase via le bracket editor. Cela evite d'ecraser
    // les modifications manuelles (ex: QUIZRANE vs ALLAGHENE, SEDDOUK vs TAZMALT).
    // Les equipes sont conservees telles que saisies par l'admin.
}

function migrateBracketData() {
    // Version de migration - incrementer pour forcer une nouvelle migration
    const MIGRATION_VERSION = 4;
    const currentVersion = parseInt(localStorage.getItem('to_bracket_version') || '0');
    
    if (currentVersion < MIGRATION_VERSION) {
        // Forcer les resultats des demi-finales et finale
        const def = generateDefaultBracket();
        let data = getBracketData();
        // Garder les quarts existants s'ils existent
        if (!data.quarters || data.quarters.length === 0) {
            data.quarters = def.quarters;
        }
        // Toujours ecraser les demis et finale avec les bonnes donnees
        data.semis = def.semis;
        data.final = def.final;
        setBracketData(data);
        localStorage.setItem('to_bracket_version', String(MIGRATION_VERSION));
        console.log('[Bracket] Migration v' + MIGRATION_VERSION + ' appliquee: SF1=ALLAGHENE vs QUIZRANE (2-2, TAB 3-2), SF2=TAZMALT vs SEDDOUK (8-7), FINALE=ALLAGHENE vs TAZMALT');
        // Pousser vers Firebase pour ne pas se faire ecraser
        saveToCloud('bracket');
    }
}

function renderBracket() {
    const container = document.getElementById('bracketContainer');
    if (!container) return;

    let data = getBracketData();
    if (!data.quarters || data.quarters.length === 0) {
        data = generateDefaultBracket();
        setBracketData(data);
    }
    migrateBracketData();
    data = getBracketData();
    propagateWinners(data);

    const q = data.quarters || [];
    const s = data.semis || [];
    const f = data.final || [];
    const champion = getMatchWinner(f[0] || {});

    container.innerHTML = `
    <div class="bracket-grid">
        <div class="bracket-round">
            <div class="bracket-round-label">Quarts de finale</div>
            ${q.map(m => renderBracketMatch(m, false)).join('')}
        </div>
        <div class="bracket-connectors" id="bracketConn1"></div>
        <div class="bracket-round">
            <div class="bracket-round-label">Demi-finales</div>
            ${s.map(m => renderBracketMatch(m, false)).join('')}
        </div>
        <div class="bracket-connectors" id="bracketConn2"></div>
        <div class="bracket-round bracket-round-final">
            <div class="bracket-round-label">Finale</div>
            ${f.map(m => renderBracketMatch(m, true)).join('')}
        </div>
        <div class="bracket-champion">
            <div class="bracket-trophy">🏆</div>
            <div class="bracket-champion-name ${champion ? '' : 'tbd'}">
                ${champion || 'A determiner'}
            </div>
        </div>
    </div>`;

    // Draw connector lines via JS (positions depend on rendered element sizes)
    requestAnimationFrame(() => drawConnectors());

    // Render modern match cards list below bracket tree
    renderBracketMatchCards(data);
}

function renderBracketMatchCards(data) {
    const featuredContainer = document.getElementById('bracketFeatured');
    let cardsContainer = document.getElementById('bracketMatchCards');
    if (!cardsContainer) {
        const parent = document.getElementById('bracketContainer');
        if (!parent) return;
        cardsContainer = document.createElement('div');
        cardsContainer.id = 'bracketMatchCards';
        parent.parentElement.appendChild(cardsContainer);
    }

    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    const phaseNames = { quarters: 'Quart de finale', semis: 'Demi-finale', final: 'Finale' };
    const allMatches = [];

    ['quarters', 'semis', 'final'].forEach(phase => {
        (data[phase] || []).forEach(m => {
            if (m.team1 || m.team2) {
                allMatches.push({ ...m, phaseName: phaseNames[phase] });
            }
        });
    });

    // Find today's or live bracket matches for featured display
    const todayMatches = allMatches.filter(m => m.status === 'live' || (m.date && m.date.split('T')[0] === today));
    const upcomingMatches = allMatches.filter(m => m.status === 'upcoming' && m.date && new Date(m.date) > now).sort((a,b) => new Date(a.date) - new Date(b.date));

    // Featured section: ABOVE the bracket tree (visible immediately)
    let featuredHtml = '';
    const featured = todayMatches.length > 0 ? todayMatches : upcomingMatches.slice(0, 2);
    if (featured.length > 0) {
        featuredHtml = `<div class="bracket-featured-section">
            <h3 class="bracket-cards-title"><i class="fas fa-fire"></i> ${todayMatches.length > 0 ? "Match(s) du jour - Phase eliminatoire" : "Prochain(s) match(s) eliminatoire(s)"}</h3>
            <div class="bracket-featured-cards">${featured.map(m => renderBracketCardLarge(m)).join('')}</div>
        </div>`;
    }
    if (featuredContainer) featuredContainer.innerHTML = featuredHtml;

    // All matches grouped by phase: BELOW the bracket tree
    let html = '';
    if (allMatches.length > 0) {
        html += `<h3 class="bracket-cards-title" style="margin-top:1.5rem;"><i class="fas fa-list"></i> Tous les matchs eliminatoires</h3>`;
        ['quarters', 'semis', 'final'].forEach(phase => {
            const matches = allMatches.filter(m => (data[phase]||[]).some(dm => dm.id === m.id));
            if (matches.length === 0) return;
            html += `<div class="bracket-phase-group">
                <div class="bracket-phase-label">${phaseNames[phase]}</div>
                <div class="bracket-cards-grid">${matches.map(m => renderBracketCardSmall(m)).join('')}</div>
            </div>`;
        });
    }

    cardsContainer.innerHTML = html;
}

function renderBracketCardLarge(m) {
    const isLive = m.status === 'live';
    const isFinished = m.status === 'finished';
    const isFinale = (m.phaseName || '').toLowerCase().includes('finale');
    const s1 = parseInt(m.score1) || 0;
    const s2 = parseInt(m.score2) || 0;
    const dateStr = m.date ? new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
    const heure = m.date ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const homeScorers = Array.isArray(m.buteurs) ? m.buteurs.filter(b => b.equipe === m.team1) : [];
    const awayScorers = Array.isArray(m.buteurs) ? m.buteurs.filter(b => b.equipe === m.team2) : [];

    return `
    <div class="bk-card-large ${isLive ? 'bk-card-live' : ''} ${isFinished ? 'bk-card-finished' : ''} ${isFinale ? 'bk-card-finale' : ''}">
        <div class="bk-card-header">
            <span class="bk-phase-badge">${m.phaseName || ''}</span>
            ${isLive ? '<span class="bk-live-badge"><span class="live-pulse-dot"></span> EN DIRECT</span>' : ''}
            ${isFinished ? '<span class="bk-finished-badge">TERMINE</span>' : ''}
            ${!isLive && !isFinished && dateStr ? `<span class="bk-date-badge"><i class="far fa-calendar"></i> ${dateStr} · ${heure}</span>` : ''}
        </div>
        <div class="bk-card-body">
            <div class="bk-team bk-team-home">
                <div class="bk-team-logo"><i class="fas fa-shield-alt"></i></div>
                <span class="bk-team-name">${m.team1 || 'A determiner'}</span>
            </div>
            <div class="bk-score-center">
                <span class="bk-score ${isLive ? 'bk-score-live' : ''}">${m.status === 'upcoming' ? heure || 'VS' : s1 + ' - ' + s2}</span>
                ${isLive ? '<span class="bk-live-time">En cours</span>' : ''}
            </div>
            <div class="bk-team bk-team-away">
                <span class="bk-team-name">${m.team2 || 'A determiner'}</span>
                <div class="bk-team-logo"><i class="fas fa-shield-alt"></i></div>
            </div>
        </div>
        ${(homeScorers.length || awayScorers.length) ? `
        <div class="bk-card-scorers">
            <div class="bk-scorers-col">
                ${homeScorers.map(b => `<div class="bk-scorer"><i class="fas fa-futbol"></i> ${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''}</div>`).join('') || ''}
            </div>
            <div class="bk-scorers-divider"></div>
            <div class="bk-scorers-col bk-scorers-away">
                ${awayScorers.map(b => `<div class="bk-scorer">${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''} <i class="fas fa-futbol"></i></div>`).join('') || ''}
            </div>
        </div>` : ''}
    </div>`;
}

function renderBracketCardSmall(m) {
    const isLive = m.status === 'live';
    const isFinished = m.status === 'finished';
    const s1 = parseInt(m.score1) || 0;
    const s2 = parseInt(m.score2) || 0;
    const hasPen = !!m.hasPenalties;
    const pen1m = parseInt(m.pen1) || 0;
    const pen2m = parseInt(m.pen2) || 0;
    const w1 = isFinished && (hasPen ? pen1m > pen2m : s1 > s2);
    const w2 = isFinished && (hasPen ? pen2m > pen1m : s2 > s1);
    const heure = m.date ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const dateStr = m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
    const statusCls = isLive ? 'bk-mini-live' : isFinished ? 'bk-mini-finished' : 'bk-mini-upcoming';

    return `
    <div class="bk-card-small ${statusCls}">
        <div class="bk-mini-header">
            ${isLive ? '<span class="bk-mini-status"><span class="live-pulse-dot"></span> LIVE</span>' : ''}
            ${isFinished ? '<span class="bk-mini-status bk-mini-ft">FT</span>' : ''}
            ${!isLive && !isFinished && dateStr ? `<span class="bk-mini-date">${dateStr} · ${heure}</span>` : ''}
        </div>
        <div class="bk-mini-teams">
            <div class="bk-mini-row ${w1 ? 'bk-mini-winner' : ''}">
                <span class="bk-mini-name">${m.team1 || 'TBD'}</span>
                <span class="bk-mini-score">${m.status !== 'upcoming' ? s1 : '-'}</span>
            </div>
            <div class="bk-mini-row ${w2 ? 'bk-mini-winner' : ''}">
                <span class="bk-mini-name">${m.team2 || 'TBD'}</span>
                <span class="bk-mini-score">${m.status !== 'upcoming' ? s2 : '-'}</span>
            </div>
        </div>
        ${hasPen && isFinished ? `<div class="bk-mini-pen">TAB: ${pen1m} - ${pen2m}</div>` : ''}
    </div>`;
}

function renderBracketMatch(m, isFinal) {
    const s1 = parseInt(m.score1) || 0;
    const s2 = parseInt(m.score2) || 0;
    const isFinished = m.status === 'finished';
    const isLive = m.status === 'live';
    const winner1 = isFinished && s1 > s2;
    const winner2 = isFinished && s2 > s1;
    const isTbd1 = !m.team1;
    const isTbd2 = !m.team2;

    let dateHtml = '';
    if (m.date) {
        const d = new Date(m.date);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        dateHtml = `<div class="bracket-match-date">${dateStr} · ${heure}</div>`;
    }

    const homeScorers = Array.isArray(m.buteurs) ? m.buteurs.filter(b => b.equipe === m.team1) : [];
    const awayScorers = Array.isArray(m.buteurs) ? m.buteurs.filter(b => b.equipe === m.team2) : [];
    const showScorers = m.status !== 'upcoming' && (homeScorers.length || awayScorers.length);

    let buteursHtml = '';
    if (showScorers) {
        buteursHtml = `<div class="bracket-scorers">
            <div class="bracket-scorers-col">
                ${homeScorers.map(b => `<span class="bracket-scorer-item"><i class="fas fa-futbol"></i> ${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''}</span>`).join('')}
            </div>
            <div class="bracket-scorers-col bracket-scorers-away">
                ${awayScorers.map(b => `<span class="bracket-scorer-item">${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''} <i class="fas fa-futbol"></i></span>`).join('')}
            </div>
        </div>`;
    }

    const hasPen = !!m.hasPenalties;
    const pen1 = parseInt(m.pen1) || 0;
    const pen2 = parseInt(m.pen2) || 0;
    const penHtml = hasPen && isFinished ? `<div class="bracket-pen-badge">TAB: ${pen1} - ${pen2}</div>` : '';

    // Recalculate winner with penalties
    const realWinner1 = isFinished && (hasPen ? pen1 > pen2 : s1 > s2);
    const realWinner2 = isFinished && (hasPen ? pen2 > pen1 : s2 > s1);

    // Standard bracket match (quarts/demi)
    if (!isFinal) {
        return `
        <div class="bracket-match" data-id="${m.id}" style="margin-bottom:0.8rem;">
            ${m.label ? `<div class="bracket-match-label ${isLive ? 'is-live' : ''}">${isLive ? '● EN DIRECT' : m.label}</div>` : ''}
            ${dateHtml}
            <div class="bracket-match-team ${realWinner1 ? 'winner' : ''}">
                <span class="bracket-team-name ${isTbd1 ? 'tbd' : ''}">${m.team1 || 'A determiner'}</span>
                <span class="bracket-team-score">${m.status !== 'upcoming' ? s1 : '-'}</span>
            </div>
            <div class="bracket-match-team ${realWinner2 ? 'winner' : ''}">
                <span class="bracket-team-name ${isTbd2 ? 'tbd' : ''}">${m.team2 || 'A determiner'}</span>
                <span class="bracket-team-score">${m.status !== 'upcoming' ? s2 : '-'}</span>
            </div>
            ${penHtml}
            ${buteursHtml}
            ${isAdmin ? `<button class="btn btn-small btn-primary" style="width:100%;border-radius:0;padding:0.3rem;" onclick="editBracketMatch('${m.id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
        </div>`;
    }

    // ===== FINALE - STYLE PRO SPECTACULAIRE =====
    const champion = isFinished ? (realWinner1 ? m.team1 : (realWinner2 ? m.team2 : '')) : '';
    const heureStr = m.date ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const dateStrFull = m.date ? new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';

    return `
    <div class="bracket-match finale-match ${isLive ? 'finale-live' : ''} ${isFinished ? 'finale-finished' : ''}" data-id="${m.id}">
        <div class="finale-header">
            <div class="finale-badge">
                <i class="fas fa-trophy"></i> GRANDE FINALE
            </div>
            ${isLive ? '<div class="finale-live-badge"><span class="live-pulse-dot"></span> EN DIRECT</div>' : ''}
            ${isFinished ? '<div class="finale-ft-badge">TERMINE</div>' : ''}
            ${dateStrFull ? `<div class="finale-date"><i class="far fa-calendar-alt"></i> ${dateStrFull}${heureStr ? ' · ' + heureStr : ''}</div>` : ''}
        </div>
        <div class="finale-body">
            <div class="finale-team finale-team-left ${realWinner1 ? 'finale-winner' : ''} ${isFinished && !realWinner1 ? 'finale-loser' : ''}">
                <div class="finale-team-logo"><i class="fas fa-shield-alt"></i></div>
                <div class="finale-team-name ${isTbd1 ? 'tbd' : ''}">${m.team1 || 'A determiner'}</div>
                ${realWinner1 ? '<div class="finale-crown"><i class="fas fa-crown"></i></div>' : ''}
            </div>
            <div class="finale-score-box">
                ${m.status === 'upcoming'
                    ? `<div class="finale-vs">VS</div>${heureStr ? `<div class="finale-time">${heureStr}</div>` : ''}`
                    : `<div class="finale-score ${isLive ? 'finale-score-live' : ''}">${s1} <span class="finale-score-sep">-</span> ${s2}</div>`
                }
                ${isLive ? '<div class="finale-live-indicator"><span class="live-pulse-dot"></span> En cours</div>' : ''}
                ${hasPen && isFinished ? `<div class="finale-pen-badge">TAB: ${pen1} - ${pen2}</div>` : ''}
            </div>
            <div class="finale-team finale-team-right ${realWinner2 ? 'finale-winner' : ''} ${isFinished && !realWinner2 ? 'finale-loser' : ''}">
                ${realWinner2 ? '<div class="finale-crown"><i class="fas fa-crown"></i></div>' : ''}
                <div class="finale-team-name ${isTbd2 ? 'tbd' : ''}">${m.team2 || 'A determiner'}</div>
                <div class="finale-team-logo"><i class="fas fa-shield-alt"></i></div>
            </div>
        </div>
        ${showScorers ? `
        <div class="finale-scorers">
            <div class="finale-scorers-col finale-scorers-left">
                ${homeScorers.map(b => `<div class="finale-scorer"><i class="fas fa-futbol"></i> ${b.nom}${(parseInt(b.buts)||1)>1?' <span class="finale-scorer-x">x'+b.buts+'</span>':''}</div>`).join('') || ''}
            </div>
            <div class="finale-scorers-divider"></div>
            <div class="finale-scorers-col finale-scorers-right">
                ${awayScorers.map(b => `<div class="finale-scorer">${b.nom}${(parseInt(b.buts)||1)>1?' <span class="finale-scorer-x">x'+b.buts+'</span>':''} <i class="fas fa-futbol"></i></div>`).join('') || ''}
            </div>
        </div>` : ''}
        ${isFinished && champion ? `
        <div class="finale-champion-banner">
            <div class="finale-champion-trophy">🏆</div>
            <div class="finale-champion-text">
                <div class="finale-champion-label">CHAMPION DU TOURNOI</div>
                <div class="finale-champion-name">${champion}</div>
            </div>
            <div class="finale-champion-trophy">🏆</div>
        </div>` : ''}
        ${isAdmin ? `<button class="btn btn-small btn-primary" style="width:100%;border-radius:0 0 12px 12px;padding:0.4rem;" onclick="editBracketMatch('${m.id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
    </div>`;
}

function drawConnectors() {
    // SVG connector lines between rounds
    ['bracketConn1', 'bracketConn2'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const round = el.previousElementSibling;
        const nextRound = el.nextElementSibling;
        if (!round || !nextRound) return;

        const matches = round.querySelectorAll('.bracket-match');
        const nextMatches = nextRound.querySelectorAll('.bracket-match');

        const parentRect = el.getBoundingClientRect();
        const h = el.offsetHeight || 300;
        const w = el.offsetWidth || 40;

        let svg = `<svg width="${w}" height="${h}" style="position:absolute;top:0;left:0;" xmlns="http://www.w3.org/2000/svg">`;
        const color = document.documentElement.classList.contains('dark') ? '#2B323C' : '#CBD5E1';

        // Connect pairs of matches to next round matches
        for (let i = 0; i < nextMatches.length; i++) {
            const m1 = matches[i * 2];
            const m2 = matches[i * 2 + 1];
            const target = nextMatches[i];
            if (!m1 || !target) continue;

            const y1 = m1.offsetTop + m1.offsetHeight / 2 - round.offsetTop + round.querySelector('.bracket-round-label')?.offsetHeight || 0;
            const y2 = m2 ? m2.offsetTop + m2.offsetHeight / 2 - round.offsetTop + (round.querySelector('.bracket-round-label')?.offsetHeight || 0) : y1;
            const yt = target.offsetTop + target.offsetHeight / 2 - nextRound.offsetTop + (nextRound.querySelector('.bracket-round-label')?.offsetHeight || 0);

            // Horizontal from left, vertical merge, horizontal to right
            const midX = w / 2;
            svg += `<line x1="0" y1="${y1}" x2="${midX}" y2="${y1}" stroke="${color}" stroke-width="2"/>`;
            if (m2) svg += `<line x1="0" y1="${y2}" x2="${midX}" y2="${y2}" stroke="${color}" stroke-width="2"/>`;
            svg += `<line x1="${midX}" y1="${y1}" x2="${midX}" y2="${m2 ? y2 : y1}" stroke="${color}" stroke-width="2"/>`;
            svg += `<line x1="${midX}" y1="${yt}" x2="${w}" y2="${yt}" stroke="${color}" stroke-width="2"/>`;
        }

        svg += '</svg>';
        el.style.position = 'relative';
        el.style.height = h + 'px';
        el.innerHTML = svg;
    });
}

function resetBracket() {
    showConfirm('Reinitialiser le bracket ? Toutes les donnees seront effacees.', async () => {
        const data = generateDefaultBracket();
        setBracketData(data);
        renderBracket();
        showToast('Bracket reinitialise', 'success');
        await syncAfterChange('bracket');
    });
}

function openBracketEditor() {
    document.getElementById('bracketForm').reset();
    viderBracketButeursFormulaire();
    viderBracketCartonsFormulaire();
    document.getElementById('bracket-buteurs-home-title').textContent = 'Equipe 1';
    document.getElementById('bracket-buteurs-away-title').textContent = 'Equipe 2';
    document.getElementById('bracket-cartons-home-title').textContent = 'Equipe 1';
    document.getElementById('bracket-cartons-away-title').textContent = 'Equipe 2';
    document.getElementById('bracketLabel').value = '';
    updateBracketChips('', '');
    openModal('bracketModal');
}

function editBracketMatch(id) {
    const data = getBracketData();
    let match = null;
    let phase = '';
    ['quarters', 'semis', 'final'].forEach(p => {
        const arr = data[p] || [];
        const found = arr.find(m => m.id === id);
        if (found) { match = found; phase = p; }
    });
    if (!match) return;
    document.getElementById('bracketPhase').value = phase;
    document.getElementById('bracketLabel').value = match.label || '';
    document.getElementById('bracketTeam1').value = match.team1 || '';
    document.getElementById('bracketScore1').value = match.score1 || 0;
    document.getElementById('bracketTeam2').value = match.team2 || '';
    document.getElementById('bracketScore2').value = match.score2 || 0;
    document.getElementById('bracketStatus').value = match.status || 'upcoming';
    document.getElementById('bracketDate').value = match.date || '';
    // Penalties
    document.getElementById('bracketHasPenalties').checked = !!match.hasPenalties;
    document.getElementById('bracketPen1').value = match.pen1 || 0;
    document.getElementById('bracketPen2').value = match.pen2 || 0;
    togglePenaltyFields();
    showPenaltySectionIfFinished();
    // Update penalty labels
    document.getElementById('penLabel1').textContent = 'Penalties ' + (match.team1 || 'Equipe 1');
    document.getElementById('penLabel2').textContent = 'Penalties ' + (match.team2 || 'Equipe 2');
    // Update bracket player chips
    updateBracketChips(match.team1 || '', match.team2 || '');
    // Populate visual buteurs
    viderBracketButeursFormulaire();
    document.getElementById('bracket-buteurs-home-title').textContent = match.team1 || 'Equipe 1';
    document.getElementById('bracket-buteurs-away-title').textContent = match.team2 || 'Equipe 2';
    if (Array.isArray(match.buteurs)) {
        match.buteurs.forEach(b => {
            const side = b.equipe === match.team1 ? 'home' : 'away';
            ajouterBracketButeurLigne(side, b.nom, b.buts);
        });
    }
    // Pré-remplir les cartons bracket
    viderBracketCartonsFormulaire();
    document.getElementById('bracket-cartons-home-title').textContent = match.team1 || 'Equipe 1';
    document.getElementById('bracket-cartons-away-title').textContent = match.team2 || 'Equipe 2';
    if (Array.isArray(match.cartons)) {
        match.cartons.forEach(c => {
            const side = c.equipe === match.team1 ? 'home' : 'away';
            ajouterBracketCartonLigne(side, c.nom, c.type);
        });
    }

    document.getElementById('bracketForm').dataset.editId = id;
    document.getElementById('bracketForm').dataset.editPhase = phase;
    openModal('bracketModal');
}

async function saveBracket(e) {
    e.preventDefault();
    const data = getBracketData();
    const phase = document.getElementById('bracketPhase').value;
    const editId = document.getElementById('bracketForm').dataset.editId;
    const match = {
        id: editId || generateId(),
        team1: document.getElementById('bracketTeam1').value,
        score1: parseInt(document.getElementById('bracketScore1').value) || 0,
        team2: document.getElementById('bracketTeam2').value,
        score2: parseInt(document.getElementById('bracketScore2').value) || 0,
        status: document.getElementById('bracketStatus').value,
        date: document.getElementById('bracketDate').value || '',
        buteurs: lireBracketButeursFormulaire(),
        cartons: lireBracketCartonsFormulaire(),
        label: document.getElementById('bracketLabel').value || '',
        hasPenalties: document.getElementById('bracketHasPenalties').checked,
        pen1: parseInt(document.getElementById('bracketPen1').value) || 0,
        pen2: parseInt(document.getElementById('bracketPen2').value) || 0
    };

    if (!data[phase]) data[phase] = [];

    if (editId) {
        const editPhase = document.getElementById('bracketForm').dataset.editPhase;
        if (editPhase && editPhase !== phase) {
            data[editPhase] = (data[editPhase] || []).filter(m => m.id !== editId);
        }
        const idx = (data[phase] || []).findIndex(m => m.id === editId);
        if (idx >= 0) { data[phase][idx] = match; }
        else data[phase].push(match);
    } else {
        data[phase].push(match);
    }

    setBracketData(data);
    delete document.getElementById('bracketForm').dataset.editId;
    delete document.getElementById('bracketForm').dataset.editPhase;
    closeModal('bracketModal');
    renderBracket();
    showToast('Bracket mis a jour !', 'success');
    await syncAfterChange('bracket');
}

// ===== BUTEURS BRACKET FORMULAIRE VISUEL =====
function ajouterBracketButeur(side) {
    const team1 = document.getElementById('bracketTeam1').value || 'Equipe 1';
    const team2 = document.getElementById('bracketTeam2').value || 'Equipe 2';
    document.getElementById('bracket-buteurs-home-title').textContent = team1;
    document.getElementById('bracket-buteurs-away-title').textContent = team2;
    updateBracketChips(team1, team2);
    ajouterBracketButeurLigne(side, '', 1);
}

function ajouterBracketButeurLigne(side, nom, buts) {
    const listId = side === 'home' ? 'bracketButeursHomeList' : 'bracketButeursAwayList';
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'buteur-row';
    row.innerHTML = `
        <input type="text" class="buteur-nom" placeholder="Nom du joueur" value="${nom || ''}" list="bracketRoster${side === 'home' ? 'Home' : 'Away'}Datalist">
        <input type="number" class="buteur-buts" min="1" max="20" value="${buts || 1}" title="Nombre de buts">
        <button type="button" class="btn-remove-buteur" onclick="this.parentElement.remove()" title="Supprimer">
            <i class="fas fa-times"></i>
        </button>`;
    list.appendChild(row);
    row.querySelector('.buteur-nom').focus();
}

// Get all known scorers from group phase for a team
function getBracketScorerSuggestions(teamName) {
    if (!teamName) return [];
    const scores = getData('scores');
    const players = new Set();
    scores.forEach(s => {
        if (!Array.isArray(s.buteurs)) return;
        s.buteurs.forEach(b => {
            if (b.equipe === teamName && b.nom) players.add(b.nom);
        });
    });
    // Also check rosters
    const roster = getRoster(teamName);
    roster.forEach(n => players.add(n));
    return [...players];
}

function updateBracketChips(team1, team2) {
    const chipsHome = document.getElementById('bracket-chips-home');
    const chipsAway = document.getElementById('bracket-chips-away');
    if (chipsHome) {
        const players = getBracketScorerSuggestions(team1);
        chipsHome.innerHTML = players.length ? players.map(name =>
            `<button type="button" class="player-chip" onclick="bracketChipAdd('home','${name.replace(/'/g, "\\\\'")}')"<i class="fas fa-plus-circle"></i> ${name}</button>`
        ).join('') : '<span class="chips-empty">Aucun joueur connu</span>';
    }
    if (chipsAway) {
        const players = getBracketScorerSuggestions(team2);
        chipsAway.innerHTML = players.length ? players.map(name =>
            `<button type="button" class="player-chip" onclick="bracketChipAdd('away','${name.replace(/'/g, "\\\\'")}')"<i class="fas fa-plus-circle"></i> ${name}</button>`
        ).join('') : '<span class="chips-empty">Aucun joueur connu</span>';
    }
    // Update datalists too
    updateBracketDatalists(team1, team2);
}

function updateBracketDatalists(team1, team2) {
    let dl1 = document.getElementById('bracketRosterHomeDatalist');
    let dl2 = document.getElementById('bracketRosterAwayDatalist');
    if (!dl1) { dl1 = document.createElement('datalist'); dl1.id = 'bracketRosterHomeDatalist'; document.body.appendChild(dl1); }
    if (!dl2) { dl2 = document.createElement('datalist'); dl2.id = 'bracketRosterAwayDatalist'; document.body.appendChild(dl2); }
    dl1.innerHTML = getBracketScorerSuggestions(team1).map(n => `<option value="${n}">`).join('');
    dl2.innerHTML = getBracketScorerSuggestions(team2).map(n => `<option value="${n}">`).join('');
}

function bracketChipAdd(side, playerName) {
    const listId = side === 'home' ? 'bracketButeursHomeList' : 'bracketButeursAwayList';
    const list = document.getElementById(listId);
    const existingRows = list.querySelectorAll('.buteur-row');
    for (const row of existingRows) {
        const nomInput = row.querySelector('.buteur-nom');
        if (nomInput && nomInput.value === playerName) {
            const butsInput = row.querySelector('.buteur-buts');
            butsInput.value = parseInt(butsInput.value || 0) + 1;
            return;
        }
    }
    ajouterBracketButeurLigne(side, playerName, 1);
}

function viderBracketButeursFormulaire() {
    document.getElementById('bracketButeursHomeList').innerHTML = '';
    document.getElementById('bracketButeursAwayList').innerHTML = '';
}

function lireBracketButeursFormulaire() {
    const buteurs = [];
    const team1 = document.getElementById('bracketTeam1').value;
    const team2 = document.getElementById('bracketTeam2').value;
    document.querySelectorAll('#bracketButeursHomeList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const buts = parseInt(row.querySelector('.buteur-buts').value) || 1;
        if (nom) buteurs.push({ nom, buts, equipe: team1 });
    });
    document.querySelectorAll('#bracketButeursAwayList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const buts = parseInt(row.querySelector('.buteur-buts').value) || 1;
        if (nom) buteurs.push({ nom, buts, equipe: team2 });
    });
    return buteurs;
}

// ===== CARTONS GROUPES FORMULAIRE =====
function ajouterCarton(side) {
    const homeTeam = document.getElementById('homeTeam').value || 'Domicile';
    const awayTeam = document.getElementById('awayTeam').value || 'Exterieur';
    document.getElementById('cartons-home-title').textContent = homeTeam;
    document.getElementById('cartons-away-title').textContent = awayTeam;
    ajouterCartonLigne(side, '', 'jaune');
}

function ajouterCartonLigne(side, nom, type) {
    const listId = side === 'home' ? 'cartonsHomeList' : 'cartonsAwayList';
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'buteur-row';
    row.innerHTML = `
        <input type="text" class="buteur-nom" placeholder="Nom du joueur" value="${nom || ''}" list="${side === 'home' ? 'homeRosterDatalist' : 'awayRosterDatalist'}">
        <select class="carton-type-select">
            <option value="jaune" ${type === 'jaune' ? 'selected' : ''}>🟨 Jaune</option>
            <option value="rouge" ${type === 'rouge' ? 'selected' : ''}>🟥 Rouge</option>
        </select>
        <button type="button" class="btn-remove-buteur" onclick="this.parentElement.remove()" title="Supprimer">
            <i class="fas fa-times"></i>
        </button>`;
    list.appendChild(row);
    row.querySelector('.buteur-nom').focus();
}

function viderCartonsFormulaire() {
    document.getElementById('cartonsHomeList').innerHTML = '';
    document.getElementById('cartonsAwayList').innerHTML = '';
}

function lireCartonsFormulaire() {
    const cartons = [];
    const homeTeam = document.getElementById('homeTeam').value;
    const awayTeam = document.getElementById('awayTeam').value;
    document.querySelectorAll('#cartonsHomeList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const type = row.querySelector('.carton-type-select').value;
        if (nom) cartons.push({ nom, type, equipe: homeTeam });
    });
    document.querySelectorAll('#cartonsAwayList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const type = row.querySelector('.carton-type-select').value;
        if (nom) cartons.push({ nom, type, equipe: awayTeam });
    });
    return cartons;
}

// ===== CARTONS BRACKET FORMULAIRE =====
function ajouterBracketCarton(side) {
    const team1 = document.getElementById('bracketTeam1').value || 'Equipe 1';
    const team2 = document.getElementById('bracketTeam2').value || 'Equipe 2';
    document.getElementById('bracket-cartons-home-title').textContent = team1;
    document.getElementById('bracket-cartons-away-title').textContent = team2;
    ajouterBracketCartonLigne(side, '', 'jaune');
}

function ajouterBracketCartonLigne(side, nom, type) {
    const listId = side === 'home' ? 'bracketCartonsHomeList' : 'bracketCartonsAwayList';
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'buteur-row';
    row.innerHTML = `
        <input type="text" class="buteur-nom" placeholder="Nom du joueur" value="${nom || ''}" list="bracketRoster${side === 'home' ? 'Home' : 'Away'}Datalist">
        <select class="carton-type-select">
            <option value="jaune" ${type === 'jaune' ? 'selected' : ''}>🟨 Jaune</option>
            <option value="rouge" ${type === 'rouge' ? 'selected' : ''}>🟥 Rouge</option>
        </select>
        <button type="button" class="btn-remove-buteur" onclick="this.parentElement.remove()" title="Supprimer">
            <i class="fas fa-times"></i>
        </button>`;
    list.appendChild(row);
    row.querySelector('.buteur-nom').focus();
}

function viderBracketCartonsFormulaire() {
    document.getElementById('bracketCartonsHomeList').innerHTML = '';
    document.getElementById('bracketCartonsAwayList').innerHTML = '';
}

function lireBracketCartonsFormulaire() {
    const cartons = [];
    const team1 = document.getElementById('bracketTeam1').value;
    const team2 = document.getElementById('bracketTeam2').value;
    document.querySelectorAll('#bracketCartonsHomeList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const type = row.querySelector('.carton-type-select').value;
        if (nom) cartons.push({ nom, type, equipe: team1 });
    });
    document.querySelectorAll('#bracketCartonsAwayList .buteur-row').forEach(row => {
        const nom = row.querySelector('.buteur-nom').value.trim();
        const type = row.querySelector('.carton-type-select').value;
        if (nom) cartons.push({ nom, type, equipe: team2 });
    });
    return cartons;
}

// ===== HISTORIQUE FACE-A-FACE =====
function getH2H(team1, team2) {
    if (!team1 || !team2) return null;
    const matches = [];
    // Matchs groupes
    getData('scores').forEach(s => {
        if (s.status !== 'finished') return;
        if ((s.homeTeam === team1 && s.awayTeam === team2) || (s.homeTeam === team2 && s.awayTeam === team1)) {
            matches.push({ home: s.homeTeam, away: s.awayTeam, homeScore: parseInt(s.homeScore)||0, awayScore: parseInt(s.awayScore)||0, date: s.date, journee: s.journee || '' });
        }
    });
    // Matchs bracket
    const bracketData = getBracketData();
    ['quarters', 'semis', 'final'].forEach(phase => {
        (bracketData[phase] || []).forEach(m => {
            if (m.status !== 'finished') return;
            if ((m.team1 === team1 && m.team2 === team2) || (m.team1 === team2 && m.team2 === team1)) {
                matches.push({ home: m.team1, away: m.team2, homeScore: parseInt(m.score1)||0, awayScore: parseInt(m.score2)||0, date: m.date, journee: phase === 'quarters' ? 'Quart' : phase === 'semis' ? 'Demi' : 'Finale' });
            }
        });
    });
    if (matches.length === 0) return null;
    let v1 = 0, nuls = 0, v2 = 0;
    matches.forEach(m => {
        const s1 = m.home === team1 ? m.homeScore : m.awayScore;
        const s2 = m.home === team1 ? m.awayScore : m.homeScore;
        if (s1 > s2) v1++;
        else if (s2 > s1) v2++;
        else nuls++;
    });
    return { matches, v1, nuls, v2 };
}

function renderH2HBlock(team1, team2) {
    const h2h = getH2H(team1, team2);
    if (!h2h) return '';
    return `
    <div class="match-h2h">
        <div class="h2h-title"><i class="fas fa-history"></i> Face-a-face</div>
        <div class="h2h-stats">
            <span class="h2h-stat h2h-v1">${h2h.v1}V</span>
            <span class="h2h-stat h2h-nul">${h2h.nuls}N</span>
            <span class="h2h-stat h2h-v2">${h2h.v2}V</span>
        </div>
        <div class="h2h-rows">
            ${h2h.matches.map(m => {
                const dateStr = m.date ? formatDate(m.date.split('T')[0]) : '';
                return `<div class="h2h-row">
                    <span class="h2h-team">${m.home}</span>
                    <span class="h2h-score">${m.homeScore} - ${m.awayScore}</span>
                    <span class="h2h-team">${m.away}</span>
                    <span class="h2h-date">${dateStr}</span>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

// ===== PRONOSTICS =====
function getPronostics() {
    try { return JSON.parse(localStorage.getItem('to_pronostics') || '{}'); } catch(e) { return {}; }
}

function setPronostics(data) {
    localStorage.setItem('to_pronostics', JSON.stringify(data));
}

function getMyVotes() {
    try { return JSON.parse(localStorage.getItem('to_my_votes') || '{}'); } catch(e) { return {}; }
}

function setMyVotes(data) {
    localStorage.setItem('to_my_votes', JSON.stringify(data));
}

function renderPronostics() {
    const grid = document.getElementById('pronosticsGrid');
    const emptyEl = document.getElementById('pronosticsEmpty');
    if (!grid) return;

    const scores = getData('scores');
    const upcoming = scores.filter(s => s.status === 'upcoming' && s.date);
    const pronostics = getPronostics();
    const myVotes = getMyVotes();

    if (upcoming.length === 0) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = upcoming.slice(0, 6).map(s => {
        const matchProno = pronostics[s.id] || { home: 0, draw: 0, away: 0 };
        const total = matchProno.home + matchProno.draw + matchProno.away;
        const pHome = total > 0 ? Math.round(matchProno.home / total * 100) : 0;
        const pDraw = total > 0 ? Math.round(matchProno.draw / total * 100) : 0;
        const pAway = total > 0 ? 100 - pHome - pDraw : 0;
        const myVote = myVotes[s.id] || null;
        const dateStr = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        const heure = new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        return `
        <div class="prono-card">
            <div class="prono-header">
                <span class="prono-date">${dateStr} · ${heure}</span>
                ${s.journee ? `<span class="prono-journee">${s.journee}</span>` : ''}
            </div>
            <div class="prono-teams">
                <div class="prono-team">
                    <div class="prono-team-name">${s.homeTeam}</div>
                    <button class="prono-vote-btn ${myVote === 'home' ? 'voted' : ''}" onclick="votePronostic('${s.id}','home')">
                        ${myVote === 'home' ? '<i class="fas fa-check"></i> ' : ''}Victoire
                    </button>
                </div>
                <button class="prono-draw-btn ${myVote === 'draw' ? 'voted' : ''}" onclick="votePronostic('${s.id}','draw')">
                    ${myVote === 'draw' ? '<i class="fas fa-check"></i>' : 'Nul'}
                </button>
                <div class="prono-team">
                    <div class="prono-team-name">${s.awayTeam}</div>
                    <button class="prono-vote-btn ${myVote === 'away' ? 'voted' : ''}" onclick="votePronostic('${s.id}','away')">
                        ${myVote === 'away' ? '<i class="fas fa-check"></i> ' : ''}Victoire
                    </button>
                </div>
            </div>
            ${total > 0 ? `
            <div class="prono-results">
                <div class="prono-bar">
                    <div class="prono-bar-home" style="width:${pHome}%"></div>
                    <div class="prono-bar-draw" style="width:${pDraw}%"></div>
                    <div class="prono-bar-away" style="width:${pAway}%"></div>
                </div>
                <div class="prono-percentages">
                    <span>${pHome}%</span>
                    <span>${pDraw}%</span>
                    <span>${pAway}%</span>
                </div>
                <div class="prono-total-votes">${total} vote${total > 1 ? 's' : ''}</div>
            </div>` : ''}
        </div>`;
    }).join('');
}

function votePronostic(matchId, choice) {
    const myVotes = getMyVotes();
    const pronostics = getPronostics();

    // Remove previous vote if exists
    if (myVotes[matchId]) {
        const prev = myVotes[matchId];
        if (pronostics[matchId] && pronostics[matchId][prev] > 0) {
            pronostics[matchId][prev]--;
        }
    }

    // If clicking same choice, remove vote
    if (myVotes[matchId] === choice) {
        delete myVotes[matchId];
    } else {
        myVotes[matchId] = choice;
        if (!pronostics[matchId]) pronostics[matchId] = { home: 0, draw: 0, away: 0 };
        pronostics[matchId][choice]++;
    }

    setMyVotes(myVotes);
    setPronostics(pronostics);
    renderPronostics();
}

// ===== PENALTY FIELDS =====
function togglePenaltyFields() {
    const checked = document.getElementById('bracketHasPenalties').checked;
    document.getElementById('penaltyFields').style.display = checked ? 'grid' : 'none';
}

function showPenaltySectionIfFinished() {
    const status = document.getElementById('bracketStatus').value;
    const section = document.getElementById('penaltySection');
    if (section) section.style.display = (status === 'finished') ? 'block' : 'none';
}

// Listen to status change to show/hide penalty section
document.addEventListener('DOMContentLoaded', () => {
    const statusSelect = document.getElementById('bracketStatus');
    if (statusSelect) {
        statusSelect.addEventListener('change', showPenaltySectionIfFinished);
    }
    // Also update penalty labels when team names change
    const bt1 = document.getElementById('bracketTeam1');
    const bt2 = document.getElementById('bracketTeam2');
    if (bt1) bt1.addEventListener('input', () => { document.getElementById('penLabel1').textContent = 'Penalties ' + (bt1.value || 'Equipe 1'); });
    if (bt2) bt2.addEventListener('input', () => { document.getElementById('penLabel2').textContent = 'Penalties ' + (bt2.value || 'Equipe 2'); });
});

// ===== FINALE SPOTLIGHT POPUP =====
function showFinaleSpotlight() {
    const data = getBracketData();
    const f = data.final || [];
    if (f.length === 0) return;

    // Check if there's a finale match with at least one team set
    const finale = f[0];
    if (!finale || (!finale.team1 && !finale.team2)) return;

    // Don't show if user already dismissed it this session (based on teams + status)
    const dismissKey = 'fsp_' + (finale.team1||'') + '_' + (finale.team2||'') + '_' + finale.status;
    if (sessionStorage.getItem(dismissKey)) return;

    const s1 = parseInt(finale.score1) || 0;
    const s2 = parseInt(finale.score2) || 0;
    const isFinished = finale.status === 'finished';
    const isLive = finale.status === 'live';
    const isUpcoming = finale.status === 'upcoming';
    const hasPen = !!finale.hasPenalties;
    const pen1 = parseInt(finale.pen1) || 0;
    const pen2 = parseInt(finale.pen2) || 0;
    const winner = isFinished ? (hasPen ? (pen1 > pen2 ? finale.team1 : finale.team2) : (s1 > s2 ? finale.team1 : finale.team2)) : '';

    const dateStr = finale.date ? new Date(finale.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const heureStr = finale.date ? new Date(finale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

    // Buteurs
    const homeScorers = Array.isArray(finale.buteurs) ? finale.buteurs.filter(b => b.equipe === finale.team1) : [];
    const awayScorers = Array.isArray(finale.buteurs) ? finale.buteurs.filter(b => b.equipe === finale.team2) : [];

    let html = `
    <div class="fsp-container ${isLive ? 'fsp-live' : ''} ${isFinished ? 'fsp-finished' : ''}">
        <div class="fsp-particles"></div>
        <div class="fsp-header">
            <div class="fsp-trophy-icon">🏆</div>
            <div class="fsp-title">${isFinished ? 'RÉSULTAT DE LA FINALE' : isLive ? 'FINALE EN DIRECT !' : 'GRANDE FINALE'}</div>
            <div class="fsp-subtitle">Tournoi Ramadan 2026 - Taourirt-Ouablaa</div>
            ${dateStr ? `<div class="fsp-date">${dateStr}${heureStr ? ' · ' + heureStr : ''}</div>` : ''}
        </div>
        <div class="fsp-match">
            <div class="fsp-team fsp-team-left ${isFinished && winner === finale.team1 ? 'fsp-winner' : ''}">
                <div class="fsp-team-shield"><i class="fas fa-shield-alt"></i></div>
                <div class="fsp-team-name">${finale.team1 || 'A déterminer'}</div>
                ${isFinished && winner === finale.team1 ? '<div class="fsp-crown">👑</div>' : ''}
            </div>
            <div class="fsp-score-block">
                ${isUpcoming
                    ? `<div class="fsp-vs">VS</div>${heureStr ? `<div class="fsp-kickoff">${heureStr}</div>` : ''}`
                    : `<div class="fsp-score">${s1} - ${s2}</div>`}
                ${hasPen && isFinished ? `<div class="fsp-penalties">TAB: ${pen1} - ${pen2}</div>` : ''}
                ${isLive ? '<div class="fsp-live-dot"><span class="live-pulse-dot"></span> En cours</div>' : ''}
            </div>
            <div class="fsp-team fsp-team-right ${isFinished && winner === finale.team2 ? 'fsp-winner' : ''}">
                ${isFinished && winner === finale.team2 ? '<div class="fsp-crown">👑</div>' : ''}
                <div class="fsp-team-name">${finale.team2 || 'A déterminer'}</div>
                <div class="fsp-team-shield"><i class="fas fa-shield-alt"></i></div>
            </div>
        </div>
        ${(homeScorers.length || awayScorers.length) ? `
        <div class="fsp-scorers">
            <div class="fsp-scorers-col fsp-scorers-left">
                ${homeScorers.map(b => `<div class="fsp-scorer"><i class="fas fa-futbol"></i> ${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''}</div>`).join('')}
            </div>
            <div class="fsp-scorers-sep"></div>
            <div class="fsp-scorers-col fsp-scorers-right">
                ${awayScorers.map(b => `<div class="fsp-scorer">${b.nom}${(parseInt(b.buts)||1)>1?' x'+b.buts:''} <i class="fas fa-futbol"></i></div>`).join('')}
            </div>
        </div>` : ''}
        ${isFinished && winner ? `
        <div class="fsp-champion">
            <div class="fsp-confetti">🎉</div>
            <div class="fsp-champion-label">CHAMPION DU TOURNOI</div>
            <div class="fsp-champion-name">${winner}</div>
            <div class="fsp-confetti">🎊</div>
        </div>` : ''}
        <button class="fsp-cta" onclick="closeFinaleSpotlight(); window.location.hash='#bracket';">
            <i class="fas fa-sitemap"></i> Voir le bracket complet
        </button>
    </div>`;

    const overlay = document.getElementById('finaleSpotlight');
    const content = document.getElementById('finaleSpotlightContent');
    if (overlay && content) {
        content.innerHTML = html;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeFinaleSpotlight() {
    const overlay = document.getElementById('finaleSpotlight');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
    // Mark as dismissed this session
    const data = getBracketData();
    const f = data.final || [];
    if (f[0]) {
        const dismissKey = 'fsp_' + (f[0].team1||'') + '_' + (f[0].team2||'') + '_' + f[0].status;
        sessionStorage.setItem(dismissKey, '1');
    }
}

// ===== PWA - SERVICE WORKER & INSTALL =====
let deferredInstallPrompt = null;

function initPWA() {
    // Enregistrer le Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((reg) => {
                console.log('[PWA] Service Worker enregistré ✓', reg.scope);
                // Vérifier les mises à jour
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            showToast('Mise à jour disponible ! Rechargez la page.', 'info');
                        }
                    });
                });
            })
            .catch((err) => console.log('[PWA] Erreur SW:', err));
    }

    // Intercepter l'événement d'installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        showInstallBanner();
    });

    // Détection si déjà installé
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        hideInstallBanner();
        showToast('Application installée avec succès ! 📱', 'success');
    });

    // Vérifier si on est en mode standalone (déjà installé)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        console.log('[PWA] Mode application détecté');
    }
}

function showInstallBanner() {
    // Ne pas afficher si déjà fermé récemment
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (dismissed && (Date.now() - parseInt(dismissed)) < 86400000) return; // 24h

    let banner = document.getElementById('pwaBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwaBanner';
        banner.className = 'pwa-banner';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <img src="logo.png" alt="Logo" width="40" height="40">
                </div>
                <div class="pwa-banner-text">
                    <strong>Installer l'application</strong>
                    <span>Accédez au tournoi directement depuis votre écran d'accueil !</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-btn-install" onclick="installPWA()">
                        <i class="fas fa-download"></i> Installer
                    </button>
                    <button class="pwa-btn-close" onclick="dismissInstallBanner()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        // Animation entrée
        requestAnimationFrame(() => banner.classList.add('visible'));
    }
}

function hideInstallBanner() {
    const banner = document.getElementById('pwaBanner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 400);
    }
}

function dismissInstallBanner() {
    localStorage.setItem('pwa_banner_dismissed', String(Date.now()));
    hideInstallBanner();
}

async function installPWA() {
    if (!deferredInstallPrompt) {
        showToast('Utilisez le menu de votre navigateur pour installer l\'app', 'info');
        return;
    }
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') {
        showToast('Installation en cours... 📱', 'success');
    }
    deferredInstallPrompt = null;
    hideInstallBanner();
}

// ===== GLOBAL HANDLERS (INLINE ATTRIBUTES SUPPORT) =====
// Assure que les onclick inline fonctionnent même si le bundling change la portée
window.toggleDarkMode = toggleDarkMode;
window.toggleAdminMode = toggleAdminMode;
window.toggleNotifications = toggleNotifications;
window.openLogs = openLogs;
window.scrollToTop = scrollToTop;
window.closeFinaleSpotlight = closeFinaleSpotlight;
window.installPWA = installPWA;
window.dismissInstallBanner = dismissInstallBanner;
window.togglePenaltyFields = togglePenaltyFields;
window.showPenaltySectionIfFinished = showPenaltySectionIfFinished;
