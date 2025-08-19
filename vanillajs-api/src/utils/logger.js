class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.levels.INFO;
  }

  setLevel(level) {
    this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${level}] ${timestamp}: ${message}`;
  }

  debug(message) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log(this.formatMessage('DEBUG', message));
    }
  }

  info(message) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log(this.formatMessage('INFO', message));
    }
  }

  warn(message) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(this.formatMessage('WARN', message));
    }
  }

  error(message) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(this.formatMessage('ERROR', message));
    }
  }

  request(req) {
    this.info(`${req.method} ${req.url} - ${req.headers['user-agent'] || 'Unknown'}`);
  }
}

module.exports = new Logger();