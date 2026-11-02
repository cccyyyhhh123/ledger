# auto-commit.ps1  -  daily commit + push for the Ledger project
# Commits whatever you changed today. Does nothing if there is nothing new.
# Network note: github.com is slow/throttled on this connection, so push retries.

$ErrorActionPreference = "Continue"
$repo   = "D:\projects\homework"
$git    = "C:\Program Files\Git\cmd\git.exe"
$log    = Join-Path $repo "_tools\auto-commit.log"

function Log($msg) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -LiteralPath $log -Value $line -Encoding UTF8
}

Set-Location $repo

$branch = (& $git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $branch) { Log "ERROR: not a git repo"; exit 1 }

& $git add -A 2>&1 | Out-Null

$pending = (& $git diff --cached --name-only 2>$null)
if (-not $pending) {
    Log "nothing to commit on $branch"
} else {
    $msg = "Daily work: " + (Get-Date -Format "yyyy-MM-dd")
    & $git commit -m $msg 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log "ERROR: commit failed"; exit 1 }
    Log ("committed " + ($pending -join ", "))
}

$remote = (& $git remote 2>$null)
if (-not $remote) { Log "no remote configured - commit kept locally"; exit 0 }

# nothing to send? say so instead of pushing for nothing
$ahead = [int](& $git rev-list --count "origin/$branch..$branch" 2>$null)
if ($ahead -eq 0) { Log "already in sync with origin/$branch"; exit 0 }

# push with generous timeouts + retries (connection is throttled and resets)
$pushArgs = @(
    "-C", $repo,
    "-c", "http.postBuffer=52428800",
    "-c", "http.lowSpeedLimit=0",
    "-c", "http.lowSpeedTime=600",
    "push", "-u", "origin", $branch
)
$pushed = $false
$waits  = @(15, 30, 45, 60)
for ($i = 1; $i -le 5; $i++) {
    $out = (& $git @pushArgs 2>&1 | Out-String)
    if ($LASTEXITCODE -eq 0) {
        $head = (& $git rev-parse --short HEAD 2>$null)
        Log "pushed $head to origin/$branch (attempt $i)"
        $pushed = $true
        break
    }
    $clean = ($out.Trim() -replace "\s+", " ")
    Log ("push attempt $i failed: " + $clean.Substring(0, [Math]::Min(160, $clean.Length)))
    if ($i -lt 5) { Start-Sleep -Seconds $waits[$i - 1] }
}

if (-not $pushed) {
    $still = [int](& $git rev-list --count "origin/$branch..$branch" 2>$null)
    Log "ERROR: push failed after 5 attempts - $still commit(s) safe locally, origin/$branch is behind"
    exit 2
}

# the commit is only really deployed once origin has it
$local     = (& $git rev-parse HEAD 2>$null)
$remoteSha = (& $git rev-parse "origin/$branch" 2>$null)
if ($local -ne $remoteSha) {
    Log "WARNING: origin/$branch does not match HEAD after push - run git fetch to confirm"
    exit 3
}
Log ("in sync: origin/$branch = " + (& $git rev-parse --short HEAD))
Log "GitHub Pages usually rebuilds within a minute; hard-refresh the page after that"
