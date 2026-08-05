<#
Unit tests for the pure, side-effect-free Windows Update collector logic in
agent.ps1 (Resolve-RebootReason, Get-UpdateStateFromSignals,
Get-UpdateEventTypeFromMessage, Get-UpdateSourceFromSignals).

agent.ps1 is a single script with a top-level `while($true)` main loop, so
it cannot be dot-sourced directly in a test run without hanging. Instead,
this file parses agent.ps1's AST and defines ONLY the named pure functions
below into the test session — their real bodies, verbatim from agent.ps1,
never a hand-copied duplicate that could drift out of sync, and no main
loop or top-level script code ever executes.

Uses the legacy space-separated `Should Be` assertion syntax (not `Should
-Be`) because this repo's target runtime is Windows PowerShell 5.1, which
only ships Pester 3.4.0 out of the box — verified by actually running this
suite against that exact bundled version, not assumed. Works under Pester
4.x too. Run with:
    Invoke-Pester -Path .\tests\agent.WindowsUpdate.Tests.ps1
#>

# Plain top-level setup (not a BeforeAll block) so this also runs under
# Pester 3.4.0, which doesn't support script-scoped BeforeAll/AfterAll.
$script:AgentPath = Join-Path $PSScriptRoot "..\agent.ps1"
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($script:AgentPath, [ref]$null, [ref]$parseErrors)

if ($parseErrors.Count -gt 0) {
    throw "agent.ps1 failed to parse: $($parseErrors -join '; ')"
}

$targetFunctions = @(
    "Resolve-RebootReason",
    "Get-UpdateStateFromSignals",
    "Get-UpdateEventTypeFromMessage",
    "Get-UpdateSourceFromSignals"
)

$functionAsts = $ast.FindAll(
    { param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] },
    $true
)

foreach ($functionAst in $functionAsts) {
    if ($targetFunctions -contains $functionAst.Name) {
        . ([ScriptBlock]::Create($functionAst.Extent.Text))
    }
}

Describe "Resolve-RebootReason" {
    It "returns null when no signal is set" {
        Resolve-RebootReason -CbsPending $false -WuPending $false -PendingRename $false -WuaRebootRequired $false | Should BeNullOrEmpty
    }

    It "prioritizes CBS over every other signal" {
        Resolve-RebootReason -CbsPending $true -WuPending $true -PendingRename $true -WuaRebootRequired $true | Should Be "CBS"
    }

    It "reports WindowsUpdate when only the WU registry key is pending" {
        Resolve-RebootReason -CbsPending $false -WuPending $true -PendingRename $false -WuaRebootRequired $false | Should Be "WindowsUpdate"
    }

    It "reports PendingFileRename when only that signal is set" {
        Resolve-RebootReason -CbsPending $false -WuPending $false -PendingRename $true -WuaRebootRequired $false | Should Be "PendingFileRename"
    }

    It "reports WUA when only the WUA SystemInfo signal is set" {
        Resolve-RebootReason -CbsPending $false -WuPending $false -PendingRename $false -WuaRebootRequired $true | Should Be "WUA"
    }
}

