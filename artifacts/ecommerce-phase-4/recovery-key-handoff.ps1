param([switch]$SelfTest, [switch]$ClipboardSelfTest)

$ErrorActionPreference = 'Stop'
# Start-Process can inherit PowerShell 7 module paths into Windows PowerShell 5.1.
# Load this host's security module explicitly before the deferred UI callback.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System.Runtime.InteropServices;
public static class TapRaterClipboardSequence {
    [DllImport("user32.dll")]
    public static extern uint GetClipboardSequenceNumber();
}
'@

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$keyPath = Join-Path $root '.wrangler/commerce-recovery-key.dpapi'
$evidencePath = Join-Path $PSScriptRoot 'key-custody.json'
$script:copySequence = $null
$script:copiedAt = $null

function Read-RecoveryKey {
    $secure = ConvertTo-SecureString ((Get-Content -LiteralPath $keyPath -Raw).Trim())
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ($value -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid recovery key format.' }
        return $value
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secure.Dispose()
        $value = $null
    }
}

function New-ProtectedClipboardData([string]$Text) {
    $data = New-Object System.Windows.Forms.DataObject
    # Serialized zero DWORDs are the Windows clipboard privacy opt-out formats.
    foreach ($format in @('ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'CanUploadToCloudClipboard')) {
        $data.SetData($format, $false, [IO.MemoryStream]::new([BitConverter]::GetBytes([int]0)))
    }
    $data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $false, $Text)
    return $data
}

function Clear-TransferClipboard {
    # Never read other clipboard contents or clear a later, unrelated copy.
    if ($null -ne $script:copySequence -and
        [TapRaterClipboardSequence]::GetClipboardSequenceNumber() -eq $script:copySequence) {
        [System.Windows.Forms.Clipboard]::Clear()
    }
    $script:copySequence = $null
    $script:copiedAt = $null
}

function Test-RecoveryKeyMatch([string]$Expected, [string]$Candidate) {
    # Case matters: the application uses this secret as text, not decoded hex.
    return $Candidate -cmatch '^[a-f0-9]{64}$' -and $Expected -ceq $Candidate
}

