import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Button from "@/components/ui/Button";
import LoadingOverlay from "../LoadingOverlay";
import SSOButtons from "../SSOButtons";
import { validateLoginForm, type LoginFormErrors } from "@/lib/validation/authSchemas";
import type { LoginTranslations } from "@/lib/i18n/translations/en";
import styles from "./LoginCard.module.css";

interface LoginCardProps {
  t: LoginTranslations;
  theme: "light" | "dark";
  onSubmit: (identifier: string, password: string, rememberMe: boolean) => void;
  isSubmitting: boolean;
  loadingStageIndex: number;
  formError: string | null;
  onForgotPassword: () => void;
}

// Extracted/enhanced from the previous src/pages/Login.tsx — same
// validateLoginForm/Button/useAuth().login contract, just presented as a
// glass card with a subtle 3D tilt (Framer Motion springs, disabled under
// prefers-reduced-motion).
export default function LoginCard({
  t,
  theme,
  onSubmit,
  isSubmitting,
  loadingStageIndex,
  formError,
  onForgotPassword,
}: LoginCardProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});

  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowBackground = useMotionTemplate`radial-gradient(320px circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.14), transparent 65%)`;

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 6);
    rotateX.set((0.5 - py) * 6);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLoginForm({ identifier, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit(identifier, password, rememberMe);
  }

  return (
    <motion.div
      ref={cardRef}
      className={styles.card}
      data-theme={theme}
      style={prefersReducedMotion ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {!prefersReducedMotion && (
        <motion.div className={styles.glow} style={{ background: glowBackground }} aria-hidden="true" />
      )}

      <div className={styles.content}>
        <h2 className={styles.title}>{t.loginTitle}</h2>
        <p className={styles.subtitle}>{t.loginSubtitle}</p>

        {formError && (
          <div className={styles.formError} role="alert">
            {formError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="identifier">{t.emailLabel}</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? "identifier-error" : undefined}
              className={fieldErrors.identifier ? styles.inputError : undefined}
              autoFocus
            />
            {fieldErrors.identifier && (
              <span id="identifier-error" className={styles.fieldError}>
                {fieldErrors.identifier}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t.passwordLabel}</label>
            <div className={styles.passwordRow}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={fieldErrors.password ? styles.inputError : undefined}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                aria-pressed={showPassword}
              >
                <motion.span
                  className={styles.toggleIcon}
                  animate={{ rotate: showPassword ? 15 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </motion.span>
              </button>
            </div>
            {fieldErrors.password && (
              <span id="password-error" className={styles.fieldError}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className={styles.optionsRow}>
            <label className={styles.rememberMe}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkboxInput}
              />
              {t.rememberDevice}
            </label>

            <button type="button" className={styles.forgotLink} onClick={onForgotPassword}>
              {t.forgotPassword}
            </button>
          </div>

          <div className={styles.submitWrapper}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <LogIn size={14} aria-hidden="true" />
              {isSubmitting ? t.signingIn : t.signIn}
            </Button>
          </div>
        </form>

        <SSOButtons t={t} theme={theme} />
      </div>

      <LoadingOverlay isVisible={isSubmitting} stages={t.loadingStages} stageIndex={loadingStageIndex} theme={theme} />
    </motion.div>
  );
}
