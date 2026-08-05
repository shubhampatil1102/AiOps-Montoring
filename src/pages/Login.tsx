import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import AnimatedBackground from "@/components/auth/AnimatedBackground";
import AuthHeader from "@/components/auth/AuthHeader";
import HeroSection from "@/components/auth/HeroSection";
import LoginCard from "@/components/auth/LoginCard";
import ParticleNetwork from "@/components/auth/ParticleNetwork";
import StatsCarousel, { type StatItem } from "@/components/auth/StatsCarousel";
import SystemStatusPill from "@/components/auth/SystemStatusPill";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import { useColorSchemePreference } from "@/lib/useColorSchemePreference";
import { useTranslation } from "@/lib/i18n/useTranslation";
import styles from "./Login.module.css";

// Mock, clearly-labeled illustrative figures — no live fleet-metrics
// endpoint backs the login page (this is the one place in this app where
// the brief itself asks for mock data: "For now use mock data").
const HERO_STATS: StatItem[] = [
  { value: "1,248", label: "Devices Protected" },
  { value: "99.98%", label: "Platform Availability" },
  { value: "92,845", label: "AI Insights Generated" },
  { value: "156", label: "Automated Fixes Today" },
  { value: "1400", label: "Critical Incidents Resolved" },
  { value: "1800", label: "Cloud Services Connected" },
];

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(max-width: ${breakpointPx}px)`).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const listener = () => setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [breakpointPx]);

  return isMobile;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslation();
  const { mode, setMode, resolvedTheme } = useColorSchemePreference();
  const isMobile = useIsMobile();

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const stageTimerRef = useRef<number | null>(null);

  const redirectState = location.state as { from?: { pathname?: string } } | null;
  const redirectTo = redirectState?.from?.pathname || "/";

  useEffect(() => {
    return () => {
      if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
    };
  }, []);

  async function handleLoginSubmit(identifier: string, password: string, rememberMe: boolean) {
    setFormError(null);
    setIsSubmitting(true);
    setLoadingStageIndex(0);

    const stageCount = t.loadingStages.length;
    const stageDurationMs = 550;

    // Staged messages are a loading narrative timed client-side while the
    // real login() call runs concurrently — Promise.all waits for BOTH,
    // so a fast response still shows the full sequence and a slow one
    // never gets cut short.
    const stageSequence = new Promise<void>((resolve) => {
      let index = 0;
      stageTimerRef.current = window.setInterval(() => {
        index += 1;
        if (index >= stageCount - 1) {
          setLoadingStageIndex(stageCount - 1);
          if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
          resolve();
        } else {
          setLoadingStageIndex(index);
        }
      }, stageDurationMs);
    });

    try {
      await Promise.all([login(identifier, password, rememberMe), stageSequence]);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
      setFormError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page} data-theme={resolvedTheme}>
      <AnimatedBackground />
      {!isMobile && <ParticleNetwork />}

      <div className={styles.layout}>
        <AuthHeader t={t} themeMode={mode} onThemeChange={setMode} />

        <div className={styles.panels}>
          <div className={styles.heroPanel}>
            {isMobile ? (
              <div className={styles.mobileBanner}>
                <span className={styles.mobileBrand}>{t.brandName}</span>
                <p className={styles.mobileTagline}>{t.brandTagline}</p>
                <SystemStatusPill label={t.statusOperational} />
              </div>
            ) : (
              <>
                <HeroSection t={t} />
                <StatsCarousel items={HERO_STATS} />
                <SystemStatusPill label={t.statusOperational} />
              </>
            )}
          </div>

          <div className={styles.authPanel}>
            <LoginCard
              t={t}
              theme={resolvedTheme}
              onSubmit={handleLoginSubmit}
              isSubmitting={isSubmitting}
              loadingStageIndex={loadingStageIndex}
              formError={formError}
              onForgotPassword={() => setIsForgotPasswordOpen(true)}
            />

            <div className={styles.footer}>
              <div className={styles.footerLinks}>
                <a href="#">{t.footerPrivacy}</a>
                <a href="#">{t.footerTerms}</a>
                <a href="#">{t.footerDocumentation}</a>
                <a href="#">{t.footerSupport}</a>
              </div>
              <div className={styles.footerMeta}>NexOps Monitoring Platform © {new Date().getFullYear()}</div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
    </div>
  );
}