if ($SelfTest) {
    $key = Read-RecoveryKey
    try {
        if (-not (Test-RecoveryKeyMatch $key $key)) { throw 'Key validation failed.' }
        if (Test-RecoveryKeyMatch $key ($key + ' ')) { throw 'Whitespace check failed.' }
        if (Test-RecoveryKeyMatch ('a' * 64) ('A' * 64)) { throw 'Case check failed.' }
        if (Test-RecoveryKeyMatch ('a' * 64) ('b' * 64)) { throw 'Mismatch check failed.' }
        $data = New-ProtectedClipboardData 'test-only'
        foreach ($format in @('ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'CanUploadToCloudClipboard')) {
            $bytes = $data.GetData($format, $false).ToArray()
            if ($bytes.Length -ne 4 -or [BitConverter]::ToInt32($bytes, 0) -ne 0) { throw 'Clipboard privacy format failed.' }
        }
        Write-Output 'PASS: local DPAPI validation, exact-match checks, and clipboard privacy formats. No clipboard write, vault operation, or custody evidence was produced.'
    } finally { $key = $null }
}

[System.Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Tap Rater - Recovery key handoff'
$form.ClientSize = New-Object Drawing.Size(720, 560)
$form.MinimumSize = $form.Size
$form.MaximumSize = $form.Size
$form.StartPosition = 'CenterScreen'
$form.ShowInTaskbar = $true
$form.Font = New-Object Drawing.Font('Segoe UI', 10)

function Add-Label([string]$Text, [int]$Y, [int]$Height) {
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Location = New-Object Drawing.Point(24, $Y)
    $label.Size = New-Object Drawing.Size(672, $Height)
    $form.Controls.Add($label)
    return $label
}

$null = Add-Label 'COMMERCE_RECOVERY_SECRET' 20 26
$null = Add-Label 'In Bitwarden, add a Secure note named Tap Rater - Commerce recovery key. Paste the key into its Notes field, then save.' 54 52
$copy = New-Object System.Windows.Forms.Button
$copy.Text = '1. Copy recovery key'
$copy.Location = New-Object Drawing.Point(24, 114)
$copy.Size = New-Object Drawing.Size(220, 40)
$form.Controls.Add($copy)
$saved = New-Object System.Windows.Forms.Button
$saved.Text = '2. Saved - clear transfer clipboard'
$saved.Location = New-Object Drawing.Point(258, 114)
$saved.Size = New-Object Drawing.Size(340, 40)
$saved.Enabled = $false
$form.Controls.Add($saved)
$null = Add-Label 'The copied key expires after 60 seconds. Windows history and sync are excluded for this copy; third-party clipboard recorders are not controlled.' 168 48
$null = Add-Label 'After saving, open the note on another device. Type its full 64-character key below to verify recovery independently. Do not send a screenshot or paste the key into chat.' 232 58
$candidate = New-Object System.Windows.Forms.TextBox
$candidate.Location = New-Object Drawing.Point(24, 302)
$candidate.Size = New-Object Drawing.Size(672, 30)
$candidate.UseSystemPasswordChar = $true
$candidate.MaxLength = 64
$candidate.Enabled = $false
$form.Controls.Add($candidate)
$attestation = New-Object System.Windows.Forms.CheckBox
$attestation.Text = 'I retrieved this saved Bitwarden entry on another device.'
$attestation.Location = New-Object Drawing.Point(24, 346)
$attestation.Size = New-Object Drawing.Size(672, 34)
$attestation.Enabled = $false
$form.Controls.Add($attestation)
$verify = New-Object System.Windows.Forms.Button
$verify.Text = '3. Verify retrieved key'
$verify.Location = New-Object Drawing.Point(24, 394)
$verify.Size = New-Object Drawing.Size(220, 40)
$verify.Enabled = $false
$form.Controls.Add($verify)
$status = Add-Label 'Ready. No key has been copied or stored in Bitwarden by this helper.' 452 84
$status.ForeColor = [Drawing.Color]::DarkSlateGray
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000

$copy.Add_Click({
    $key = $null
    $package = $null
    $stage = 'read-key'
    try {
        $key = Read-RecoveryKey
        if ($ClipboardSelfTest) { $key = 'a' * 64 }
        $stage = 'create-package'
        $package = New-ProtectedClipboardData $key
        $stage = 'copy'
        [System.Windows.Forms.Clipboard]::SetDataObject($package, $true, 20, 100)
        $stage = 'record-copy'
        $script:copySequence = [TapRaterClipboardSequence]::GetClipboardSequenceNumber()
        $script:copiedAt = [DateTime]::UtcNow
        $timer.Start()
        $stage = 'verify-copy'
        if ([System.Windows.Forms.Clipboard]::GetText() -cne $key -or
            [TapRaterClipboardSequence]::GetClipboardSequenceNumber() -ne $script:copySequence) {
            throw 'Clipboard changed before verification.'
        }
        $saved.Enabled = $true
        $status.Text = 'Copied for 60 seconds. Paste into the Bitwarden Secure note and save it.'
    } catch {
        $failure = [ordered]@{
            recordedAt = [DateTime]::UtcNow.ToString('o')
            stage = $stage
            exceptionType = $_.Exception.GetType().FullName
            hresult = $_.Exception.HResult
            innerExceptionType = if ($_.Exception.InnerException) { $_.Exception.InnerException.GetType().FullName } else { $null }
            innerHresult = if ($_.Exception.InnerException) { $_.Exception.InnerException.HResult } else { $null }
            command = if ($_.Exception.CommandName -in @('Read-RecoveryKey', 'ConvertTo-SecureString', 'Get-Content')) { $_.Exception.CommandName } else { $null }
        }
        $failure | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root '.wrangler/key-handoff-copy-error.json') -Encoding UTF8
        $saved.Enabled = $false
        # If the clipboard is still locked, the running expiry timer retries cleanup.
        try { Clear-TransferClipboard } catch { }
        $status.Text = "Copy failed at $stage. No vault save is recorded. Tell Codex this error stage."
    } finally {
        $key = $null
        $package = $null
    }
})

$timer.Add_Tick({
    if ($null -ne $script:copiedAt -and ([DateTime]::UtcNow - $script:copiedAt).TotalSeconds -ge 60) {
        try {
            Clear-TransferClipboard
            $timer.Stop()
            $status.Text = 'Transfer clipboard cleared or replaced. Use Copy again only if you have not saved the note yet.'
        } catch { $status.Text = 'Clipboard is busy; clearing will retry. Do not close this window yet.' }
    }
})

$saved.Add_Click({
    try {
        Clear-TransferClipboard
        $timer.Stop()
        $copy.Enabled = $false
        $saved.Enabled = $false
        $candidate.Enabled = $true
        $attestation.Enabled = $true
        $verify.Enabled = $true
        [void]$candidate.Focus()
        $status.Text = 'Open the saved note on another device, then type its key above. Saving alone is not yet verification.'
    } catch { $status.Text = 'Clipboard is busy. Retry this step before proceeding.' }
})

$verify.Add_Click({
    $key = $null
    try {
        if (-not $attestation.Checked) {
            $status.Text = 'Confirm that you retrieved the saved note on another device before verifying.'
            return
        }
        $key = Read-RecoveryKey
        if (-not (Test-RecoveryKeyMatch $key $candidate.Text)) {
            $candidate.Clear()
            $status.Text = 'The retrieved value does not match. Recheck the saved note; the recovery key has not been changed.'
            return
        }
        $candidate.Clear()
        $evidence = [ordered]@{
            recordedAt = [DateTime]::UtcNow.ToString('o')
            secretName = 'COMMERCE_RECOVERY_SECRET'
            vault = 'Bitwarden'
            itemName = 'Tap Rater - Commerce recovery key'
            keyMatchesLocalDpapi = $true
            independentDeviceRetrievalOwnerAttested = $true
            vaultInspectedByAgent = $false
            method = 'Owner saved a secure note, retrieved it on another device, and manually typed its value into a masked local verifier.'
            containsSecret = $false
        }
        $evidence | ConvertTo-Json | Set-Content -LiteralPath $evidencePath -Encoding UTF8
        $verify.Enabled = $false
        $candidate.Enabled = $false
        $attestation.Enabled = $false
        $status.ForeColor = [Drawing.Color]::DarkGreen
        $status.Text = 'MATCH VERIFIED. Your independent-retrieval confirmation is recorded without the secret. You can close this window and tell Codex: verified.'
    } catch {
        $status.Text = 'Verification or evidence recording failed. No completion is claimed; retry.'
    } finally {
        $candidate.Clear()
        $key = $null
    }
})

$form.Add_FormClosing({
    param($sender, $eventArgs)
    try { Clear-TransferClipboard } catch {
        $eventArgs.Cancel = $true
        $status.Text = 'Clipboard is busy. Wait and try closing again so the transfer copy can be cleared.'
    }
})

$form.Add_Shown({
    # A hidden PowerShell host can hide the first native ShowWindow call too.
    $form.Hide()
    $form.Show()
    $form.Activate()
    if (-not $ClipboardSelfTest) {
        [ordered]@{
            processId = $PID
            visible = $form.Visible
            title = $form.Text
        } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root '.wrangler/key-handoff-window.json') -Encoding UTF8
    }
    if ($ClipboardSelfTest) { $clipboardTestTimer.Start() }
})

