var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 20,
    host: '50.87.148.156',
    user: 'rapidcol_rc_main',
    password: 'rc_main#123',
    database: 'rapidcol_rc_main',
    charset: 'utf8mb4',
    connectTimeout: 60000, 
    timezone: 'Asia/Kolkata',
    ssl: { rejectUnauthorized: false } 
});

// Helper to get a connection and execute a query
connection.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to Rc database');
    connection.release(); 
});

module.exports = connection; 