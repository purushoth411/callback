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
connection.getConnection((err, conn) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to Call Calendar database');
    conn.release(); 
});

// --- Function to kill sleeping queries ---
function cleanupSleepingQueries(maxSeconds = 300) {
    connection.getConnection((err, conn) => {
        if (err) {
            console.error('Cleanup connection error:', err);
            return;
        }

        const sql = `
            SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO
            FROM information_schema.PROCESSLIST
            WHERE COMMAND = 'Sleep'
              AND TIME > ?
              AND ID != CONNECTION_ID();
        `;

        conn.query(sql, [maxSeconds], (err, results) => {
            if (err) {
                console.error('Error fetching sleeping processes:', err);
                conn.release();
                return;
            }

            results.forEach(row => {
                console.log(`[Cleanup] Killing ID ${row.ID} | User: ${row.USER} | DB: ${row.DB} | Time: ${row.TIME}s`);
                conn.query(`KILL ${row.ID}`, (killErr) => {
                    if (killErr) {
                        console.error(`Failed to kill connection ${row.ID}: ${killErr.message}`);
                    } else {
                        console.log(`Killed idle connection ID ${row.ID}`);
                    }
                });
            });

            conn.release();
        });
    });
}

// Run cleanup every 5 minutes
setInterval(() => cleanupSleepingQueries(300), 5 * 60 * 1000);

module.exports = connection;