if ($ClipboardSelfTest) {
    $clipboardTestTimer = New-Object System.Windows.Forms.Timer
    $clipboardTestTimer.Interval = 250
    $clipboardTestTimer.Add_Tick({
        $clipboardTestTimer.Stop()
        try {
            $copy.PerformClick()
            $script:clipboardTestPassed = $saved.Enabled -and
                [TapRaterClipboardSequence]::GetClipboardSequenceNumber() -eq $script:copySequence -and
                [System.Windows.Forms.Clipboard]::GetText() -ceq ('a' * 64)
            if ($script:clipboardTestPassed) {
                $readBack = [System.Windows.Forms.Clipboard]::GetDataObject()
                foreach ($format in @('ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'CanUploadToCloudClipboard')) {
                    $bytes = $readBack.GetData($format, $false).ToArray()
                    if ($bytes.Length -ne 4 -or [BitConverter]::ToInt32($bytes, 0) -ne 0) {
                        $script:clipboardTestPassed = $false
                    }
                }
                $saved.PerformClick()
                $script:clipboardTestPassed = $script:clipboardTestPassed -and
                    $candidate.Enabled -and $null -eq $script:copySequence -and
                    -not [System.Windows.Forms.Clipboard]::ContainsText()

                # Simulate a newer unrelated copy using only protected dummy data.
                [System.Windows.Forms.Clipboard]::SetDataObject((New-ProtectedClipboardData 'old-dummy'), $true, 20, 100)
                $script:copySequence = [TapRaterClipboardSequence]::GetClipboardSequenceNumber()
                [System.Windows.Forms.Clipboard]::SetDataObject((New-ProtectedClipboardData 'new-dummy'), $true, 20, 100)
                Clear-TransferClipboard
                $script:clipboardTestPassed = $script:clipboardTestPassed -and
                    [System.Windows.Forms.Clipboard]::GetText() -ceq 'new-dummy'
                $script:copySequence = [TapRaterClipboardSequence]::GetClipboardSequenceNumber()
            }
        } finally {
            Clear-TransferClipboard
            $form.Close()
        }
    })
}

if ($SelfTest) {
    if (-not $candidate.UseSystemPasswordChar -or $candidate.Enabled -or $verify.Enabled) {
        throw 'Initial verification controls are not safely gated.'
    }
    $timer.Dispose()
    $form.Dispose()
    Write-Output 'PASS: transfer window constructs successfully; verification starts masked and disabled.'
    exit 0
}

try { [System.Windows.Forms.Application]::Run($form) } finally {
    $candidate.Clear()
    $timer.Dispose()
    $form.Dispose()
}
if ($ClipboardSelfTest) {
    $clipboardTestTimer.Dispose()
    Write-Output ('PASS status for dummy button copy/paste, privacy formats, saved-copy cleanup, and preservation of a newer copy: ' + [bool]$script:clipboardTestPassed)
    if (-not $script:clipboardTestPassed) { exit 1 }
}
