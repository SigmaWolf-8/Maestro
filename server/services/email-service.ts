import { Resend } from "resend";
import nodemailer from "nodemailer";
import { storage } from "../storage";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  message: string;
  provider?: string;
  error?: string;
}

interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

interface SmtpConfig {
  email: string;
  password: string;
  host?: string;
  port?: number;
}

async function sendViaResend(config: ResendConfig, payload: EmailPayload): Promise<EmailResult> {
  const resend = new Resend(config.apiKey);
  const fromAddress = config.fromName
    ? `${config.fromName} <${config.fromEmail}>`
    : config.fromEmail;

  const emailData: any = {
    from: fromAddress,
    to: [payload.to],
    subject: payload.subject,
    html: payload.body,
  };
  if (payload.cc) {
    emailData.cc = [payload.cc];
  }
  if (payload.replyTo) {
    emailData.reply_to = payload.replyTo;
  }

  const { data, error } = await resend.emails.send(emailData);

  if (error) {
    return {
      success: false,
      message: error.message || "Resend API error",
      provider: "resend",
      error: error.message,
    };
  }

  return {
    success: true,
    message: "Email sent successfully",
    provider: "resend",
  };
}

async function sendViaSmtp(config: SmtpConfig, payload: EmailPayload): Promise<EmailResult> {
  const transportConfig: any = {
    host: config.host || "smtp.office365.com",
    port: config.port || 587,
    secure: false,
    auth: {
      user: config.email,
      pass: config.password,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
    requireTLS: true,
  };

  const transporter = nodemailer.createTransport(transportConfig);
  await transporter.sendMail({
    from: payload.from || config.email,
    to: payload.to,
    cc: payload.cc || undefined,
    subject: payload.subject,
    html: payload.body,
  });

  return {
    success: true,
    message: "Email sent successfully",
    provider: "smtp",
  };
}

export async function sendEmail(
  tenantId: string,
  payload: EmailPayload,
  userSmtp?: SmtpConfig | null
): Promise<EmailResult> {
  const tenant = tenantId ? await storage.getTenant(tenantId) : null;
  const config = (tenant?.config || {}) as Record<string, any>;

  const resendApiKey = config.resendApiKey || process.env.RESEND_API_KEY;
  const resendFromEmail = config.resendFromEmail || process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && resendFromEmail) {
    try {
      console.log("Sending email via Resend API:", { to: payload.to, subject: payload.subject });
      const result = await sendViaResend(
        {
          apiKey: resendApiKey,
          fromEmail: resendFromEmail,
          fromName: config.resendFromName || tenant?.companyName || "The Maestro",
        },
        payload
      );
      if (result.success) return result;
      console.warn("Resend send failed, trying fallbacks:", result.error);
    } catch (err: any) {
      console.warn("Resend error, trying fallbacks:", err.message);
    }
  }

  if (userSmtp?.email && userSmtp?.password) {
    try {
      console.log("Sending email via user SMTP:", { to: payload.to, subject: payload.subject });
      return await sendViaSmtp(userSmtp, payload);
    } catch (err: any) {
      console.warn("User SMTP failed:", err.message);
      return {
        success: false,
        message: formatSmtpError(err, userSmtp),
        provider: "smtp",
        error: err.message,
      };
    }
  }

  const tenantSmtp = config.smtp as SmtpConfig | undefined;
  if (tenantSmtp?.email && tenantSmtp?.password) {
    try {
      console.log("Sending email via tenant SMTP:", { to: payload.to, subject: payload.subject });
      return await sendViaSmtp(tenantSmtp, payload);
    } catch (err: any) {
      console.warn("Tenant SMTP failed:", err.message);
      return {
        success: false,
        message: formatSmtpError(err, tenantSmtp),
        provider: "smtp",
        error: err.message,
      };
    }
  }

  return {
    success: false,
    message: "No email provider configured. Go to Settings > Email to set up Resend API or SMTP credentials.",
    error: "no_provider",
  };
}

function formatSmtpError(err: any, config: SmtpConfig): string {
  const errMsg = err.message || "";
  const errCode = err.responseCode || err.code || "";

  const isOffice365 =
    (config.host || "").toLowerCase().includes("office365") ||
    (config.host || "").toLowerCase().includes("outlook");

  if (errMsg.includes("535") || errMsg.includes("Authentication") || errCode === "EAUTH") {
    return isOffice365
      ? "Microsoft 365 blocked basic password authentication. Use an App Password from account.microsoft.com > Security > App Passwords."
      : "SMTP authentication failed. Check your email and password in Settings.";
  }

  if (errMsg.includes("ECONNREFUSED") || errMsg.includes("ETIMEDOUT") || errMsg.includes("ENOTFOUND")) {
    return `Could not connect to mail server (${config.host || "smtp.office365.com"}:${config.port || 587}). Check SMTP host and port.`;
  }

  return errMsg;
}

export async function testResendConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.domains.list();
    if (error) {
      return { success: false, message: `API key validation failed: ${error.message}` };
    }
    return { success: true, message: `Connected. ${(data?.data || []).length} domain(s) configured.` };
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}
