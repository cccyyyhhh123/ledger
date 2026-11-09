<#
  wallpapers.ps1 - a small local service that reads the Wallpaper Engine
  library on this machine and hands it to the site.

  What it can serve
    * video wallpapers   -> the mp4/webm file from the project folder, or the
                            capped copy in _tools\cache if one has been made
    * scene wallpapers   -> their preview frame only (the .pkg format is closed;
                            see the note in the page)
    * settings           -> one JSON file next to this script

  Endpoints (127.0.0.1:8788)
    GET  /api/wallpapers            list of wallpapers
    GET  /api/settings              saved settings
    POST /api/settings              overwrite settings
    GET  /preview?id=<id>           preview image
    GET  /video?id=<id>             video file
    GET  /...                       the site itself, same origin as the API

  Run it with 启动壁纸台.bat; close the window to stop.
#>
param([int]$Port = 8788)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Split-Path -Parent $PSScriptRoot
$CacheDir = Join-Path $PSScriptRoot 'cache'
$SettingsFile = Join-Path $CacheDir 'wallpaper-settings.json'
if (-not (Test-Path $CacheDir)) { New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null }

$WeRoots = @(
  'D:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine',
  'C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine',
  'D:\Program Files\Steam\steamapps\common\wallpaper_engine'
)
$WorkshopRoots = @(
  'D:\SteamLibrary\steamapps\workshop\content\431960',
  'C:\Program Files (x86)\Steam\steamapps\workshop\content\431960',
  'D:\Program Files (x86)\Steam\steamapps\workshop\content\431960'
)

function Read-Project($dir) {
  $info = [ordered]@{
    id = Split-Path $dir -Leaf
    title = Split-Path $dir -Leaf
    type = 'unknown'
    dir = $dir
    preview = $null
    video = $null
    videoCached = $null
    videoSeconds = 0
  }

  $projFile = Join-Path $dir 'project.json'
  $hasVideoFile = [bool](Get-ChildItem $dir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in '.mp4', '.webm', '.mov', '.mkv' })
  if (-not (Test-Path $projFile) -and -not $hasVideoFile) { return $null }
  if (Test-Path $projFile) {
    try {
      $j = Get-Content $projFile -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($j.title) { $info.title = [string]$j.title }
      if ($j.type) { $info.type = ([string]$j.type).ToLower() }
      if ($j.preview) {
        $p = Join-Path $dir ([string]$j.preview)
        if (Test-Path $p) { $info.preview = $p }
      }
    } catch { }
  }

  if (-not $info.preview) {
    foreach ($name in @('preview.jpg', 'preview.png', 'preview.gif')) {
      $p = Join-Path $dir $name
      if (Test-Path $p) { $info.preview = $p; break }
    }
  }

  # a video wallpaper keeps its footage as a plain file next to project.json
  $video = Get-ChildItem $dir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in '.mp4', '.webm', '.mov', '.mkv' } |
    Sort-Object Length -Descending | Select-Object -First 1
  if ($video) {
    $info.video = $video.FullName
    if (-not $info.preview) { }
    $cached = Join-Path $CacheDir ('wallpaper-' + $info.id + '.mp4')
    if (Test-Path $cached) { $info.videoCached = $cached }
  }

  if ($info.video -or $info.type -eq 'video') { $info.type = 'video' }
  elseif ($info.type -eq 'web') { $info.type = 'web' }
  else { $info.type = 'scene' }

  return $info
}

