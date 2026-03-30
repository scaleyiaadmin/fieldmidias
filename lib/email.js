import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;

export async function sendNewContentEmail(content) {
  if (!NOTIFICATION_EMAIL || !resend) {
    console.warn('NOTIFICATION_EMAIL ou RESEND_API_KEY não configurados, pulando envio de email.');
    return;
  }

  const platformLabels = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'X (Twitter)',
    facebook: 'Facebook',
  };

  const platformLabel = platformLabels[content.platform] || content.platform;

  const scheduledStr = content.scheduled_date
    ? new Date(content.scheduled_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'Não agendado';

  const mediaHtml = content.media_urls && content.media_urls.length > 0
    ? content.media_urls.map(url => `<img src="${url}" style="max-width:100%;border-radius:8px;margin-top:12px;" alt="Mídia do post"/>`).join('')
    : '<p style="color:#8b8fa0;font-style:italic;">Nenhuma mídia anexada</p>';

  await resend.emails.send({
    from: `Field Mídias <${FROM_EMAIL}>`,
    to: NOTIFICATION_EMAIL,
    subject: `🔔 Novo conteúdo aguardando aprovação — ${platformLabel}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Conteúdo para Aprovação</title>
</head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;border-bottom:1px solid rgba(99,102,241,0.3);">
              <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:10px 20px;margin-bottom:16px;">
                <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:2px;">FIELD MÍDIAS</span>
              </div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Novo Conteúdo para Aprovação</h1>
              <p style="margin:8px 0 0;color:#8b8fa0;font-size:14px;">Um novo post está aguardando a sua revisão</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:32px;">

              <!-- Plataforma badge -->
              <div style="margin-bottom:24px;">
                <span style="background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;">
                  📸 ${platformLabel}
                </span>
                ${content.scheduled_date ? `<span style="margin-left:8px;background:rgba(16,185,129,0.1);color:#34d399;border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;">🗓 ${scheduledStr}</span>` : ''}
              </div>

              <!-- Título -->
              <h2 style="margin:0 0 12px;color:#fff;font-size:18px;font-weight:700;">${content.title}</h2>

              <!-- Conteúdo do post -->
              <div style="background:#0f0f17;border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0;color:#cbd5e1;line-height:1.7;font-size:14px;white-space:pre-wrap;">${content.content || 'Sem texto definido.'}</p>
              </div>

              <!-- Mídia -->
              ${content.media_urls && content.media_urls.length > 0 ? `
              <div style="margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#8b8fa0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Mídia Anexada</p>
                ${mediaHtml}
              </div>` : ''}

              <!-- Metadata -->
              ${content.metadata && Object.keys(content.metadata).length > 0 ? `
              <div style="background:#0f0f17;border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 10px;color:#8b8fa0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Informações Adicionais</p>
                ${Object.entries(content.metadata).map(([k, v]) => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;">
                  <span style="color:#64748b;font-size:13px;">${k}</span>
                  <span style="color:#cbd5e1;font-size:13px;font-weight:500;">${v}</span>
                </div>`).join('')}
              </div>` : ''}

              <!-- CTA Button -->
              <div style="text-align:center;margin-top:8px;">
                <a href="${DASHBOARD_URL}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.5px;">
                  Revisar no Dashboard →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#12121f;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#4b5563;font-size:12px;">Field Control — Sistema de Mídias Sociais</p>
              <p style="margin:4px 0 0;color:#374151;font-size:11px;">Este é um email automático, não responda.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}
