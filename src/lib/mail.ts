import nodemailer from "nodemailer";

function trimEnv(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export type AdminMailResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: "missing_smtp" }
  | { status: "failed"; message: string };

/** Gmail「應用程式密碼」常被複製成含空白；移除空白可避免認證失敗 */
function normalizeSmtpPass(pass: string): string {
  return pass.replace(/\s+/g, "");
}

export async function sendAdminNotification(opts: {
  subject: string;
  text: string;
}): Promise<AdminMailResult> {
  const host = trimEnv(process.env.SMTP_HOST);
  const user = trimEnv(process.env.SMTP_USER);
  const rawPass = trimEnv(process.env.SMTP_PASS);
  const pass = rawPass ? normalizeSmtpPass(rawPass) : undefined;

  if (!host || !user || !pass) {
    console.warn(
      "[mail] skip: set SMTP_HOST, SMTP_USER, SMTP_PASS on the server (e.g. Vercel env).",
    );
    return { status: "skipped", reason: "missing_smtp" };
  }

  const portRaw = trimEnv(process.env.SMTP_PORT);
  const port = portRaw ? Number(portRaw) : 587;
  const secure = Number.isFinite(port) && port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
  });

  const to =
    trimEnv(process.env.APPROVAL_NOTIFY_TO) ?? "weijhih0403@gmail.com";
  let from = trimEnv(process.env.MAIL_FROM) ?? user;

  if (/gmail/i.test(host) && from.toLowerCase() !== user.toLowerCase()) {
    console.warn(
      `[mail] MAIL_FROM (${from}) differs from SMTP_USER (${user}). Gmail often requires them to match (or a configured alias).`,
    );
  }

  try {
    const info = await transporter.sendMail({
      from: { name: "淳手作/淺草｜純手工甜品店", address: from },
      to,
      subject: opts.subject,
      text: opts.text,
    });
    const messageId = info.messageId ?? "(no-message-id)";
    console.info(`[mail] sent ok messageId=${messageId} to=${to}`);
    return { status: "sent", messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[mail] send failed:", message);
    return { status: "failed", message };
  }
}
