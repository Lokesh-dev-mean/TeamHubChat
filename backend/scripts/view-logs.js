#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const logsDir = path.join(__dirname, '../logs');

function showUsage() {
  console.log(`
${colors.cyan}TeamHub Log Viewer${colors.reset}

Usage: node view-logs.js [options]

Options:
  --type, -t <type>    Log type (error, combined, debug) [default: combined]
  --lines, -n <num>    Number of lines to show [default: 50]
  --follow, -f         Follow log file (like tail -f)
  --filter <text>      Filter logs containing text
  --level <level>      Filter by log level (ERROR, WARN, INFO, DEBUG)
  --since <minutes>    Show logs from last N minutes
  --help, -h           Show this help message

Examples:
  node view-logs.js                           # Show last 50 lines of combined log
  node view-logs.js -t error -n 100          # Show last 100 error logs
  node view-logs.js -f                       # Follow combined log
  node view-logs.js --filter "API Error"     # Show logs containing "API Error"
  node view-logs.js --level ERROR             # Show only ERROR level logs
  node view-logs.js --since 30               # Show logs from last 30 minutes
`);
}

function formatLogEntry(logLine, showColors = true) {
  try {
    const logEntry = JSON.parse(logLine);
    const timestamp = new Date(logEntry.timestamp).toLocaleString();
    
    if (!showColors) {
      return `[${timestamp}] ${logEntry.level}: ${logEntry.message}`;
    }
    
    let levelColor = colors.reset;
    switch (logEntry.level) {
      case 'ERROR':
        levelColor = colors.red;
        break;
      case 'WARN':
        levelColor = colors.yellow;
        break;
      case 'INFO':
        levelColor = colors.green;
        break;
      case 'DEBUG':
        levelColor = colors.blue;
        break;
    }

    let output = `${colors.gray}[${timestamp}]${colors.reset} ${levelColor}${logEntry.level}${colors.reset}: ${logEntry.message}`;
    
    // Add metadata if available
    if (logEntry.method && logEntry.url) {
      output += `${colors.cyan} ${logEntry.method} ${logEntry.url}${colors.reset}`;
    }
    
    if (logEntry.statusCode) {
      const statusColor = logEntry.statusCode >= 400 ? colors.red : colors.green;
      output += `${statusColor} [${logEntry.statusCode}]${colors.reset}`;
    }
    
    if (logEntry.responseTime) {
      output += `${colors.magenta} (${logEntry.responseTime})${colors.reset}`;
    }
    
    if (logEntry.userId) {
      output += `${colors.blue} User: ${logEntry.userId}${colors.reset}`;
    }

    return output;
  } catch (error) {
    // If not JSON, return as is
    return logLine;
  }
}

function filterLogs(lines, options) {
  return lines.filter(line => {
    try {
      const logEntry = JSON.parse(line);
      
      // Filter by level
      if (options.level && logEntry.level !== options.level.toUpperCase()) {
        return false;
      }
      
      // Filter by text content
      if (options.filter && !line.toLowerCase().includes(options.filter.toLowerCase())) {
        return false;
      }
      
      // Filter by time
      if (options.since) {
        const logTime = new Date(logEntry.timestamp);
        const cutoffTime = new Date(Date.now() - (options.since * 60 * 1000));
        if (logTime < cutoffTime) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      // For non-JSON lines, apply text filter only
      if (options.filter && !line.toLowerCase().includes(options.filter.toLowerCase())) {
        return false;
      }
      return true;
    }
  });
}

function viewLogFile(filePath, options) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}Log file doesn't exist: ${filePath}${colors.reset}`);
    return;
  }

  console.log(`${colors.green}📋 Viewing logs: ${filePath}${colors.reset}\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n').filter(line => line.trim());
    
    // Apply filters
    lines = filterLogs(lines, options);
    
    // Limit number of lines
    if (options.lines && lines.length > options.lines) {
      lines = lines.slice(-options.lines);
    }
    
    // Display logs
    lines.forEach(line => {
      console.log(formatLogEntry(line));
    });
    
    if (lines.length === 0) {
      console.log(`${colors.yellow}No logs found matching the criteria${colors.reset}`);
    } else {
      console.log(`\n${colors.gray}Showing ${lines.length} log entries${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error reading log file: ${error.message}${colors.reset}`);
  }
}

function followLogFile(filePath, options) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}Log file doesn't exist: ${filePath}${colors.reset}`);
    console.log(`${colors.gray}Waiting for log file to be created...${colors.reset}`);
  }

  console.log(`${colors.green}📋 Following logs: ${filePath}${colors.reset}`);
  console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}\n`);

  let lastSize = 0;
  
  if (fs.existsSync(filePath)) {
    lastSize = fs.statSync(filePath).size;
  }

  setInterval(() => {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const currentSize = fs.statSync(filePath).size;
      
      if (currentSize > lastSize) {
        // Read new content
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(currentSize - lastSize);
        fs.readSync(fd, buffer, 0, buffer.length, lastSize);
        fs.closeSync(fd);
        
        const newContent = buffer.toString('utf8');
        const newLines = newContent.split('\n').filter(line => line.trim());
        
        // Apply filters
        const filteredLines = filterLogs(newLines, options);
        
        filteredLines.forEach(line => {
          console.log(formatLogEntry(line));
        });
        
        lastSize = currentSize;
      }
    } catch (error) {
      console.error(`${colors.red}Error reading log file: ${error.message}${colors.reset}`);
    }
  }, 500);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Parse options
const options = {
  type: 'combined',
  lines: 50,
  follow: false,
  filter: null,
  level: null,
  since: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--type':
    case '-t':
      options.type = args[++i];
      break;
    case '--lines':
    case '-n':
      options.lines = parseInt(args[++i]);
      break;
    case '--follow':
    case '-f':
      options.follow = true;
      break;
    case '--filter':
      options.filter = args[++i];
      break;
    case '--level':
      options.level = args[++i];
      break;
    case '--since':
      options.since = parseInt(args[++i]);
      break;
  }
}

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`${colors.yellow}Created logs directory: ${logsDir}${colors.reset}`);
}

const logFile = path.join(logsDir, `${options.type}.log`);

if (options.follow) {
  followLogFile(logFile, options);
} else {
  viewLogFile(logFile, options);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Log viewing stopped${colors.reset}`);
  process.exit(0);
});
