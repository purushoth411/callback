const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '50.87.148.156',
  user: 'rapidcol_rc_main',
  password: 'rc_main#123',
  database: 'rapidcol_rc_main',
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
  connectTimeout: 60000,
  charset: 'utf8mb4',
  ssl: false,
  enableKeepAlive: true,      // keeps connection alive
  keepAliveInitialDelay: 0
});


async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to Rc database');
    conn.release();
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

testConnection();

module.exports = pool;
