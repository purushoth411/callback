const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '50.87.148.156',
    user: 'rapidcol_call_ca',
    password: 'nv0@Fg)^ZcvW',
    database: 'rapidcol_call_calendar_test',
    waitForConnections: true,
    connectionLimit: 5,      // reduce from 200 to avoid handshake overload
    queueLimit: 0,
    connectTimeout: 60000,   // 60s
    charset: 'utf8mb4',
    ssl: false,              // set true only if DB requires SSL
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('Connected to Call Calendar database');
        conn.release();
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
}

testConnection();

module.exports = pool;
