#!/usr/bin/env node
/**
 * Push schema + seed data to Turso production database
 * Drops existing tables and recreates from scratch
 */

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Split SQL text into individual statements, handling:
 * - Quoted strings (single quotes with '' escapes)
 * - Parenthesized blocks (for CREATE TABLE, CHECK constraints)
 * - Comment lines (-- prefixed)
 */
function splitSQL(text) {
  const statements = [];
  let current = '';
  let inQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle single-quoted strings
    if (char === "'") {
      if (inQuote && text[i + 1] === "'") {
        // Escaped quote (''), keep both
        current += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      current += char;
      continue;
    }

    if (!inQuote) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;

      if (char === ';' && parenDepth === 0) {
        const trimmed = current.trim();
        // Remove leading comment lines
        const cleaned = trimmed.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim();
        if (cleaned) {
          statements.push(cleaned);
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  // Handle any remaining statement
  const trimmed = current.trim();
  const cleaned = trimmed.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim();
  if (cleaned) {
    statements.push(cleaned);
  }

  return statements;
}

async function main() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;

  if (!url || !authToken) {
    console.error('Missing TURSO_URL or TURSO_TOKEN in .env');
    process.exit(1);
  }

  console.log(`Connecting to Turso: ${url}\n`);

  const client = createClient({ url, authToken });

  // Test connection
  try {
    const result = await client.execute('SELECT 1');
    console.log('  ✓ Connected to Turso successfully');
  } catch (err) {
    console.error('  ✗ Failed to connect:', err.message);
    process.exit(1);
  }

  // Drop existing tables (in dependency order)
  console.log('\n  Dropping existing tables...');
  const dropStatements = [
    'DROP TABLE IF EXISTS reviews',
    'DROP TABLE IF EXISTS raw_sources',
    'DROP TABLE IF EXISTS tools',
    'DROP TABLE IF EXISTS categories',
    'DROP TABLE IF EXISTS users',
  ];

  for (const stmt of dropStatements) {
    try {
      await client.execute(stmt);
    } catch (err) {
      console.log(`  Warning dropping: ${err.message}`);
    }
  }
  console.log('  ✓ Tables dropped');

  // Drop existing indexes
  const dropIndexes = [
    'DROP INDEX IF EXISTS idx_tools_source',
    'DROP INDEX IF EXISTS idx_tools_category',
    'DROP INDEX IF EXISTS idx_tools_slug',
    'DROP INDEX IF EXISTS idx_tools_github_url',
    'DROP INDEX IF EXISTS idx_raw_sources_status',
    'DROP INDEX IF EXISTS idx_raw_sources_source',
  ];
  for (const stmt of dropIndexes) {
    try {
      await client.execute(stmt);
    } catch (err) {
      // Indexes may not exist, that's fine
    }
  }

  // Apply schema
  console.log('  Applying schema...');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8');
  const schemaStatements = splitSQL(schema);
  console.log(`  Found ${schemaStatements.length} schema statements`);

  for (const stmt of schemaStatements) {
    try {
      await client.execute(stmt);
      const preview = stmt.substring(0, 65).replace(/\n/g, ' ');
      console.log(`  ✓ ${preview}...`);
    } catch (err) {
      console.log(`  ✗ Schema error: ${err.message.substring(0, 120)}`);
    }
  }
  console.log('  ✓ Schema applied');

  // Apply seed data
  console.log('\n  Inserting seed data...');
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf-8');
  const seedStatements = splitSQL(seed);
  console.log(`  Found ${seedStatements.length} seed statements`);

  let toolCount = 0;
  let catCount = 0;
  let userCount = 0;
  let errors = 0;

  for (const stmt of seedStatements) {
    try {
      await client.execute(stmt);
      if (stmt.includes('INTO tools')) toolCount++;
      if (stmt.includes('INTO categories')) catCount++;
      if (stmt.includes('INTO users')) userCount++;
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.log(`  ✗ Seed error: ${err.message.substring(0, 150)}`);
        console.log(`    Statement preview: ${stmt.substring(0, 100)}...`);
      }
    }
  }

  console.log(`  Inserted: ${catCount} categories, ${userCount} users, ${toolCount} tools`);

  // Verify counts
  const toolResult = await client.execute('SELECT COUNT(*) as cnt FROM tools');
  const catResult = await client.execute('SELECT COUNT(*) as cnt FROM categories');
  const userResult = await client.execute('SELECT COUNT(*) as cnt FROM users');

  const actualTools = toolResult.rows[0]?.cnt || 0;
  const actualCats = catResult.rows[0]?.cnt || 0;
  const actualUsers = userResult.rows[0]?.cnt || 0;

  console.log('\n  ✅ Turso database updated successfully!');
  console.log(`  Users:      ${actualUsers}`);
  console.log(`  Categories: ${actualCats}`);
  console.log(`  Tools:      ${actualTools}`);
  if (errors > 0) console.log(`  Warnings:   ${errors}`);
  console.log(`\n  URL: ${url}\n`);

  client.close();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