Describe "Get-UpdateStateFromSignals" {
    It "returns NOT_INSTALLED when nothing has happened yet" {
        Get-UpdateStateFromSignals -IsDownloaded $false -HasSuccessHistory $false -HasFailureHistory $false -SystemRebootRequired $false | Should Be "NOT_INSTALLED"
    }

    It "returns DOWNLOADED when downloaded but not yet installed" {
        Get-UpdateStateFromSignals -IsDownloaded $true -HasSuccessHistory $false -HasFailureHistory $false -SystemRebootRequired $false | Should Be "DOWNLOADED"
    }

    It "returns FAILED when only failure history exists" {
        Get-UpdateStateFromSignals -IsDownloaded $true -HasSuccessHistory $false -HasFailureHistory $true -SystemRebootRequired $false | Should Be "FAILED"
    }

    It "returns INSTALLED when success history exists and no reboot is pending" {
        Get-UpdateStateFromSignals -IsDownloaded $true -HasSuccessHistory $true -HasFailureHistory $false -SystemRebootRequired $false | Should Be "INSTALLED"
    }

    It "returns INSTALLED_PENDING_REBOOT when success history exists but a reboot is pending" {
        Get-UpdateStateFromSignals -IsDownloaded $true -HasSuccessHistory $true -HasFailureHistory $false -SystemRebootRequired $true | Should Be "INSTALLED_PENDING_REBOOT"
    }

    It "prefers a later success over an earlier failure (e.g. a retry that succeeded)" {
        Get-UpdateStateFromSignals -IsDownloaded $true -HasSuccessHistory $true -HasFailureHistory $true -SystemRebootRequired $false | Should Be "INSTALLED"
    }
}

Describe "Get-UpdateEventTypeFromMessage" {
    It "classifies a successful install message" {
        Get-UpdateEventTypeFromMessage -Message "Installation Successful: Windows has successfully installed the following update" | Should Be "INSTALL_COMPLETED"
    }

    It "classifies a failed install message" {
        Get-UpdateEventTypeFromMessage -Message "Installation Failure: Windows failed to install the following update with error 0x80070002" | Should Be "FAILURE"
    }

    It "classifies a reboot-required message even when it mentions installation" {
        Get-UpdateEventTypeFromMessage -Message "A reboot is required to complete installation of updates" | Should Be "REBOOT_REQUIRED"
    }

    It "classifies a plain install-started message" {
        Get-UpdateEventTypeFromMessage -Message "Installation started for update KB5062660" | Should Be "INSTALL_STARTED"
    }

    It "classifies a completed download" {
        Get-UpdateEventTypeFromMessage -Message "Download completed successfully" | Should Be "DOWNLOAD_FINISHED"
    }

    It "classifies a started download" {
        Get-UpdateEventTypeFromMessage -Message "Download started for update" | Should Be "DOWNLOAD_STARTED"
    }

    It "classifies a completed scan" {
        Get-UpdateEventTypeFromMessage -Message "Scan for updates completed successfully" | Should Be "SCAN_FINISHED"
    }

    It "classifies a started scan" {
        Get-UpdateEventTypeFromMessage -Message "Scan for updates started" | Should Be "SCAN_STARTED"
    }

    It "falls back to OTHER for unrecognized text" {
        Get-UpdateEventTypeFromMessage -Message "Some unrelated diagnostic message" | Should Be "OTHER"
    }

    It "falls back to OTHER for an empty message" {
        Get-UpdateEventTypeFromMessage -Message "" | Should Be "OTHER"
    }
}

Describe "Get-UpdateSourceFromSignals" {
    It "reports WSUS when a WSUS server is configured" {
        Get-UpdateSourceFromSignals -WsusServer "http://wsus.internal.example:8530" -IntuneEnrolled $false -SccmServicePresent $false | Should Be "WSUS"
    }

    It "reports Intune when enrolled and no WSUS server is set" {
        Get-UpdateSourceFromSignals -WsusServer $null -IntuneEnrolled $true -SccmServicePresent $false | Should Be "Intune"
    }

    It "reports SCCM when the ccmexec service is present and nothing else matches" {
        Get-UpdateSourceFromSignals -WsusServer $null -IntuneEnrolled $false -SccmServicePresent $true | Should Be "SCCM"
    }

    It "reports Microsoft Update when no management signal is present" {
        Get-UpdateSourceFromSignals -WsusServer $null -IntuneEnrolled $false -SccmServicePresent $false | Should Be "Microsoft Update"
    }

    It "prioritizes WSUS over Intune/SCCM when multiple signals are present" {
        Get-UpdateSourceFromSignals -WsusServer "http://wsus.internal.example" -IntuneEnrolled $true -SccmServicePresent $true | Should Be "WSUS"
    }
}
