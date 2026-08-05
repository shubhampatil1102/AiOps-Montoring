export interface LoginTranslations {
  brandName: string;
  brandTagline: string;
  helpLabel: string;
  heroTitle: string;
  heroSubtitleLines: string[];
  heroDescription: string;
  heroStates: string[];
  statusOperational: string;
  loginTitle: string;
  loginSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  showPassword: string;
  hidePassword: string;
  rememberDevice: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  ssoContinueWith: string;
  ssoComingSoonBadge: string;
  ssoTooltip: string;
  loadingStages: string[];
  footerPrivacy: string;
  footerTerms: string;
  footerDocumentation: string;
  footerSupport: string;
}

export const en: LoginTranslations = {
  brandName: "NexOps",
  brandTagline: "AI Powered Endpoint Operations Platform",
  helpLabel: "Help",
  heroTitle: "Welcome to NexOps",
  heroSubtitleLines: ["Predict.", "Analyze.", "Automate."],
  heroDescription:
    "AI Powered Endpoint Operations Platform designed to monitor, analyse and automate enterprise infrastructure.",
  heroStates: ["AI Operations", "Platform Monitoring", "Security Intelligence", "Cloud Intelligence"],
  statusOperational: "All Systems Operational",
  loginTitle: "Welcome Back",
  loginSubtitle: "Sign in to continue managing your enterprise infrastructure.",
  emailLabel: "Email or Username",
  passwordLabel: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  rememberDevice: "Remember this trusted device",
  forgotPassword: "Forgot password?",
  signIn: "Sign In",
  signingIn: "Signing in…",
  ssoContinueWith: "Continue with",
  ssoComingSoonBadge: "Coming Soon",
  ssoTooltip: "Enterprise authentication will be available in a future release.",
  loadingStages: [
    "Authenticating…",
    "Verifying Credentials…",
    "Loading Organization…",
    "Loading User Permissions…",
    "Loading AI Workspace…",
    "Preparing Dashboard…",
  ],
  footerPrivacy: "Privacy",
  footerTerms: "Terms",
  footerDocumentation: "Documentation",
  footerSupport: "Support",
};
