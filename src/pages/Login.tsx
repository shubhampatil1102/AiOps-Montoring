import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, FanIcon, Icon, LayoutGrid, LogIn, NetworkIcon, User } from "lucide-react";
import { useAuth } from "@/AuthContext";
import Button from "@/components/ui/Button";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import { validateLoginForm, type LoginFormErrors } from "@/lib/validation/authSchemas";
import styles from "./Login.module.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const redirectState = location.state as { from?: { pathname?: string } } | null;
  const redirectTo = redirectState?.from?.pathname || "/";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const errors = validateLoginForm({ identifier, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      await login(identifier, password, rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
           <User />
          </div>
          
          <span>NexOps Console</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Monitor, predict, and heal your fleet from one place.</p>

        {formError && (
          <div className={styles.formError} role="alert">
            {formError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="identifier">Email or Username</label>
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
            <label htmlFor="password">Password</label>
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
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember me
            </label>

            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => setIsForgotPasswordOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          <div className={styles.submitWrapper}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
            <LogIn size={14}/>  {isSubmitting ? "Signing in..." : "Sign in" }
            </Button>
            
          </div>
        </form>

        <p className={styles.footNote}>NexOps Monitoring Platform — Enterprise Edition</p>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
}
