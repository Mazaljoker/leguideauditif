import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY;

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not defined');
    }
    resendInstance = new Resend(resendApiKey);
  }
  return resendInstance;
}

const FROM_EMAIL = 'LeGuideAuditif <contact@leguideauditif.fr>';
const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}

export async function sendAdminNotification(subject: string, html: string): Promise<void> {
  const result = await sendEmail({ to: ADMIN_EMAIL, subject: `[LGA Admin] ${subject}`, html });
  if (!result.success) {
    console.error(`Admin notification failed: ${result.error}`);
  }
}
