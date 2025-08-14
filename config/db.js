var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 200,
    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'call_calendar',
    host: '162.241.126.79',
    user: 'callcalendaruser',
    password: '92oBlu9@',
    database: 'call_calendardb',
    charset: 'utf8mb4',
    connectTimeout: 30000, 
    timezone: 'Asia/Kolkata',
});

// Helper to get a connection and execute a query
connection.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to Call Calendar database');
    connection.release(); 
});

module.exports = connection; 