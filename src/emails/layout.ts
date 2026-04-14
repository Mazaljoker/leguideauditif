/**
 * Layout HTML partag\u00e9 pour tous les emails LeGuideAuditif.
 * Palette marine/cr\u00e8me/orange du design system.
 * Dark mode via @media (prefers-color-scheme: dark).
 */
export function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; background-color: #F8F5F0; font-family: Inter, Arial, sans-serif; color: #1B2E4A; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 2px solid #D97B3D; margin-bottom: 24px; }
    .header h1 { font-family: Merriweather, Georgia, serif; font-size: 22px; color: #1B2E4A; margin: 0; }
    .header .subtitle { font-size: 14px; color: #6B7B8D; margin-top: 4px; }
    .content { font-size: 16px; line-height: 1.75; }
    .content p { color: #1B2E4A; }
    .content h2 { font-family: Merriweather, Georgia, serif; font-size: 18px; color: #1B2E4A; margin-top: 24px; }
    .content li { color: #1B2E4A; }
    .btn { display: inline-block; padding: 12px 28px; background-color: #D97B3D; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .btn-marine { background-color: #1B2E4A; color: #ffffff !important; }
    .btn-danger { background-color: #A32D2D; color: #ffffff !important; }
    .info-box { background-color: #ffffff; border-left: 4px solid #D97B3D; padding: 16px; margin: 16px 0; border-radius: 0 6px 6px 0; color: #1B2E4A; }
    .info-box p { color: #1B2E4A; }
    .info-box-marine { border-left-color: #1B2E4A; }
    .text-muted { font-size: 13px; color: #6B7B8D; }
    .text-orange { color: #D97B3D; }
    .text-alert { color: #D97B3D; font-weight: bold; }
    a { color: #D97B3D; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #ddd; font-size: 13px; color: #6B7B8D; text-align: center; }
    .footer a { color: #D97B3D; }

    /* ---- Dark mode ---- */
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; color: #E8E6E1 !important; }
      .container { background-color: #1a1a2e !important; }
      .header h1 { color: #F8F5F0 !important; }
      .header .subtitle { color: #A0AEC0 !important; }
      .header { border-bottom-color: #D97B3D !important; }
      .content p, .content li, .content td, .content span { color: #E8E6E1 !important; }
      .content h2 { color: #F8F5F0 !important; }
      .content strong { color: #F8F5F0 !important; }
      .info-box { background-color: #2a2a3e !important; color: #E8E6E1 !important; }
      .info-box p, .info-box strong { color: #E8E6E1 !important; }
      .btn { color: #ffffff !important; }
      .btn-marine { background-color: #3a5a8a !important; }
      a { color: #E8A75D !important; }
      .text-muted { color: #A0AEC0 !important; }
      .text-orange { color: #E8A75D !important; }
      .text-alert { color: #E8A75D !important; }
      .footer { border-top-color: #3a3a4e !important; color: #A0AEC0 !important; }
      .footer a { color: #E8A75D !important; }
    }
  </style>
  <!--[if mso]>
  <style>
    body { background-color: #F8F5F0 !important; }
  </style>
  <![endif]-->
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LeGuideAuditif.fr</h1>
      <div class="subtitle">Votre guide ind\u00e9pendant en sant\u00e9 auditive</div>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} LeGuideAuditif.fr &mdash; Information ind\u00e9pendante en sant\u00e9 auditive</p>
      <p><a href="https://leguideauditif.fr">leguideauditif.fr</a></p>
    </div>
  </div>
</body>
</html>`;
}
