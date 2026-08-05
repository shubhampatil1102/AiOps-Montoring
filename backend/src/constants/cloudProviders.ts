// Provider registry — a code constant, not a DB table, same reasoning as
// applicationPlugins.ts. `apiType: "none"` providers are still listed (so
// the plugin/mapping architecture is complete and future-ready) but report
// an honest NOT_CONFIGURED status rather than fabricated data — Microsoft
// 365/Azure AD/Intune (Microsoft Graph Service Health API), AWS, Google
// Workspace, Sophos Central, and Cisco Umbrella all require OAuth
// app-registration credentials that don't exist in this project.
//
// URLs below were verified live (curl) before being hardcoded — see the
// implementation notes in the Digital Workplace Intelligence plan.

export type CloudApiType = "statuspage" | "slack" | "none";

export interface CloudProvider {
  id: string;
  displayName: string;
  apiType: CloudApiType;
  statusApiUrl?: string;
  incidentsApiUrl?: string;
  statusPageUrl: string;
}

export const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: "github",
    displayName: "GitHub",
    apiType: "statuspage",
    statusApiUrl: "https://www.githubstatus.com/api/v2/status.json",
    incidentsApiUrl: "https://www.githubstatus.com/api/v2/incidents.json",
    statusPageUrl: "https://www.githubstatus.com",
  },
  {
    id: "cloudflare",
    displayName: "Cloudflare",
    apiType: "statuspage",
    statusApiUrl: "https://www.cloudflarestatus.com/api/v2/status.json",
    incidentsApiUrl: "https://www.cloudflarestatus.com/api/v2/incidents.json",
    statusPageUrl: "https://www.cloudflarestatus.com",
  },
  {
    id: "atlassian",
    displayName: "Atlassian",
    apiType: "statuspage",
    statusApiUrl: "https://status.atlassian.com/api/v2/status.json",
    incidentsApiUrl: "https://status.atlassian.com/api/v2/incidents.json",
    statusPageUrl: "https://status.atlassian.com",
  },
  {
    id: "zoom",
    displayName: "Zoom",
    apiType: "statuspage",
    // Not status.zoom.us — that domain serves an HTML redirect page (200 OK,
    // not a real HTTP redirect), which would silently fail JSON parsing.
    statusApiUrl: "https://www.zoomstatus.com/api/v2/status.json",
    incidentsApiUrl: "https://www.zoomstatus.com/api/v2/incidents.json",
    statusPageUrl: "https://www.zoomstatus.com",
  },
  {
    id: "slack",
    displayName: "Slack",
    apiType: "slack",
    // Slack does not use Statuspage — a distinct, custom JSON format:
    // {status, date_created, date_updated, active_incidents: [...]}.
    statusApiUrl: "https://slack-status.com/api/v2.0.0/current",
    statusPageUrl: "https://slack-status.com",
  },
  {
    id: "azure",
    displayName: "Microsoft Azure",
    // Azure's public status is an RSS/XML feed, not JSON — parsing it
    // properly needs an XML parser this project doesn't have. Left
    // NOT_CONFIGURED rather than half-built, same as the OAuth-gated ones.
    apiType: "none",
    statusPageUrl: "https://azure.status.microsoft/en-us/status",
  },
  {
    id: "microsoft365",
    displayName: "Microsoft 365 (Teams, Exchange, SharePoint, OneDrive)",
    apiType: "none",
    statusPageUrl: "https://portal.office.com/servicestatus",
  },
  {
    id: "entra-id",
    displayName: "Microsoft Entra ID",
    apiType: "none",
    statusPageUrl: "https://portal.office.com/servicestatus",
  },
  {
    id: "intune",
    displayName: "Microsoft Intune",
    apiType: "none",
    statusPageUrl: "https://portal.office.com/servicestatus",
  },
  {
    id: "aws",
    displayName: "Amazon Web Services",
    apiType: "none",
    statusPageUrl: "https://health.aws.amazon.com/health/status",
  },
  {
    id: "google-workspace",
    displayName: "Google Workspace",
    apiType: "none",
    statusPageUrl: "https://www.google.com/appsstatus/dashboard/",
  },
  {
    id: "sophos-central",
    displayName: "Sophos Central",
    apiType: "none",
    statusPageUrl: "https://status.sophos.com",
  },
  {
    id: "cisco-umbrella",
    displayName: "Cisco Umbrella",
    apiType: "none",
    statusPageUrl: "https://status.umbrella.com",
  },
];
