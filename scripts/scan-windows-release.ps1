param([switch]$PreflightOnly)

$ErrorActionPreference = 'Stop'
$stage = 'Defender service startup'
try {
    $service = Get-Service WinDefend -ErrorAction Stop
    if ($service.Status -ne 'Running') {
        if ($service.StartType -eq 'Disabled') { Set-Service WinDefend -StartupType Manual }
        Start-Service WinDefend
    }
    $platformRoot = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
    $platform = @(Get-ChildItem $platformRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Where-Object { Test-Path (Join-Path $_.FullName 'MpCmdRun.exe') } | Select-Object -First 1)
    $scanner = if ($platform.Count) { Join-Path $platform[0].FullName 'MpCmdRun.exe' } else { Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe' }
    if (-not (Test-Path $scanner)) { throw 'Microsoft Defender command-line scanner is unavailable.' }

    # Use the supported command-line updater directly, rather than the failing CIM update call.
    # MMPC selects Microsoft's definition source; signature verification remains enabled.
    $stage = 'direct Defender signature update'
    $updateOutput = @(& $scanner -SignatureUpdate -MMPC 2>&1)
    $updateExitCode = $LASTEXITCODE
    $updateOutput | ForEach-Object { Write-Host $_ }
    if ($updateExitCode -ne 0) { throw "Defender definition update failed (exit $updateExitCode). $($updateOutput | Select-Object -Last 8 | Out-String)" }

    $stage = 'engine and signature readiness'
    $status = Get-MpComputerStatus -ErrorAction Stop
    if (-not $status.AMServiceEnabled -or -not $status.AntivirusEnabled) {
        throw "Microsoft Defender antivirus is not enabled (mode: $($status.AMRunningMode))."
    }
    if ($status.AntivirusSignatureLastUpdated.ToUniversalTime() -lt [DateTime]::UtcNow.AddDays(-2)) {
        throw 'Defender signatures are older than two days.'
    }
    if ($PreflightOnly) { Write-Host 'Microsoft Defender preflight passed.'; return }

    $stage = 'archive scan configuration'
    Set-MpPreference -DisableArchiveScanning $false -ErrorAction Stop
    if ((Get-MpPreference).DisableArchiveScanning) { throw 'Archive scanning could not be enabled.' }

    $stage = 'release validation'
    $release = (Resolve-Path (Join-Path $PSScriptRoot '..\release')).Path
    $executables = @(Get-ChildItem $release -Filter '*.exe' -File)
    if ($executables.Count -ne 1) { throw 'Expected exactly one Windows release executable.' }
    if (-not (Test-Path (Join-Path $release 'win-unpacked') -PathType Container)) { throw 'Unpacked application is missing.' }

    # Audit mode ignores file exclusions and returns detections without remediating them.
    # Any nonzero exit, detection, unavailable scanner, or missing file blocks publication.
    $stage = 'custom malware scan'
    $scanStartedAt = Get-Date
    $scanOutput = @(& $scanner -Scan -ScanType 3 -File $release -DisableRemediation 2>&1)
    $scanExitCode = $LASTEXITCODE
    $scanOutput | ForEach-Object { Write-Host $_ }
    if ($scanExitCode -ne 0) { throw "Defender scan failed or detected a threat (exit $scanExitCode). $($scanOutput | Select-Object -Last 8 | Out-String)" }
    $detections = @(Get-MpThreatDetection -ErrorAction Stop | Where-Object { $_.InitialDetectionTime -ge $scanStartedAt })
    if ($detections.Count -gt 0) { throw 'Defender reported a threat during the release scan.' }
    if (-not (Test-Path $executables[0].FullName)) { throw 'Release executable disappeared during scanning.' }

    $signature = Get-AuthenticodeSignature $executables[0].FullName
    [ordered]@{
        scanner = 'Microsoft Defender Antivirus'
        result = 'No threats reported by the completed custom scan'
        exitCode = $scanExitCode
        scanned = @($executables[0].Name, 'win-unpacked/')
        engineVersion = [string]$status.AMEngineVersion
        signatureVersion = [string]$status.AntivirusSignatureVersion
        signatureUpdatedAt = $status.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o')
        scanCompletedAt = [DateTime]::UtcNow.ToString('o')
        archiveScanningEnabled = $true
        sourceCommit = $env:GITHUB_SHA
        buildUrl = "https://github.com/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID"
        authenticodeSigned = ($signature.Status -eq 'Valid')
        authenticodeStatus = [string]$signature.Status
        limitation = 'A completed malware scan is not a guarantee of safety and does not replace publisher code signing.'
    } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $release 'Defender-scan.json') -Encoding utf8
} catch {
    $message = "$stage : $($_.Exception.Message)".Replace('%', '%25').Replace("`r", '%0D').Replace("`n", '%0A')
    Write-Host "::error title=Release scan blocked::$message"
    throw
}
