$ErrorActionPreference = 'Stop'
$remote = & node node_modules/wrangler/bin/wrangler.js secret list | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect existing Worker secrets.' }
if ($remote.name -contains 'COMMERCE_RECOVERY_SECRET') {
  Write-Output 'Recovery secret already exists. No key was rotated or replaced.'
  exit 0
}
$path = Join-Path (Get-Location) '.wrangler/commerce-recovery-key.dpapi'
if (Test-Path -LiteralPath $path) {
  $secure = Get-Content -LiteralPath $path -Raw | ConvertTo-SecureString
  $key = [System.Net.NetworkCredential]::new('', $secure).Password
} else {
  $key = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
  $secure = ConvertTo-SecureString $key -AsPlainText -Force
  $secure | ConvertFrom-SecureString | Set-Content -LiteralPath $path
}
if ($key -notmatch '^[a-f0-9]{64}$') { throw 'Invalid recovery key format.' }
$key | & node node_modules/wrangler/bin/wrangler.js secret put COMMERCE_RECOVERY_SECRET
if ($LASTEXITCODE -ne 0) { throw 'Recovery secret deployment failed.' }
$key = $null
Write-Output 'Recovery key configured. User-bound DPAPI backup retained in ignored .wrangler directory.'
