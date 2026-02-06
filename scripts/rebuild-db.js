#!/usr/bin/env node
/**
 * WinterLine DB Rebuild Script
 * Drops and recreates the database from schema + seed
 */

const path = require('path');
const fs = require('fs');

async function main() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dbPath = path.join(__dirname, '..', 'winterline.db');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');

  console.log('Rebuilding WinterLine database...\n');

  // Remove old DB
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('  Removed old database.');
  }

  // Create new DB
  const sqlDb = new SQL.Database();
  console.log('  Created new database.');

  // Run schema
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  sqlDb.exec(schema);
  console.log('  Schema applied.');

  // Run seed
  const seed = fs.readFileSync(seedPath, 'utf-8');
  // Split by lines and execute non-empty statements
  const statements = seed.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('--');
  });

  let toolCount = 0;
  let categoryCount = 0;
  let userCount = 0;
  let errors = 0;

  for (const stmt of statements) {
    try {
      sqlDb.exec(stmt);
      if (stmt.includes('INTO tools')) toolCount++;
      if (stmt.includes('INTO categories')) categoryCount++;
      if (stmt.includes('INTO users')) userCount++;
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.log(`  Warning: ${err.message.substring(0, 100)}`);
      }
    }
  }

  // Verify counts
  const toolResult = sqlDb.exec('SELECT COUNT(*) as cnt FROM tools');
  const catResult = sqlDb.exec('SELECT COUNT(*) as cnt FROM categories');
  const userResult = sqlDb.exec('SELECT COUNT(*) as cnt FROM users');

  const actualTools = toolResult[0]?.values[0][0] || 0;
  const actualCats = catResult[0]?.values[0][0] || 0;
  const actualUsers = userResult[0]?.values[0][0] || 0;

  // Save to disk
  const data = sqlDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  console.log('\n  Database rebuilt successfully!');
  console.log(`  Users:      ${actualUsers}`);
  console.log(`  Categories: ${actualCats}`);
  console.log(`  Tools:      ${actualTools}`);
  if (errors > 0) console.log(`  Warnings:   ${errors}`);
  console.log(`\n  Saved to: ${dbPath}\n`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
