<#
Unit tests for the pure, side-effect-free User & Privilege Collector logic
in agent.ps1 (Test-AzureAdSid, Test-MicrosoftAccountUsername,
Resolve-AccountType, Resolve-BuiltInAccountKind, Resolve-EffectivePrivilege,
Parse-QuserOutput).

Same AST-extraction technique as agent.WindowsUpdate.Tests.ps1 — agent.ps1
can't be dot-sourced directly (top-level `while($true)` main loop), so this
file parses its AST and defines only the named pure functions, real bodies
verbatim, no main loop ever executes. Uses the legacy `Should Be`
space-separated syntax, verified against the Pester 3.4.0 that ships with
Windows PowerShell by default. Run with:
    Invoke-Pester -Path .\tests\agent.UserPrivilege.Tests.ps1
#>

$script:AgentPath = Join-Path $PSScriptRoot "..\agent.ps1"
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($script:AgentPath, [ref]$null, [ref]$parseErrors)

if ($parseErrors.Count -gt 0) {
    throw "agent.ps1 failed to parse: $($parseErrors -join '; ')"
}

$targetFunctions = @(
    "Test-AzureAdSid",
    "Test-MicrosoftAccountUsername",
    "Resolve-AccountType",
    "Resolve-BuiltInAccountKind",
    "Resolve-EffectivePrivilege",
    "Parse-QuserOutput"
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

Describe "Test-AzureAdSid" {
    It "recognizes a real Azure AD SID prefix" {
        Test-AzureAdSid -Sid "S-1-12-1-4128686752-1239746807-3561830034-1038939875" | Should Be $true
    }

    It "rejects a standard local/domain SID" {
        Test-AzureAdSid -Sid "S-1-5-21-303125894-1350675420-965556828-500" | Should Be $false
    }

    It "rejects a null/empty SID" {
        Test-AzureAdSid -Sid $null | Should Be $false
    }
}

Describe "Test-MicrosoftAccountUsername" {
    It "recognizes an email-shaped username" {
        Test-MicrosoftAccountUsername -Username "someone@outlook.com" | Should Be $true
    }

    It "rejects a plain username" {
        Test-MicrosoftAccountUsername -Username "shubhampatil" | Should Be $false
    }

    It "rejects an empty username" {
        Test-MicrosoftAccountUsername -Username "" | Should Be $false
    }
}

Describe "Resolve-AccountType" {
    It "reports Azure AD when the SID has the AAD prefix" {
        Resolve-AccountType -IsLocalAccount $false -Sid "S-1-12-1-1-2-3-4" -Username "user@corp.com" | Should Be "Azure AD"
    }

    It "reports Microsoft Account for a local account with an email-shaped username" {
        Resolve-AccountType -IsLocalAccount $true -Sid "S-1-5-21-1-2-3-1001" -Username "someone@outlook.com" | Should Be "Microsoft Account"
    }

    It "reports Local for a plain local account" {
        Resolve-AccountType -IsLocalAccount $true -Sid "S-1-5-21-1-2-3-1001" -Username "localadmin" | Should Be "Local"
    }

    It "reports Domain when not local and not Azure AD" {
        Resolve-AccountType -IsLocalAccount $false -Sid "S-1-5-21-1-2-3-1105" -Username "jsmith" | Should Be "Domain"
    }
}

Describe "Resolve-BuiltInAccountKind" {
    It "identifies the built-in Administrator account by SID suffix -500" {
        Resolve-BuiltInAccountKind -Sid "S-1-5-21-303125894-1350675420-965556828-500" | Should Be "BuiltInAdministrator"
    }

    It "identifies the built-in Guest account by SID suffix -501" {
        Resolve-BuiltInAccountKind -Sid "S-1-5-21-303125894-1350675420-965556828-501" | Should Be "BuiltInGuest"
    }

    It "returns null for a regular user SID" {
        Resolve-BuiltInAccountKind -Sid "S-1-5-21-303125894-1350675420-965556828-1001" | Should BeNullOrEmpty
    }
}

Describe "Resolve-EffectivePrivilege" {
    It "falls back to group membership when token inspection is unavailable" {
        $result = Resolve-EffectivePrivilege -TokenElevationType $null -TokenElevated $null -IsInLocalAdminsGroup $true
        $result.isAdministrator | Should Be $true
        $result.source | Should Be "group-membership-fallback"
    }

    It "reports Full elevation type as administrator and elevated" {
        $result = Resolve-EffectivePrivilege -TokenElevationType 2 -TokenElevated $true -IsInLocalAdminsGroup $true
        $result.isAdministrator | Should Be $true
        $result.isElevated | Should Be $true
        $result.source | Should Be "access-token"
    }

    It "reports Limited elevation type as administrator but NOT elevated (split-token UAC case)" {
        $result = Resolve-EffectivePrivilege -TokenElevationType 3 -TokenElevated $false -IsInLocalAdminsGroup $true
        $result.isAdministrator | Should Be $true
        $result.isElevated | Should Be $false
        $result.source | Should Be "access-token"
    }

    It "cross-checks group membership for Default elevation type" {
        $resultAdmin = Resolve-EffectivePrivilege -TokenElevationType 1 -TokenElevated $true -IsInLocalAdminsGroup $true
        $resultAdmin.isAdministrator | Should Be $true

        $resultStandard = Resolve-EffectivePrivilege -TokenElevationType 1 -TokenElevated $false -IsInLocalAdminsGroup $false
        $resultStandard.isAdministrator | Should Be $false
    }
}

Describe "Parse-QuserOutput" {
    It "parses a real query user header + active console session row" {
        $lines = @(
            " USERNAME              SESSIONNAME        ID  STATE   IDLE TIME  LOGON TIME",
            ">shubhampatil          console             1  Active      none   31-07-2026 11:42 AM"
        )
        $rows = Parse-QuserOutput -Lines $lines
        $rows.Count | Should Be 1
        $rows[0]["USERNAME"] | Should Be "shubhampatil"
        $rows[0]["SESSIONNAME"] | Should Be "console"
        $rows[0]["ID"] | Should Be "1"
        $rows[0]["STATE"] | Should Be "Active"
    }

    It "returns an empty array for missing or too-short input" {
        (Parse-QuserOutput -Lines $null).Count | Should Be 0
        (Parse-QuserOutput -Lines @("only a header")).Count | Should Be 0
    }
}
