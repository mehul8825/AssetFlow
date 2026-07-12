const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

console.log('Adding quotations column to maintenance_requests...');
try {
  db.exec('ALTER TABLE maintenance_requests ADD COLUMN quotations TEXT;');
  console.log('Column added successfully.');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists.');
  } else {
    console.error('Migration failed:', e);
  }
}
