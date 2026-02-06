-- WinterLine Database Schema
-- Supports scraped real tool data from GitHub, VS Code, Chrome Web Store, Product Hunt

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT DEFAULT '',
  description TEXT NOT NULL,
  short_desc TEXT DEFAULT '',
  full_description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  version TEXT DEFAULT '',
  creator_id INTEGER DEFAULT NULL,
  creator_name TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  github_url TEXT DEFAULT '',
  extension_store_url TEXT DEFAULT '',
  source TEXT DEFAULT 'manual',
  source_id TEXT DEFAULT '',
  rating REAL DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  license TEXT DEFAULT '',
  pricing_model TEXT DEFAULT 'free',
  last_updated TEXT DEFAULT '',
  problem_solved TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  setup_difficulty TEXT DEFAULT '',
  best_for TEXT DEFAULT '',
  alternatives TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tools(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS raw_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  search_query TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  data_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_source ON tools(source);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_github_url ON tools(github_url);
CREATE INDEX IF NOT EXISTS idx_raw_sources_status ON raw_sources(status);
CREATE INDEX IF NOT EXISTS idx_raw_sources_source ON raw_sources(source);
