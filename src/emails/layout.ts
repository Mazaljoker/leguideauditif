/**
 * Layout HTML partagé pour tous les emails LeGuideAuditif.
 * Palette marine/crème/orange du design system.
 */
export function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5F0; font-family: Inter, Arial, sans-serif; color: #1B2E4A; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 2px solid #D97B3D; margin-bottom: 24px; }
    .header h1 { font-family: Merriweather, Georgia, serif; font-size: 22px; color: #1B2E4A; margin: 0; }
    .header .subtitle { font-size: 14px; color: #6B7B8D; margin-top: 4px; }
    .content { font-size: 16px; line-height: 1.75; }
    .content h2 { font-family: Merriweather, Georgia, serif; font-size: 18px; color: #1B2E4A; margin-top: 24px; }
    .btn { display: inline-block; padding: 12px 28px; background-color: #D97B3D; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .info-box { background-color: #ffffff; border-left: 4px solid #D97B3D; padding: 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #ddd; font-size: 13px; color: #6B7B8D; text-align: center; }
    .footer a { color: #D97B3D; }
  </style>
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
