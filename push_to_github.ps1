param(
  [string]$GithubUser,
  [string]$RepoName,
  [string]$Token,
  [string]$Description = "",
  [string]$RepoPath = (Get-Location).Path,
  [string]$DefaultBranch = "main",
  [string]$RemoteName = "origin",
  [bool]$Private = $true,
  [bool]$UseTokenInRemote = $false,
  [string]$RemoteUrl
)
$ErrorActionPreference = "Stop"
Set-Location $RepoPath
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw "git is not installed" }
$justInit = $false
if (!(Test-Path ".git")) { git init | Out-Null; $justInit = $true }
if ($justInit) {
  try { git checkout -b $DefaultBranch | Out-Null } catch { }
} else {
  $currentBranch = (git branch --show-current 2>$null)
  if (!$currentBranch) { try { git checkout -b $DefaultBranch | Out-Null } catch { } }
  else { git branch -M $DefaultBranch | Out-Null }
}
if (!(Test-Path ".gitignore")) {
  @"
.venv/
venv/
__pycache__/
*.pyc
*.pyo
*.pyd
*.db
app.db
.DS_Store
"@ | Set-Content -NoNewline ".gitignore"
}
git add .
$changes = git status --porcelain
if ($changes) { git commit -m "Initial commit" | Out-Null }
if (-not $RemoteUrl) {
  if (-not $GithubUser -or -not $RepoName -or -not $Token) { throw "Provide GithubUser, RepoName, and Token or set RemoteUrl." }
  $headers = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github+json"; "User-Agent" = "ps-push-script" }
  $body = @{ name = $RepoName; description = $Description; private = $Private } | ConvertTo-Json
  try { $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" } catch { $status = $_.Exception.Response.StatusCode.Value__; if ($status -ne 422) { throw } }
  $remoteUrl = "https://github.com/$GithubUser/$RepoName.git"
  if ($UseTokenInRemote -and $Token) { $remoteUrl = "https://${GithubUser}:${Token}@github.com/${GithubUser}/${RepoName}.git" }
} else {
  $remoteUrl = $RemoteUrl
  if ($UseTokenInRemote -and $Token) {
    if ($remoteUrl -match "^https://github.com/") {
      if ($GithubUser -and $Token) { $remoteUrl = $remoteUrl -replace "^https://github.com/", "https://${GithubUser}:${Token}@github.com/" }
    }
  }
}
if ((git remote 2>$null) -notcontains $RemoteName) { git remote add $RemoteName $remoteUrl | Out-Null } else { git remote set-url $RemoteName $remoteUrl | Out-Null }
git push -u $RemoteName $DefaultBranch
Write-Output "Pushed to $remoteUrl"
