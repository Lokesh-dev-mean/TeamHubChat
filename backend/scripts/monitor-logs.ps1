# TeamHub Log Monitor for PowerShell
param(
    [string]$LogType = "combined",
    [switch]$Stats,
    [switch]$Help,
    [switch]$All
)

$LogsDir = Join-Path $PSScriptRoot "..\logs"

function Show-Usage {
    Write-Host "TeamHub Log Monitor" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\monitor-logs.ps1 [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -LogType <type>   Monitor specific log type (error, combined, debug)" -ForegroundColor White
    Write-Host "  -Stats            Show log statistics only" -ForegroundColor White
    Write-Host "  -All              Monitor all log files" -ForegroundColor White
    Write-Host "  -Help             Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\monitor-logs.ps1                    # Monitor combined logs"
    Write-Host "  .\monitor-logs.ps1 -LogType error     # Monitor error logs only"
    Write-Host "  .\monitor-logs.ps1 -Stats             # Show statistics"
    Write-Host "  .\monitor-logs.ps1 -All               # Monitor all logs"
}

function Show-LogStats {
    Write-Host "📊 Log Statistics" -ForegroundColor Cyan
    Write-Host ""
    
    $logFiles = @{
        "error" = "error.log"
        "combined" = "combined.log"
        "debug" = "debug.log"
    }
    
    foreach ($type in $logFiles.Keys) {
        $logFile = Join-Path $LogsDir $logFiles[$type]
        
        Write-Host "$type.log:" -ForegroundColor Green
        
        if (Test-Path $logFile) {
            $fileInfo = Get-Item $logFile
            $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
            $modified = $fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            
            Write-Host "  Size: $sizeKB KB" -ForegroundColor White
            Write-Host "  Modified: $modified" -ForegroundColor White
            
            # Count lines
            try {
                $lines = Get-Content $logFile | Where-Object { $_.Trim() -ne "" }
                Write-Host "  Entries: $($lines.Count)" -ForegroundColor White
                
                # Count by level
                $levels = @{}
                foreach ($line in $lines) {
                    try {
                        $logEntry = $line | ConvertFrom-Json
                        if ($logEntry.level) {
                            $levels[$logEntry.level] = ($levels[$logEntry.level] ?? 0) + 1
                        }
                    }
                    catch {
                        # Skip non-JSON lines
                    }
                }
                
                if ($levels.Count -gt 0) {
                    $levelStr = ($levels.GetEnumerator() | ForEach-Object { "$($_.Key)($($_.Value))" }) -join ", "
                    Write-Host "  Levels: $levelStr" -ForegroundColor White
                }
            }
            catch {
                Write-Host "  Error reading file: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "  Not created yet" -ForegroundColor Gray
        }
        
        Write-Host ""
    }
}

function Format-LogEntry {
    param([string]$LogLine)
    
    try {
        $logEntry = $LogLine | ConvertFrom-Json
        $timestamp = [DateTime]::Parse($logEntry.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
        
        $levelColor = switch ($logEntry.level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "INFO" { "Green" }
            "DEBUG" { "Blue" }
            default { "White" }
        }
        
        $output = "[$timestamp] "
        Write-Host $output -NoNewline -ForegroundColor Gray
        Write-Host $logEntry.level -NoNewline -ForegroundColor $levelColor
        Write-Host ": $($logEntry.message)" -NoNewline -ForegroundColor White
        
        if ($logEntry.method -and $logEntry.url) {
            Write-Host " $($logEntry.method) $($logEntry.url)" -NoNewline -ForegroundColor Cyan
        }
        
        if ($logEntry.statusCode) {
            $statusColor = if ($logEntry.statusCode -ge 400) { "Red" } else { "Green" }
            Write-Host " [$($logEntry.statusCode)]" -NoNewline -ForegroundColor $statusColor
        }
        
        if ($logEntry.responseTime) {
            Write-Host " ($($logEntry.responseTime))" -NoNewline -ForegroundColor Magenta
        }
        
        if ($logEntry.userId) {
            Write-Host " User: $($logEntry.userId)" -NoNewline -ForegroundColor Blue
        }
        
        Write-Host ""
    }
    catch {
        # If not JSON, just output the line
        Write-Host $LogLine -ForegroundColor White
    }
}

function Monitor-LogFile {
    param([string]$FilePath, [string]$LogType)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "Log file doesn't exist yet: $FilePath" -ForegroundColor Yellow
        Write-Host "Creating empty log file..." -ForegroundColor Gray
        New-Item -Path $FilePath -ItemType File -Force | Out-Null
    }
    
    Write-Host "📋 Monitoring $LogType logs: $FilePath" -ForegroundColor Green
    Write-Host ""
    
    # Get initial file size
    $lastSize = (Get-Item $FilePath).Length
    
    while ($true) {
        Start-Sleep -Milliseconds 500
        
        try {
            $currentSize = (Get-Item $FilePath).Length
            
            if ($currentSize -gt $lastSize) {
                # Read new content
                $newContent = Get-Content $FilePath -Tail ($currentSize - $lastSize) -Raw
                
                if ($newContent) {
                    $lines = $newContent -split "`n" | Where-Object { $_.Trim() -ne "" }
                    foreach ($line in $lines) {
                        Format-LogEntry $line
                    }
                }
                
                $lastSize = $currentSize
            }
        }
        catch {
            Write-Host "Error reading log file: $($_.Exception.Message)" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}

# Main script logic
if ($Help) {
    Show-Usage
    exit 0
}

if ($Stats) {
    Show-LogStats
    exit 0
}

# Ensure logs directory exists
if (-not (Test-Path $LogsDir)) {
    New-Item -Path $LogsDir -ItemType Directory -Force | Out-Null
    Write-Host "Created logs directory: $LogsDir" -ForegroundColor Yellow
}

Write-Host "🔍 TeamHub Log Monitor" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""

# Show current stats first
Show-LogStats

if ($All) {
    Write-Host "Monitoring all log files. Use separate PowerShell windows for better visibility." -ForegroundColor Yellow
    Write-Host "Starting with combined logs..." -ForegroundColor Gray
    Write-Host ""
    Monitor-LogFile (Join-Path $LogsDir "combined.log") "combined"
} else {
    $logFile = Join-Path $LogsDir "$LogType.log"
    Monitor-LogFile $logFile $LogType
}
