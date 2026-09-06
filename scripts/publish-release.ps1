param(
  [string]$Tag = ""
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
    throw "Publishing must start from a clean Git working tree. Commit or stash changes first."
  }

  $branch = git branch --show-current
  if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
    throw "Releases must be published from main. Current branch: $branch"
  }

  $version = node -p "require('./apps/cli/package.json').version"
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read the CLI package version."
  }

  if (-not $Tag) {
    $Tag = "v$version"
  }
  if ($Tag -ne "v$version") {
    throw "Tag $Tag does not match CLI version $version. Expected v$version."
  }

  & gh.exe auth status
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI authentication is required to publish a release."
  }

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & gh.exe release view $Tag --json url 2>$null | Out-Null
  $releaseExists = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $previousErrorActionPreference
  if ($releaseExists) {
    throw "GitHub release $Tag already exists."
  }

  $headCommit = git rev-parse HEAD
  $localTag = git tag --list $Tag
  if ($localTag) {
    $localTagCommit = git rev-list -n 1 $Tag
    if ($localTagCommit -ne $headCommit) {
      throw "Local tag $Tag points to $localTagCommit instead of HEAD $headCommit."
    }
  }

  $remoteTagLine = git ls-remote --tags origin "refs/tags/$Tag^{}"
  if (-not $remoteTagLine) {
    $remoteTagLine = git ls-remote --tags origin "refs/tags/$Tag"
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect tag $Tag on origin."
  }
  if ($remoteTagLine) {
    $remoteTagCommit = ($remoteTagLine -split "\s+")[0]
    if ($remoteTagCommit -ne $headCommit) {
      throw "Remote tag $Tag points to $remoteTagCommit instead of HEAD $headCommit."
    }
  }

  & "$PSScriptRoot\release.ps1" -ExpectedTag $Tag
  if ($LASTEXITCODE -ne 0) {
    throw "Local release build exited with code $LASTEXITCODE."
  }

  if (-not $localTag) {
    git tag -a $Tag -m "ImageGenCli $Tag"
    if ($LASTEXITCODE -ne 0) {
      throw "Unable to create tag $Tag."
    }
  }

  git push origin main
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to push main."
  }

  if (-not $remoteTagLine) {
    git push origin $Tag
    if ($LASTEXITCODE -ne 0) {
      throw "Unable to push tag $Tag."
    }
  }

  Write-Output "Tag $Tag is pushed. Publish the CLI to npm from this machine with: npm publish --workspace @dorely/ai-imagegen-cli"
  Write-Output "Then attach the tarball to the GitHub release:"
  $tarballPath = Join-Path $repositoryRoot "release\dorely-ai-imagegen-cli-$version.tgz"
  $checksumPath = "$tarballPath.sha256"
  & gh.exe release create $Tag $tarballPath $checksumPath --verify-tag --generate-notes --title "ImageGenCli $Tag"
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to create GitHub release $Tag. The tag remains available for a retry."
  }
}
finally {
  Pop-Location
}
