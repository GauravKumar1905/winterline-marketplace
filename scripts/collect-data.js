#!/usr/bin/env node
/**
 * WinterLine Data Collection Pipeline
 * Collects Claude/AI tool data from GitHub API and VS Code Marketplace
 * Then cleans, deduplicates, categorizes, and generates value-added descriptions
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const CLEAN_DIR = path.join(DATA_DIR, 'clean');

// GitHub search queries - EXPANDED for 100+ tools
const GITHUB_QUERIES = [
  'Claude API',
  'Claude coding assistant',
  'Claude VS Code extension',
  'Anthropic Claude integration',
  'Claude AI tool',
  'Claude MCP server',
  'Claude Code skill',
  'Anthropic API wrapper',
  'MCP server',
  'Model Context Protocol',
  'Claude SDK',
  'Claude plugin',
  'Claude assistant',
  'Claude automation',
  'Anthropic SDK',
  'Claude AI integration',
  'Claude developer tool',
  'Claude API client',
  'Claude chatbot',
  'Claude agent',
  'Anthropic API client',
  'Claude CLI',
];

// VS Code Marketplace search queries
const VSCODE_QUERIES = [
  'Claude',
  'Anthropic',
  'Claude AI',
  'Claude coding',
  'AI assistant',
  'code completion AI',
  'MCP',
];

// npm Registry search queries
const NPM_QUERIES = [
  'claude',
  'anthropic',
  'mcp-server',
  'claude-ai',
  'model-context-protocol',
];

// Awesome lists to parse
const AWESOME_LISTS = [
  'awesome-claude-dev/awesome-claude',
  'punkpeye/awesome-mcp-servers',
  'modelcontextprotocol/servers',
];

// Category mapping keywords
const CATEGORY_MAP = {
  'VS Code Extension': ['vscode', 'vs code', 'visual studio code', 'extension', 'editor'],
  'CLI Tool': ['cli', 'terminal', 'command line', 'command-line', 'shell'],
  'API Wrapper': ['api', 'sdk', 'wrapper', 'client', 'library'],
  'Browser Extension': ['chrome', 'browser', 'extension', 'firefox'],
  'MCP Server': ['mcp', 'model context protocol', 'mcp server'],
  'AI Agent': ['agent', 'autonomous', 'agentic', 'workflow'],
  'Code Generation': ['code generation', 'code gen', 'codegen', 'copilot', 'autocomplete'],
  'Productivity': ['productivity', 'automation', 'workflow', 'task'],
  'Writing': ['writing', 'content', 'copywriting', 'text'],
  'Data Analysis': ['data', 'analysis', 'analytics', 'visualization'],
  'Education': ['education', 'learning', 'tutorial', 'course'],
  'Chat Interface': ['chat', 'chatbot', 'conversation', 'ui', 'interface'],
};

// ============================================================================
// HTTP HELPERS
// ============================================================================

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'WinterLine-DataCollector/1.0',
        'Accept': 'application/json',
        ...headers,
      },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'User-Agent': 'WinterLine-DataCollector/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// GITHUB COLLECTOR
// ============================================================================

async function collectGitHub() {
  console.log('\n=== GITHUB COLLECTION ===\n');
  const allRepos = [];
  const seenUrls = new Set();

  for (const query of GITHUB_QUERIES) {
    console.log(`  Searching: "${query}"`);
    try {
      // GitHub API: 10 requests/min unauthenticated, 5000/hour authenticated
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100`;
      const data = await httpGet(url);

      if (data.items) {
        for (const repo of data.items) {
          if (seenUrls.has(repo.html_url)) continue;
          seenUrls.add(repo.html_url);

          allRepos.push({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || '',
            url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language || '',
            license: repo.license ? repo.license.spdx_id : '',
            topics: repo.topics || [],
            last_updated: repo.updated_at,
            created_at: repo.created_at,
            owner: repo.owner.login,
            homepage: repo.homepage || '',
            open_issues: repo.open_issues_count,
            watchers: repo.watchers_count,
            default_branch: repo.default_branch,
            archived: repo.archived,
            search_query: query,
          });
        }
        console.log(`    Found ${data.items.length} repos (${allRepos.length} unique total)`);
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
    // Rate limit: wait between requests
    await sleep(2000);
  }

  // Filter out archived repos and those with 0 stars
  const filtered = allRepos.filter(r => !r.archived && r.stars > 0);
  console.log(`\n  Total unique repos: ${allRepos.length}`);
  console.log(`  After filtering (active, >0 stars): ${filtered.length}`);

  return filtered;
}

// ============================================================================
// VS CODE MARKETPLACE COLLECTOR
// ============================================================================

async function collectVSCode() {
  console.log('\n=== VS CODE MARKETPLACE COLLECTION ===\n');
  const allExtensions = [];
  const seenIds = new Set();

  for (const query of VSCODE_QUERIES) {
    console.log(`  Searching: "${query}"`);
    try {
      // VS Code Marketplace uses a gallery API
      const body = {
        filters: [{
          criteria: [
            { filterType: 8, value: 'Microsoft.VisualStudio.Code' },
            { filterType: 10, value: query },
          ],
          pageNumber: 1,
          pageSize: 30,
          sortBy: 4, // Installs
          sortOrder: 2, // Descending
        }],
        assetTypes: [],
        flags: 914, // Include statistics
      };

      const data = await httpPost(
        'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
        body,
        { 'Accept': 'application/json;api-version=3.0-preview.1' }
      );

      if (data.results && data.results[0] && data.results[0].extensions) {
        for (const ext of data.results[0].extensions) {
          if (seenIds.has(ext.extensionId)) continue;
          seenIds.add(ext.extensionId);

          // Extract statistics
          const stats = {};
          if (ext.statistics) {
            for (const s of ext.statistics) {
              stats[s.statisticName] = s.value;
            }
          }

          allExtensions.push({
            extensionId: ext.extensionId,
            name: ext.extensionName,
            displayName: ext.displayName,
            publisher: ext.publisher.publisherName,
            publisherDisplayName: ext.publisher.displayName,
            shortDescription: ext.shortDescription || '',
            installs: Math.round(stats.install || 0),
            rating: Math.round((stats.averagerating || 0) * 10) / 10,
            ratingCount: Math.round(stats.ratingcount || 0),
            version: ext.versions && ext.versions[0] ? ext.versions[0].version : '',
            lastUpdated: ext.versions && ext.versions[0] ? ext.versions[0].lastUpdated : '',
            url: `https://marketplace.visualstudio.com/items?itemName=${ext.publisher.publisherName}.${ext.extensionName}`,
            search_query: query,
          });
        }
        console.log(`    Found ${data.results[0].extensions.length} extensions (${allExtensions.length} unique total)`);
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
    await sleep(1500);
  }

  console.log(`\n  Total unique extensions: ${allExtensions.length}`);
  return allExtensions;
}

// ============================================================================
// NPM REGISTRY COLLECTOR
// ============================================================================

async function collectNPM() {
  console.log('\n=== NPM REGISTRY COLLECTION ===\n');
  const allPackages = [];
  const seenNames = new Set();

  for (const query of NPM_QUERIES) {
    console.log(`  Searching: "${query}"`);
    try {
      // npm registry search API
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=50`;
      const data = await httpGet(url);

      if (data.objects) {
        for (const obj of data.objects) {
          const pkg = obj.package;
          if (seenNames.has(pkg.name)) continue;
          seenNames.add(pkg.name);

          allPackages.push({
            name: pkg.name,
            description: pkg.description || '',
            version: pkg.version,
            author: pkg.author ? pkg.author.name : (pkg.publisher ? pkg.publisher.username : ''),
            homepage: pkg.links.homepage || pkg.links.repository || '',
            repository: pkg.links.repository || '',
            npm_url: pkg.links.npm,
            keywords: pkg.keywords || [],
            license: pkg.license || '',
            date: pkg.date,
            search_query: query,
          });
        }
        console.log(`    Found ${data.objects.length} packages (${allPackages.length} unique total)`);
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
    await sleep(1000);
  }

  console.log(`\n  Total unique packages: ${allPackages.length}`);
  return allPackages;
}

// ============================================================================
// AWESOME LISTS COLLECTOR
// ============================================================================

async function collectAwesomeLists() {
  console.log('\n=== AWESOME LISTS COLLECTION ===\n');
  const allTools = [];
  const seenUrls = new Set();

  for (const repo of AWESOME_LISTS) {
    console.log(`  Parsing: ${repo}`);
    try {
      // Get README.md content from GitHub
      const url = `https://api.github.com/repos/${repo}/readme`;
      const data = await httpGet(url);

      if (data.content) {
        // Decode base64 content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        // Parse markdown links: [text](url)
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
          const [, title, url] = match;

          // Filter for GitHub repos and relevant links
          if ((url.includes('github.com') || url.includes('npmjs.com')) && !seenUrls.has(url)) {
            seenUrls.add(url);

            // Extract description from surrounding text (simple heuristic)
            const startIdx = Math.max(0, match.index - 200);
            const endIdx = Math.min(content.length, match.index + 200);
            const context = content.substring(startIdx, endIdx);
            const descMatch = context.match(/[-•]\s*([^-•\n]+)/);
            const description = descMatch ? descMatch[1].trim() : title;

            allTools.push({
              name: title,
              url: url,
              description: description.substring(0, 200),
              source_repo: repo,
            });
          }
        }
        console.log(`    Extracted ${allTools.length} tools from ${repo}`);
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
    await sleep(2000);
  }

  console.log(`\n  Total tools from awesome lists: ${allTools.length}`);
  return allTools;
}

// ============================================================================
// DATA CLEANING & ENRICHMENT
// ============================================================================

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function categorize(name, description, topics = []) {
  const text = `${name} ${description} ${topics.join(' ')}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return category;
    }
  }
  return 'Other';
}

function determinePricing(description, license) {
  const text = (description || '').toLowerCase();
  if (text.includes('paid') || text.includes('subscription') || text.includes('premium')) return 'paid';
  if (text.includes('freemium') || text.includes('free tier')) return 'freemium';
  return 'free';
}

function determineSetupDifficulty(description, topics = []) {
  const text = `${description} ${topics.join(' ')}`.toLowerCase();
  if (text.includes('docker') || text.includes('kubernetes') || text.includes('terraform')) return 'advanced';
  if (text.includes('npm install') || text.includes('pip install') || text.includes('easy')) return 'beginner';
  if (text.includes('api key') || text.includes('configuration')) return 'intermediate';
  return 'intermediate';
}

function determineTargetAudience(description, category) {
  const text = (description || '').toLowerCase();
  if (text.includes('beginner') || text.includes('no-code') || text.includes('non-technical')) return 'beginners';
  if (text.includes('enterprise') || text.includes('team') || text.includes('organization')) return 'enterprise';
  if (text.includes('developer') || text.includes('coding') || text.includes('api')) return 'developers';
  return 'developers';
}

function generateProblemSolved(name, description) {
  const d = (description || '').toLowerCase();
  if (d.includes('code') || d.includes('coding') || d.includes('programming')) {
    return `Helps developers write, review, and improve code using Claude AI`;
  }
  if (d.includes('chat') || d.includes('conversation')) {
    return `Provides a conversational interface to interact with Claude AI`;
  }
  if (d.includes('api') || d.includes('sdk') || d.includes('wrapper')) {
    return `Simplifies integration with the Anthropic Claude API`;
  }
  if (d.includes('extension') || d.includes('browser') || d.includes('chrome')) {
    return `Brings Claude AI capabilities directly into your browser`;
  }
  if (d.includes('mcp') || d.includes('model context')) {
    return `Extends Claude's capabilities through the Model Context Protocol`;
  }
  if (d.includes('agent') || d.includes('autonomous')) {
    return `Enables building autonomous AI agents powered by Claude`;
  }
  return `Provides AI-powered tools and integrations using Claude`;
}

function generateBestFor(category, description) {
  const map = {
    'VS Code Extension': 'developers using VS Code who want AI-assisted coding',
    'CLI Tool': 'developers comfortable with terminal who want quick AI access',
    'API Wrapper': 'developers building applications on top of Claude API',
    'Browser Extension': 'anyone who wants Claude AI integrated in their browser',
    'MCP Server': 'developers extending Claude Code with custom tools',
    'AI Agent': 'teams building automated workflows with AI',
    'Code Generation': 'developers looking to speed up coding with AI',
    'Productivity': 'professionals who want to automate repetitive tasks',
    'Writing': 'content creators and writers using AI assistance',
    'Data Analysis': 'analysts working with data who need AI insights',
    'Education': 'students and educators using AI for learning',
    'Chat Interface': 'users who prefer a chat-based interaction with Claude',
  };
  return map[category] || 'anyone looking to leverage Claude AI';
}

function cleanGitHubRepos(repos) {
  console.log('\n=== CLEANING GITHUB DATA ===\n');

  return repos.map(repo => {
    const category = categorize(repo.name, repo.description, repo.topics);
    const pricing = determinePricing(repo.description, repo.license);
    const difficulty = determineSetupDifficulty(repo.description, repo.topics);
    const audience = determineTargetAudience(repo.description, category);

    return {
      name: repo.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      slug: slugify(repo.name),
      short_desc: (repo.description || '').substring(0, 150),
      description: repo.description || `A Claude AI tool by ${repo.owner}`,
      full_description: repo.description || '',
      category,
      version: '',
      creator_name: repo.owner,
      icon_url: `https://github.com/${repo.owner}.png?size=64`,
      website_url: repo.homepage || repo.url,
      github_url: repo.url,
      extension_store_url: '',
      source: 'github',
      source_id: repo.full_name,
      rating: Math.min(5, Math.max(1, 3 + (Math.log10(repo.stars + 1) / 2))),
      download_count: repo.stars * 10, // Estimate
      install_count: 0,
      stars: repo.stars,
      tags: JSON.stringify([
        ...repo.topics.slice(0, 5),
        repo.language ? repo.language.toLowerCase() : null,
      ].filter(Boolean)),
      license: repo.license || '',
      pricing_model: pricing,
      last_updated: repo.last_updated,
      problem_solved: generateProblemSolved(repo.name, repo.description),
      target_audience: audience,
      setup_difficulty: difficulty,
      best_for: generateBestFor(category, repo.description),
      alternatives: '',
    };
  });
}

function cleanVSCodeExtensions(extensions) {
  console.log('\n=== CLEANING VS CODE DATA ===\n');

  return extensions.map(ext => {
    const category = 'VS Code Extension';
    const difficulty = 'beginner';

    return {
      name: ext.displayName || ext.name,
      slug: slugify(ext.name),
      short_desc: (ext.shortDescription || '').substring(0, 150),
      description: ext.shortDescription || `VS Code extension by ${ext.publisherDisplayName}`,
      full_description: ext.shortDescription || '',
      category,
      version: ext.version,
      creator_name: ext.publisherDisplayName || ext.publisher,
      icon_url: '',
      website_url: ext.url,
      github_url: '',
      extension_store_url: ext.url,
      source: 'vscode',
      source_id: ext.extensionId,
      rating: ext.rating || 0,
      download_count: ext.installs || 0,
      install_count: ext.installs || 0,
      stars: 0,
      tags: JSON.stringify(['vscode', 'extension', 'claude', 'ai'].slice(0, 5)),
      license: '',
      pricing_model: 'free',
      last_updated: ext.lastUpdated || '',
      problem_solved: 'Brings Claude AI assistance directly into VS Code editor',
      target_audience: 'developers',
      setup_difficulty: difficulty,
      best_for: 'developers using VS Code who want AI-assisted coding',
      alternatives: '',
    };
  });
}

function cleanNPMPackages(packages) {
  console.log('\n=== CLEANING NPM DATA ===\n');

  return packages.map(pkg => {
    const category = categorize(pkg.name, pkg.description, pkg.keywords);
    const pricing = 'free';
    const difficulty = determineSetupDifficulty(pkg.description, pkg.keywords);
    const audience = determineTargetAudience(pkg.description, category);

    return {
      name: pkg.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      slug: slugify(pkg.name),
      short_desc: (pkg.description || '').substring(0, 150),
      description: pkg.description || `npm package by ${pkg.author}`,
      full_description: pkg.description || '',
      category,
      version: pkg.version,
      creator_name: pkg.author || 'Unknown',
      icon_url: '',
      website_url: pkg.homepage || pkg.npm_url,
      github_url: pkg.repository || '',
      extension_store_url: pkg.npm_url,
      source: 'npm',
      source_id: pkg.name,
      rating: 3.5,
      download_count: 0,
      install_count: 0,
      stars: 0,
      tags: JSON.stringify([...pkg.keywords.slice(0, 4), 'npm'].filter(Boolean)),
      license: pkg.license || '',
      pricing_model: pricing,
      last_updated: pkg.date || '',
      problem_solved: generateProblemSolved(pkg.name, pkg.description),
      target_audience: audience,
      setup_difficulty: difficulty,
      best_for: generateBestFor(category, pkg.description),
      alternatives: '',
    };
  });
}

function cleanAwesomeListTools(tools) {
  console.log('\n=== CLEANING AWESOME LISTS DATA ===\n');

  return tools.map(tool => {
    const isGitHub = tool.url.includes('github.com');
    const category = categorize(tool.name, tool.description, []);
    const difficulty = 'intermediate';

    return {
      name: tool.name,
      slug: slugify(tool.name),
      short_desc: (tool.description || '').substring(0, 150),
      description: tool.description || tool.name,
      full_description: tool.description || '',
      category,
      version: '',
      creator_name: 'Community',
      icon_url: '',
      website_url: tool.url,
      github_url: isGitHub ? tool.url : '',
      extension_store_url: '',
      source: 'awesome-list',
      source_id: tool.url,
      rating: 4.0,
      download_count: 0,
      install_count: 0,
      stars: 0,
      tags: JSON.stringify(['community', 'awesome-list'].filter(Boolean)),
      license: '',
      pricing_model: 'free',
      last_updated: '',
      problem_solved: generateProblemSolved(tool.name, tool.description),
      target_audience: 'developers',
      setup_difficulty: difficulty,
      best_for: generateBestFor(category, tool.description),
      alternatives: '',
    };
  });
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

function deduplicateTools(tools) {
  console.log('\n=== DEDUPLICATION ===\n');
  console.log(`  Input: ${tools.length} tools`);

  const seen = new Map(); // slug -> tool (keep best version)

  for (const tool of tools) {
    const key = tool.slug;

    // Also check by github_url or extension_store_url
    let existingKey = null;
    if (tool.github_url) {
      for (const [k, v] of seen) {
        if (v.github_url === tool.github_url) { existingKey = k; break; }
      }
    }
    if (!existingKey && tool.extension_store_url) {
      for (const [k, v] of seen) {
        if (v.extension_store_url === tool.extension_store_url) { existingKey = k; break; }
      }
    }

    // Fuzzy name match
    if (!existingKey) {
      const normalizedName = tool.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of seen) {
        const existingNorm = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedName === existingNorm) { existingKey = k; break; }
      }
    }

    const effectiveKey = existingKey || key;

    if (seen.has(effectiveKey)) {
      const existing = seen.get(effectiveKey);
      // Merge: keep the one with more data
      if (tool.stars > (existing.stars || 0)) {
        // Merge fields from existing that new one is missing
        if (!tool.extension_store_url && existing.extension_store_url) {
          tool.extension_store_url = existing.extension_store_url;
        }
        if (!tool.github_url && existing.github_url) {
          tool.github_url = existing.github_url;
        }
        tool.install_count = Math.max(tool.install_count || 0, existing.install_count || 0);
        tool.download_count = Math.max(tool.download_count || 0, existing.download_count || 0);
        seen.set(effectiveKey, tool);
      } else {
        // Merge into existing
        if (!existing.extension_store_url && tool.extension_store_url) {
          existing.extension_store_url = tool.extension_store_url;
        }
        if (!existing.github_url && tool.github_url) {
          existing.github_url = tool.github_url;
        }
        existing.install_count = Math.max(tool.install_count || 0, existing.install_count || 0);
        existing.download_count = Math.max(tool.download_count || 0, existing.download_count || 0);
      }
    } else {
      seen.set(effectiveKey, tool);
    }
  }

  const deduped = Array.from(seen.values());
  console.log(`  Output: ${deduped.length} unique tools`);
  console.log(`  Removed ${tools.length - deduped.length} duplicates`);

  return deduped;
}

// ============================================================================
// QUALITY FILTER
// ============================================================================

function qualityFilter(tools) {
  console.log('\n=== QUALITY FILTER ===\n');

  const filtered = tools.filter(tool => {
    // Must have a name and description
    if (!tool.name || tool.name.length < 2) return false;
    if (!tool.description || tool.description.length < 10) return false;

    // For GitHub: require at least 2 stars
    if (tool.source === 'github' && tool.stars < 2) return false;

    // For VS Code: require at least some installs or rating
    if (tool.source === 'vscode' && tool.install_count < 5 && tool.rating === 0) return false;

    return true;
  });

  // Sort by relevance: stars + installs
  filtered.sort((a, b) => {
    const scoreA = (a.stars || 0) * 10 + (a.install_count || 0) + (a.download_count || 0);
    const scoreB = (b.stars || 0) * 10 + (b.install_count || 0) + (b.download_count || 0);
    return scoreB - scoreA;
  });

  console.log(`  Kept ${filtered.length} of ${tools.length} tools after quality filter`);
  return filtered;
}

// ============================================================================
// SQL GENERATION
// ============================================================================

function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}

function generateSeedSQL(tools) {
  let sql = '-- Auto-generated seed data from WinterLine Data Collector\n';
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Total tools: ${tools.length}\n\n`;

  // Categories
  sql += '-- Categories\n';
  const categories = [...new Set(tools.map(t => t.category))];
  for (const cat of categories) {
    const slug = slugify(cat);
    sql += `INSERT OR IGNORE INTO categories (name, slug, icon) VALUES ('${escapeSql(cat)}', '${escapeSql(slug)}', '');\n`;
  }

  // System user for scraped data
  sql += '\n-- System user for scraped tools\n';
  sql += `INSERT OR IGNORE INTO users (username, email, password_hash, bio) VALUES ('winterline_bot', 'bot@winterline.dev', '$2a$10$0HN2eSDfIQcQMcaxU7HTnO2RZntdhQGbED0f/ER9qhPY6Oiknrv7a', 'Automated data collection bot');\n\n`;

  // Tools
  sql += '-- Tools\n';
  for (const tool of tools) {
    sql += `INSERT INTO tools (name, slug, description, short_desc, full_description, category, version, creator_name, icon_url, website_url, github_url, extension_store_url, source, source_id, rating, download_count, install_count, stars, tags, license, pricing_model, last_updated, problem_solved, target_audience, setup_difficulty, best_for, alternatives) VALUES (`;
    sql += `'${escapeSql(tool.name)}', `;
    sql += `'${escapeSql(tool.slug)}', `;
    sql += `'${escapeSql(tool.description)}', `;
    sql += `'${escapeSql(tool.short_desc)}', `;
    sql += `'${escapeSql(tool.full_description)}', `;
    sql += `'${escapeSql(tool.category)}', `;
    sql += `'${escapeSql(tool.version)}', `;
    sql += `'${escapeSql(tool.creator_name)}', `;
    sql += `'${escapeSql(tool.icon_url)}', `;
    sql += `'${escapeSql(tool.website_url)}', `;
    sql += `'${escapeSql(tool.github_url)}', `;
    sql += `'${escapeSql(tool.extension_store_url)}', `;
    sql += `'${escapeSql(tool.source)}', `;
    sql += `'${escapeSql(tool.source_id)}', `;
    sql += `${tool.rating.toFixed(1)}, `;
    sql += `${tool.download_count}, `;
    sql += `${tool.install_count}, `;
    sql += `${tool.stars}, `;
    sql += `'${escapeSql(tool.tags)}', `;
    sql += `'${escapeSql(tool.license)}', `;
    sql += `'${escapeSql(tool.pricing_model)}', `;
    sql += `'${escapeSql(tool.last_updated)}', `;
    sql += `'${escapeSql(tool.problem_solved)}', `;
    sql += `'${escapeSql(tool.target_audience)}', `;
    sql += `'${escapeSql(tool.setup_difficulty)}', `;
    sql += `'${escapeSql(tool.best_for)}', `;
    sql += `'${escapeSql(tool.alternatives)}'`;
    sql += `);\n`;
  }

  return sql;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('  WinterLine Data Collection Pipeline');
  console.log('========================================');

  // Create directories
  [DATA_DIR, RAW_DIR, CLEAN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Step 1: Collect raw data from ALL sources
  console.log('\nSTEP 1: COLLECTING RAW DATA FROM ALL SOURCES...');
  const githubRepos = await collectGitHub();
  const vscodeExtensions = await collectVSCode();
  const npmPackages = await collectNPM();
  const awesomeTools = await collectAwesomeLists();

  // Save raw data
  fs.writeFileSync(path.join(RAW_DIR, 'github-raw.json'), JSON.stringify(githubRepos, null, 2));
  fs.writeFileSync(path.join(RAW_DIR, 'vscode-raw.json'), JSON.stringify(vscodeExtensions, null, 2));
  fs.writeFileSync(path.join(RAW_DIR, 'npm-raw.json'), JSON.stringify(npmPackages, null, 2));
  fs.writeFileSync(path.join(RAW_DIR, 'awesome-raw.json'), JSON.stringify(awesomeTools, null, 2));
  console.log(`\n  Saved raw data:`);
  console.log(`    GitHub: ${githubRepos.length} repos`);
  console.log(`    VS Code: ${vscodeExtensions.length} extensions`);
  console.log(`    npm: ${npmPackages.length} packages`);
  console.log(`    Awesome Lists: ${awesomeTools.length} tools`);

  // Step 2: Clean data from all sources
  console.log('\nSTEP 2: CLEANING DATA FROM ALL SOURCES...');
  const cleanedGitHub = cleanGitHubRepos(githubRepos);
  const cleanedVSCode = cleanVSCodeExtensions(vscodeExtensions);
  const cleanedNPM = cleanNPMPackages(npmPackages);
  const cleanedAwesome = cleanAwesomeListTools(awesomeTools);

  // Step 3: Merge and deduplicate
  console.log('\nSTEP 3: MERGING & DEDUPLICATING...');
  const allTools = [...cleanedGitHub, ...cleanedVSCode, ...cleanedNPM, ...cleanedAwesome];
  const dedupedTools = deduplicateTools(allTools);

  // Step 4: Quality filter
  console.log('\nSTEP 4: QUALITY FILTER...');
  const qualityTools = qualityFilter(dedupedTools);

  // Save clean data
  fs.writeFileSync(path.join(CLEAN_DIR, 'tools-clean.json'), JSON.stringify(qualityTools, null, 2));
  console.log(`\n  Saved clean data: ${qualityTools.length} tools`);

  // Step 5: Generate seed SQL
  console.log('\nSTEP 5: GENERATING SEED SQL...');
  const seedSQL = generateSeedSQL(qualityTools);
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
  fs.writeFileSync(seedPath, seedSQL);
  console.log(`  Saved to: ${seedPath}`);

  // Summary
  console.log('\n========================================');
  console.log('  COLLECTION SUMMARY');
  console.log('========================================');
  console.log(`  GitHub repos collected:    ${githubRepos.length}`);
  console.log(`  VS Code extensions:        ${vscodeExtensions.length}`);
  console.log(`  npm packages:              ${npmPackages.length}`);
  console.log(`  Awesome Lists tools:       ${awesomeTools.length}`);
  console.log(`  Total raw collected:       ${githubRepos.length + vscodeExtensions.length + npmPackages.length + awesomeTools.length}`);
  console.log(`  After cleaning:            ${allTools.length}`);
  console.log(`  After dedup:               ${dedupedTools.length}`);
  console.log(`  After quality filter:      ${qualityTools.length}`);
  console.log(`  Categories found:          ${[...new Set(qualityTools.map(t => t.category))].length}`);

  // Category breakdown
  const catCounts = {};
  for (const t of qualityTools) {
    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  }
  console.log('\n  Category breakdown:');
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  // Source breakdown
  const srcCounts = {};
  for (const t of qualityTools) {
    srcCounts[t.source] = (srcCounts[t.source] || 0) + 1;
  }
  console.log('\n  Source breakdown:');
  for (const [src, count] of Object.entries(srcCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src}: ${count}`);
  }

  console.log('\n  Done! Run `node scripts/rebuild-db.js` to rebuild the database.\n');
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
