const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../../voting_blockchain.sqlite");

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error("Could not connect to database", err);
    });
    
    // Promisify common methods for our controllers
    dbInstance.prepare = (sql) => {
      return {
        get: (...params) => new Promise((resolve, reject) => {
          dbInstance.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
        }),
        all: (...params) => new Promise((resolve, reject) => {
          dbInstance.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
        }),
        run: (...params) => new Promise((resolve, reject) => {
          dbInstance.run(sql, params, function(err) {
            err ? reject(err) : resolve({ lastInsertRowid: this.lastID, changes: this.changes });
          });
        })
      };
    };
    
    dbInstance.execPromise = (sql) => new Promise((resolve, reject) => {
      dbInstance.exec(sql, (err) => err ? reject(err) : resolve());
    });
  }
  return dbInstance;
}

module.exports = { getDb };
