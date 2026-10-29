# auto-commit.ps1  -  daily commit + push for the Ledger project
# Commits whatever you changed today. Does nothing if there is nothing new.

$ErrorActionPreference = "Continue"
$repo  = "D:\projects\homework"
$git   = "C:\Program Files\Git\cmd\git.exe"
$log   = Join-Path $repo "_tools\auto-commit.log"

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
    exit 0
}

$msg = "Daily work: " + (Get-Date -Format "yyyy-MM-dd")
& $git commit -m $msg 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Log "ERROR: commit failed"; exit 1 }
Log ("committed " + ($pending -join ", "))

$remote = (& $git remote 2>$null)
if (-not $remote) {
    Log "no remote configured - commit kept locally"
    exit 0
}

$upstream = (& $git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null)
if (-not $upstream) {
    & $git push -u origin $branch 2>&1 | Out-Null
} else {
    & $git push 2>&1 | Out-Null
}

if ($LASTEXITCODE -eq 0) { Log "pushed to origin/$branch" }
else { Log "ERROR: push failed (check credentials / network)" }
