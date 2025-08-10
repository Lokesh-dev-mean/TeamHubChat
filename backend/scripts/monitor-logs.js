#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`${colors.yellow}Created logs directory: ${logsDir}${colors.reset}`);
}

// Available log files
const logFiles = {
  error: path.join(logsDir, 'error.log'),
  combined: path.join(logsDir, 'combined.log'),
  debug: path.join(logsDir, 'debug.log')
};

function formatLogEntry(logLine) {
  try {
    const logEntry = JSON.parse(logLine);
    const timestamp = new Date(logEntry.timestamp).toLocaleString();
    
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

function tailLogFile(filePath, logType) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}Log file doesn't exist yet: ${filePath}${colors.reset}`);
    return;
  }

  console.log(`${colors.green}📋 Monitoring ${logType} logs: ${filePath}${colors.reset}\n`);

  // Use tail command to follow log file
  const tail = spawn('tail', ['-f', filePath]);

  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(formatLogEntry(line));
    });
  });

  tail.stderr.on('data', (data) => {
    console.error(`${colors.red}Tail error: ${data}${colors.reset}`);
  });

  tail.on('close', (code) => {
    console.log(`${colors.yellow}Log monitoring stopped with code ${code}${colors.reset}`);
  });

  return tail;
}

function showUsage() {
  console.log(`
${colors.cyan}TeamHub Log Monitor${colors.reset}

Usage: node monitor-logs.js [options]

Options:
  --error, -e     Monitor error logs only
  --debug, -d     Monitor debug logs only
  --combined, -c  Monitor combined logs (default)
  --all, -a       Monitor all log files
  --help, -h      Show this help message

Examples:
  node monitor-logs.js              # Monitor combined logs
  node monitor-logs.js --error      # Monitor error logs only
  node monitor-logs.js --all        # Monitor all logs in separate windows

Available log files:
  ${colors.green}error.log${colors.reset}     - Error level logs only
  ${colors.green}combined.log${colors.reset}  - All logs combined
  ${colors.green}debug.log${colors.reset}     - Debug level logs
`);
}

function showLogStats() {
  console.log(`${colors.cyan}📊 Log Statistics${colors.reset}\n`);
  
  Object.entries(logFiles).forEach(([type, filePath]) => {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString();
      
      console.log(`${colors.green}${type}.log${colors.reset}:`);
      console.log(`  Size: ${size} KB`);
      console.log(`  Modified: ${modified}`);
      
      // Count log entries
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        console.log(`  Entries: ${lines.length}`);
        
        // Count by level
        const levels = {};
        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            levels[entry.level] = (levels[entry.level] || 0) + 1;
          } catch (e) {
            // Skip non-JSON lines
          }
        });
        
        if (Object.keys(levels).length > 0) {
          console.log(`  Levels: ${Object.entries(levels).map(([level, count]) => `${level}(${count})`).join(', ')}`);
        }
      } catch (error) {
        console.log(`  Error reading file: ${error.message}`);
      }
      
      console.log();
    } else {
      console.log(`${colors.gray}${type}.log: Not created yet${colors.reset}\n`);
    }
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

if (args.includes('--stats') || args.includes('-s')) {
  showLogStats();
  process.exit(0);
}

console.log(`${colors.cyan}🔍 TeamHub Log Monitor${colors.reset}`);
console.log(`${colors.gray}Press Ctrl+C to stop monitoring${colors.reset}\n`);

// Show current log stats first
showLogStats();

let tailProcesses = [];

if (args.includes('--error') || args.includes('-e')) {
  tailProcesses.push(tailLogFile(logFiles.error, 'error'));
} else if (args.includes('--debug') || args.includes('-d')) {
  tailProcesses.push(tailLogFile(logFiles.debug, 'debug'));
} else if (args.includes('--all') || args.includes('-a')) {
  Object.entries(logFiles).forEach(([type, filePath]) => {
    tailProcesses.push(tailLogFile(filePath, type));
  });
} else {
  // Default: monitor combined logs
  tailProcesses.push(tailLogFile(logFiles.combined, 'combined'));
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Stopping log monitoring...${colors.reset}`);
  tailProcesses.forEach(tail => {
    if (tail && tail.kill) {
      tail.kill();
    }
  });
  process.exit(0);
});

// Handle process termination
process.on('SIGTERM', () => {
  tailProcesses.forEach(tail => {
    if (tail && tail.kill) {
      tail.kill();
    }
  });
  process.exit(0);
});
