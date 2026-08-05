// Plugin registry — a code constant, not a DB table (same convention as
// RBAC_MODULES / statusColors), since nothing needs to query "which
// plugins exist" independent of the code that implements them. Adding a
// new application only requires adding an entry here.
//
// Only entries with verifiable real executable/service names are included
// today. Every other discovered application automatically falls back to
// GENERIC_PLUGIN via matchPlugin() below — that fallback is the intended
// behavior for the long tail of installed software, not a gap.

export interface ApplicationPlugin {
  id: string;
  displayName: string;
  publisher: string;
  category: string;
  // Executable names (case-insensitive, no path) that identify a running
  // process as belonging to this application.
  matchExecutables: string[];
  // Substrings (case-insensitive) matched against the registry/AppX
  // DisplayName to identify an installed inventory entry.
  matchDisplayNamePatterns: string[];
  // Real Windows service names associated with this application, if any.
  // Empty array is correct and expected for most user-mode apps (Teams,
  // Chrome, OneDrive, etc. have no dedicated Windows service) — do not
  // add a service name here without verifying it actually exists.
  relatedServiceNames: string[];
  // Matches a CLOUD_PROVIDERS id (see cloudProviders.ts), or undefined if
  // this application has no meaningful mapped cloud provider.
  cloudProvider?: string;
  cpuWarnPercent: number;
  memWarnMb: number;
}

export const APPLICATION_PLUGINS: ApplicationPlugin[] = [
  {
    id: "microsoft-teams",
    displayName: "Microsoft Teams",
    publisher: "Microsoft Corporation",
    category: "Communication",
    // ms-teams.exe = current (MSIX) Teams; Teams.exe = classic Teams, still
    // present on many machines during the deprecation window.
    matchExecutables: ["ms-teams.exe", "teams.exe"],
    matchDisplayNamePatterns: ["Microsoft Teams"],
    relatedServiceNames: [],
    cloudProvider: "microsoft365",
    cpuWarnPercent: 40,
    memWarnMb: 1500,
  },
  {
    id: "microsoft-edge",
    displayName: "Microsoft Edge",
    publisher: "Microsoft Corporation",
    category: "Browser",
    matchExecutables: ["msedge.exe"],
    matchDisplayNamePatterns: ["Microsoft Edge"],
    // Real Edge auto-update services, distinct from the browser process itself.
    relatedServiceNames: ["edgeupdate", "edgeupdatem", "MicrosoftEdgeElevationService"],
    cpuWarnPercent: 40,
    memWarnMb: 2000,
  },
  {
    id: "google-chrome",
    displayName: "Google Chrome",
    publisher: "Google LLC",
    category: "Browser",
    matchExecutables: ["chrome.exe"],
    matchDisplayNamePatterns: ["Google Chrome"],
    // Real Google Update services installed alongside Chrome.
    relatedServiceNames: ["gupdate", "gupdatem"],
    cpuWarnPercent: 40,
    memWarnMb: 2500,
  },
  {
    id: "onedrive",
    displayName: "Microsoft OneDrive",
    publisher: "Microsoft Corporation",
    category: "Cloud Sync",
    matchExecutables: ["onedrive.exe"],
    matchDisplayNamePatterns: ["Microsoft OneDrive"],
    relatedServiceNames: [],
    cloudProvider: "microsoft365",
    cpuWarnPercent: 25,
    memWarnMb: 800,
  },
  {
    id: "windows-defender",
    displayName: "Windows Defender",
    publisher: "Microsoft Corporation",
    category: "Security",
    matchExecutables: ["msmpeng.exe", "securityhealthservice.exe"],
    matchDisplayNamePatterns: ["Windows Defender", "Microsoft Defender"],
    // Same service already checked by Get-ComplianceStatus's Defender check.
    relatedServiceNames: ["WinDefend"],
    cpuWarnPercent: 50,
    memWarnMb: 500,
  },
];

export const GENERIC_PLUGIN: ApplicationPlugin = {
  id: "generic",
  displayName: "Generic Application",
  publisher: "",
  category: "Unknown",
  matchExecutables: [],
  matchDisplayNamePatterns: [],
  relatedServiceNames: [],
  cpuWarnPercent: 60,
  memWarnMb: 1000,
};

export function matchPluginByExecutable(exeName: string | undefined | null): ApplicationPlugin {
  if (!exeName) return GENERIC_PLUGIN;
  const normalized = exeName.trim().toLowerCase();
  const match = APPLICATION_PLUGINS.find((plugin) =>
    plugin.matchExecutables.some((candidate) => candidate.toLowerCase() === normalized)
  );
  return match ?? GENERIC_PLUGIN;
}

export function matchPluginByDisplayName(displayName: string | undefined | null): ApplicationPlugin {
  if (!displayName) return GENERIC_PLUGIN;
  const normalized = displayName.trim().toLowerCase();
  const match = APPLICATION_PLUGINS.find((plugin) =>
    plugin.matchDisplayNamePatterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
  );
  return match ?? GENERIC_PLUGIN;
}