function Get-Manifest {
  $items = @()
  foreach ($root in $WorkshopRoots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($dir in Get-ChildItem $root -Directory -ErrorAction SilentlyContinue) {
      $one = Read-Project $dir.FullName; if ($one) { $items += $one }
    }
  }
  foreach ($we in $WeRoots) {
    foreach ($sub in @('projects\myprojects', 'projects\defaultprojects')) {
      $dir = Join-Path $we $sub
      if (-not (Test-Path $dir)) { continue }
      foreach ($project in Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue) {
        $one = Read-Project $project.FullName; if ($one) { $items += $one }
      }
    }
    if ($items.Count -gt 0) { break }
  }

  $seen = @{}
  $out = @()
  foreach ($item in $items) {
    if ($seen.ContainsKey($item.id)) { continue }
    $seen[$item.id] = $true
    $out += [ordered]@{
      id = $item.id
      title = $item.title
      type = $item.type
      hasPreview = [bool]$item.preview
      hasVideo = [bool]($item.videoCached)
      originalVideo = [bool]$item.video
    }
  }
  return ,$out
}

function Send-Bytes($stream, [string]$status, [string]$ctype, [byte[]]$body) {
  $head = "HTTP/1.1 $status`r`n" +
          "Content-Type: $ctype`r`n" +
          "Content-Length: $($body.Length)`r`n" +
          "Access-Control-Allow-Origin: *`r`n" +
          "Access-Control-Allow-Headers: *`r`n" +
          "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n" +
          "Access-Control-Allow-Private-Network: true`r`n" +
          "Cache-Control: no-store`r`n" +
          "Connection: close`r`n`r`n"
  $hb = [Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hb, 0, $hb.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}

function Send-Json($stream, $obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 6
  if (-not $json) { $json = '{}' }
  Send-Bytes $stream '200 OK' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($json))
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch {
  Write-Host "Port $Port is busy - is the wallpaper service already running?" -ForegroundColor Yellow
  Start-Sleep -Seconds 6
  exit 1
}

if (-not (Test-Path (Join-Path $Root 'wallpaper.html'))) {
  Write-Host "  cannot find wallpaper.html under $Root" -ForegroundColor Red
  Write-Host "  this script has to sit in <site>\_tools\" -ForegroundColor Red
  Start-Sleep -Seconds 8
  exit 1
}

Write-Host ""
Write-Host "  serving  $Root" -ForegroundColor DarkGray
Write-Host "  open     http://127.0.0.1:$Port/wallpaper.html" -ForegroundColor Green
Write-Host "  close this window to stop" -ForegroundColor DarkGray
Write-Host ""

$manifestCache = $null
$manifestAt = [datetime]::MinValue

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $client.ReceiveTimeout = 5000

    $buffer = New-Object byte[] 16384
    $read = 0
    try { $read = $stream.Read($buffer, 0, $buffer.Length) } catch { $read = 0 }
    if ($read -le 0) { $client.Close(); continue }

    $text = [Text.Encoding]::ASCII.GetString($buffer, 0, $read)
    $requestLine = ($text -split "`r`n")[0]
    $parts = $requestLine -split ' '
    $method = if ($parts.Count -ge 1) { $parts[0] } else { 'GET' }
    $path = if ($parts.Count -ge 2) { $parts[1] } else { '/' }
    $pathOnly = ($path -split '\?')[0]
    $query = ''
    if ($path -match '\?(.*)$') { $query = $matches[1] }

    if ($method -eq 'OPTIONS') { Send-Bytes $stream '200 OK' 'text/plain' ([Text.Encoding]::ASCII.GetBytes('')); $client.Close(); continue }

    if ($pathOnly -eq '/api/wallpapers') {
      if (-not $manifestCache -or ((Get-Date) - $manifestAt).TotalSeconds -gt 10) {
        $manifestCache = Get-Manifest
        $manifestAt = Get-Date
      }
      Send-Json $stream ([ordered]@{ ok = $true; port = $Port; items = $manifestCache })
    }
    elseif ($pathOnly -eq '/api/settings') {
      if ($method -eq 'POST') {
        $length = 0
        if ($text -match '(?im)^Content-Length:\s*(\d+)') { $length = [int]$matches[1] }
        $bodyText = ''
        if ($length -gt 0) {
          $all = New-Object System.Text.StringBuilder
          [void]$all.Append($text.Substring([Math]::Min($text.Length, $text.IndexOf("`r`n`r`n") + 4)))
          $have = $read
          while ($have -lt ($length + $text.IndexOf("`r`n`r`n") + 4)) {
            $more = New-Object byte[] 8192
            $n = 0
            try { $n = $stream.Read($more, 0, $more.Length) } catch { $n = 0 }
            if ($n -le 0) { break }
            [void]$all.Append([Text.Encoding]::UTF8.GetString($more, 0, $n))
            $have += $n
          }
          $full = $all.ToString()
          $idx = $full.IndexOf("`r`n`r`n")
          if ($idx -ge 0) { $bodyText = $full.Substring($idx + 4) }
        }
        [IO.File]::WriteAllText($SettingsFile, $bodyText, [Text.Encoding]::UTF8)
        Send-Json $stream ([ordered]@{ ok = $true })
      } else {
        $json = '{}'
        if (Test-Path $SettingsFile) { $json = Get-Content $SettingsFile -Raw -Encoding UTF8 }
        Send-Bytes $stream '200 OK' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($json))
      }
    }
    elseif ($pathOnly -eq '/preview') {
      $id = ''
      if ($query -match 'id=([^&]+)') { $id = $matches[1] }
      $item = Get-Manifest | Where-Object { $_.id -eq $id } | Select-Object -First 1
      if ($item) {
        $dirs = @()
        foreach ($root in $WorkshopRoots) { $dirs += (Join-Path $root $id) }
        foreach ($we in $WeRoots) { $dirs += (Join-Path $we ('projects\myprojects\' + $id)); $dirs += (Join-Path $we ('projects\defaultprojects\' + $id)) }
        $file = $null
        foreach ($d in $dirs) {
          if (-not (Test-Path $d)) { continue }
          foreach ($name in @('preview.jpg', 'preview.png', 'preview.gif')) {
            $p = Join-Path $d $name
            if (Test-Path $p) { $file = $p; break }
          }
          if ($file) { break }
        }
        if ($file) {
          $ext = [IO.Path]::GetExtension($file).ToLower()
          $ctype = if ($ext -eq '.png') { 'image/png' } elseif ($ext -eq '.gif') { 'image/gif' } else { 'image/jpeg' }
          Send-Bytes $stream '200 OK' $ctype ([IO.File]::ReadAllBytes($file))
        } else {
          Send-Bytes $stream '404 Not Found' 'text/plain' ([Text.Encoding]::ASCII.GetBytes('no preview'))
        }
      } else {
        Send-Bytes $stream '404 Not Found' 'text/plain' ([Text.Encoding]::ASCII.GetBytes('unknown id'))
      }
    }
    elseif ($pathOnly -eq '/video') {
      $id = ''
      if ($query -match 'id=([^&]+)') { $id = $matches[1] }
      $cached = Join-Path $CacheDir ('wallpaper-' + $id + '.mp4')
      if (Test-Path $cached) {
        Send-Bytes $stream '200 OK' 'video/mp4' ([IO.File]::ReadAllBytes($cached))
      } else {
        Send-Bytes $stream '404 Not Found' 'text/plain' ([Text.Encoding]::ASCII.GetBytes('no capped video'))
      }
    }
    else {
      $relative = if ($pathOnly -eq '/') { 'wallpaper.html' } else { $pathOnly.TrimStart('/') }
      $relative = [Uri]::UnescapeDataString($relative)
      $full = Join-Path $Root ($relative -replace '/', '\')
      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Send-Bytes $stream '404 Not Found' 'text/plain' ([Text.Encoding]::ASCII.GetBytes('not found'))
      } else {
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $types = @{
          '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
          '.js' = 'application/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8';
          '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
          '.gif' = 'image/gif'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2'
        }
        $ctype = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        Send-Bytes $stream '200 OK' $ctype ([IO.File]::ReadAllBytes($full))
      }
    }
  } catch {
    # one bad request must not stop the service
  } finally {
    try { $client.Close() } catch { }
  }
}
