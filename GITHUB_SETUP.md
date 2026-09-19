# Flujo

GitHub (código)
  → Cloudflare Workers (aplicación)
  → Cloudflare D1 (usuarios, sesiones, mensajes)
  → Email Routing + Resend (correo de Internet)

Nunca guardes `RESEND_API_KEY` ni `MAIL_FROM` en el repositorio.
Usa `npx wrangler secret put`.
