// logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, json } = format;

const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} | ${level.toUpperCase()} | ${stack || message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Log stack trace if available
    customFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
