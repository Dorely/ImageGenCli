param(
  [string]$ExpectedTag = ""
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repositoryRoot
try {
  $changes = @(git status --porcelain)
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect the Git working tree."
  }
  if ($changes.Count -gt 0) {
    throw "Release must start from a clean Git working tree. Commit or stash changes first."
  }

  $version = node -p "require('./apps/cli/package.json').version"
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read the CLI package version."
  }
  $coreVersion = node -p "require('./packages/core/package.json').version"
  $codexVersion = node -p "require('./packages/providers-codex/package.json').version"
  $googleVersion = node -p "require('./packages/providers-google/package.json').version"
  $credentialsVersion = node -p "require('./packages/credentials/package.json').version"
  $configurableVersion = node -p "require('./packages/providers-configurable/package.json').version"
  if ($coreVersion -ne $version -or $codexVersion -ne $version -or $googleVersion -ne $version -or $credentialsVersion -ne $version -or $configurableVersion -ne $version) {
    throw "Package versions must match: cli=$version core=$coreVersion providers-codex=$codexVersion providers-google=$googleVersion credentials=$credentialsVersion providers-configurable=$configurableVersion."
  }

  if ($ExpectedTag -and $ExpectedTag -ne "v$version") {
    throw "Tag $ExpectedTag does not match CLI version $version. Expected v$version."
  }

  npm test
  if ($LASTEXITCODE -ne 0) {
    throw "Tests failed."
  }
  npm run typecheck
  if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
  }
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
  }

  # npm's stdout notices come back on stderr under PowerShell remoting, which
  # trips $ErrorActionPreference. Run pack as a child process and check the
  # tarball by name instead of parsing output.
  $pack = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm pack --workspace @dorely13/ai-imagegen-cli" -NoNewWindow -Wait -PassThru
  if ($pack.ExitCode -ne 0) {
    throw "npm pack failed with exit code $($pack.ExitCode)."
  }

  $expectedTarball = "dorely13-ai-imagegen-cli-$version.tgz"
  if (-not (Test-Path $expectedTarball)) {
    throw "Expected tarball $expectedTarball was not produced."
  }

  if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Path "release" | Out-Null
  }
  $releasePath = Join-Path "release" $expectedTarball
  Move-Item -Force $expectedTarball $releasePath
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = [BitConverter]::ToString($sha256.ComputeHash([System.IO.File]::ReadAllBytes($releasePath))).Replace("-", "").ToLower()
  }
  finally {
    $sha256.Dispose()
  }
  "$hash  $expectedTarball" | Out-File -Encoding ascii "$releasePath.sha256"
  Write-Output "Release ready: $releasePath"
}
finally {
  Pop-Location
}
