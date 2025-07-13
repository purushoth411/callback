var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 100,
    host: '50.87.148.156',
    user: 'rapidcol_call_ca',
    password: 'nv0@Fg)^ZcvW',
    database: 'rapidcol_call_calendar',
    charset: 'utf8mb4',
    connectTimeout: 20000, 
    timezone: 'Asia/Kolkata',
});

// Helper to get a connection and execute a query
connection.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
    connection.release(); 
});

module.exports = connection; 