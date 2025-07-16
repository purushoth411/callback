var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 100,
    host: '162.241.126.79',
    user: 'pragya',
    password: 'mK%0f35v',
    database: 'pragya_db',
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
    console.log('Connected to InstaCrm database');
    connection.release(); 
});

module.exports = connection; 