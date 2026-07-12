const Database = require('better-sqlite3');
const db = new Database('db.sqlite');
try {
  db.exec('ALTER TABLE asset_allocations ADD COLUMN fine_amount REAL DEFAULT 0');
  console.log("Column added");
} catch (e) {
  console.log(e.message);
}
