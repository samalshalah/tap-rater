$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$helper = Join-Path $PSScriptRoot 'recovery-key-handoff.ps1'

# Direct powershell.exe invocation can sanitize PSModulePath; Start-Process does not.
# Match the actual hidden-window launcher to catch host/module compatibility errors.
foreach ($mode in @('SelfTest', 'ClipboardSelfTest')) {
    $stdout = Join-Path $root ".wrangler/key-handoff-test-$mode-output.log"
    $stderr = Join-Path $root ".wrangler/key-handoff-test-$mode-error.log"
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-STA', '-File', ('"' + $helper + '"'), ('-' + $mode)
    ) -WindowStyle Hidden -WorkingDirectory $root -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    if (-not $process.WaitForExit(15000)) {
        $process.Kill()
        $process.WaitForExit()
        throw "$mode timed out. The test-only helper was stopped."
    }
    $process.Refresh()
    if ($process.ExitCode -ne 0 -or (Get-Item -LiteralPath $stderr).Length -ne 0) {
        throw "$mode failed under the actual window launcher. Inspect sanitized test diagnostics."
    }
    Write-Output "PASS: $mode under the actual hidden-window launcher."
}
