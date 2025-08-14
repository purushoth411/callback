var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 5, // lower number for HostGator
    host: '50.87.148.156',
    user: 'rapidcol_rc_main',
    password: 'rc_main#123',
    database: 'rapidcol_rc_main',
    charset: 'utf8mb4',
    connectTimeout: 30000,
    timezone: 'local', // avoid forcing 'Asia/Kolkata' here
    ssl: false // explicitly disable SSL unless required
});

// Test connection
connection.getConnection((err, conn) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to Rc database');
    conn.release();
});

module.exports = connection;
