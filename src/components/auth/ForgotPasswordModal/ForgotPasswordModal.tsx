import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { validateForgotPasswordForm, type ForgotPasswordFormErrors } from "@/lib/validation/authSchemas";
import styles from "./ForgotPasswordModal.module.css";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<ForgotPasswordFormErrors["email"]>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleClose() {
    onClose();
    setEmail("");
    setFieldError(undefined);
    setIsSubmitting(false);
    setIsSubmitted(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validateForgotPasswordForm({ email });
    setFieldError(errors.email);
    if (errors.email) return;

    setIsSubmitting(true);
    // No email flow yet (CLAUDE.md: "Forgot Password — placeholder link only,
    // no email flow yet") — a generic confirmation avoids revealing whether
    // an account exists, matching how the real flow will behave once built.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} titleId="forgot-password-title" title="Reset your password">
      {isSubmitted ? (
        <div className={styles.confirmation} role="status">
          <MailCheck className={styles.confirmationIcon} size={32} aria-hidden="true" />
          <p>
            If an account exists for <strong>{email}</strong>, you&rsquo;ll receive password reset instructions shortly.
          </p>
          <Button type="button" variant="primary" onClick={handleClose} data-autofocus>
            Done
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <p className={styles.description}>
            Enter the email address associated with your account and we&rsquo;ll send you instructions to reset your password.
          </p>

          <div className={styles.field}>
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "forgot-email-error" : undefined}
              className={fieldError ? styles.inputError : undefined}
              data-autofocus
            />
            {fieldError && (
              <span id="forgot-email-error" className={styles.fieldError}>
                {fieldError}
              </span>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset instructions"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
