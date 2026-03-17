-- Tables Supabase pour Taourirt-Ouablaa Football Tournament

-- Table tournois
CREATE TABLE IF NOT EXISTS tournois (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    startDate TEXT,
    endDate TEXT,
    teams INTEGER DEFAULT 0,
    status TEXT DEFAULT 'upcoming',
    description TEXT,
    image TEXT
);

-- Table scores (matchs)
CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    homeTeam TEXT NOT NULL,
    awayTeam TEXT NOT NULL,
    homeScore INTEGER DEFAULT 0,
    awayScore INTEGER DEFAULT 0,
    date TEXT,
    status TEXT DEFAULT 'upcoming',
    journee TEXT,
    buteurs TEXT DEFAULT '[]',
    cartons TEXT DEFAULT '[]'
);

-- Table news
CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    date TEXT,
    image TEXT
);

-- Table gallery
CREATE TABLE IF NOT EXISTS gallery (
    id TEXT PRIMARY KEY,
    title TEXT,
    image TEXT NOT NULL,
    date TEXT
);

-- Table standings (classements par groupe)
CREATE TABLE IF NOT EXISTS standings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    groupe TEXT NOT NULL,
    teams TEXT DEFAULT '[]'
);

-- Table bracket (phase finale)
CREATE TABLE IF NOT EXISTS bracket (
    id TEXT PRIMARY KEY DEFAULT 'default',
    phases TEXT DEFAULT '{}'
);

-- Table backups
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table lastUpdate
CREATE TABLE IF NOT EXISTS lastUpdate (
    id TEXT PRIMARY KEY DEFAULT 'default',
    timestamp TEXT
);

-- Activer Row Level Security (RLS)
ALTER TABLE tournois ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lastUpdate ENABLE ROW LEVEL SECURITY;

-- Politique publique pour lecture
CREATE POLICY "Public read access" ON tournois FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON news FOR SELECT USING (true);
CREATE POLICY "Public read access" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public read access" ON standings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON bracket FOR SELECT USING (true);
CREATE POLICY "Public read access" ON backups FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lastUpdate FOR SELECT USING (true);

-- Politique pour insertion/update (admin seulement - géré par l'app)
CREATE POLICY "Admin full access" ON tournois FOR ALL USING (true);
CREATE POLICY "Admin full access" ON scores FOR ALL USING (true);
CREATE POLICY "Admin full access" ON news FOR ALL USING (true);
CREATE POLICY "Admin full access" ON gallery FOR ALL USING (true);
CREATE POLICY "Admin full access" ON standings FOR ALL USING (true);
CREATE POLICY "Admin full access" ON bracket FOR ALL USING (true);
CREATE POLICY "Admin full access" ON backups FOR ALL USING (true);
CREATE POLICY "Admin full access" ON lastUpdate FOR ALL USING (true);
