import { useState } from "react";
import { Cloud, Github, LayoutGrid, Lock, type LucideIcon } from "lucide-react";
import type { LoginTranslations } from "@/lib/i18n/translations/en";
import styles from "./SSOButtons.module.css";

interface SSOProvider {
  id: string;
  label: string;
  Icon: LucideIcon;
}

// UI-only preparation per the brief — no OAuth/SAML/LDAP wiring exists or
// is implied here. Every button stays reachable via keyboard (no native
// `disabled`, which would pull it out of the tab order silently) but is
// aria-disabled and functionally inert.
const PROVIDERS: SSOProvider[] = [
  // { id: "entra", label: "Microsoft Entra ID", Icon: Building2 },
  { id: "google", label: "Google Workspace", Icon: LayoutGrid },
  { id: "github", label: "GitHub", Icon: Github },
  // { id: "okta", label: "Okta", Icon: ShieldCheck },
  // { id: "saml", label: "SAML", Icon: Shield },
  // { id: "ldap", label: "LDAP", Icon: Database },
  { id: "azuread", label: "Azure AD", Icon: Cloud },
];

interface SSOButtonsProps {
  t: LoginTranslations;
  theme: "light" | "dark";
}

export default function SSOButtons({ t, theme }: SSOButtonsProps) {
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  return (
    <div className={styles.wrapper} data-theme={theme}>
      <div className={styles.divider}>
        <span>{t.ssoContinueWith}</span>
      </div>

      <div className={styles.row}>
        {PROVIDERS.map((provider) => (
          <div key={provider.id} className={styles.buttonWrapper}>
            <button
              type="button"
              className={styles.providerButton}
              aria-disabled="true"
              aria-label={`${provider.label} — ${t.ssoComingSoonBadge}`}
              aria-describedby={`sso-tooltip-${provider.id}`}
              onClick={(event) => event.preventDefault()}
              onFocus={() => setTooltipId(provider.id)}
              onBlur={() => setTooltipId(null)}
              onMouseEnter={() => setTooltipId(provider.id)}
              onMouseLeave={() => setTooltipId(null)}
            >
              <provider.Icon size={17} aria-hidden="true" />
              <span className={styles.lockBadge} aria-hidden="true">
                <Lock size={7} strokeWidth={3} />
              </span>
            </button>

            {tooltipId === provider.id && (
              <div id={`sso-tooltip-${provider.id}`} role="tooltip" className={styles.tooltip}>
                <strong>{provider.label}</strong>
                <span>{t.ssoTooltip}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
