# CorreoNova — plataforma de correo web

Webmail completo para **enviar y recibir** mensajes:

- Cuentas con registro, sesión y cambio de contraseña.
- Carpetas: Entrada, Importantes, Enviados, Borradores, Archivo y Papelera.
- Redactar, responder, reenviar, destacar, archivar y eliminar.
- Búsqueda sobre asunto, cuerpo y participantes.
- Entrega **interna inmediata**: si el destinatario tiene cuenta en CorreoNova, el mensaje aparece en su bandeja.
- Entrega **externa** con Resend (`RESEND_API_KEY`) cuando el destinatario no es usuario local.
- Recepción de Internet con el handler `email()` de Cloudflare Email Routing.
- Límites anti-abuso, contactos y contadores por carpeta.

## Qué puedes hacer ahora mismo

1. Despliega este Worker en Cloudflare.
2. Crea dos cuentas (por ejemplo `ana@tu-dominio.com` y `luis@tu-dominio.com`).
3. Desde Ana envía un mensaje a Luis: llega al instante a Entrada de Luis.
4. Para correo de Internet, configura un dominio + Email Routing + Resend.

Sin dominio propio la plataforma ya funciona como correo interno entre usuarios.

## 1. Subir a GitHub

Sube el contenido de esta carpeta. No subas claves API.

## 2. Crear la base D1

```bash
npm install
npx wrangler login
npx wrangler d1 create correonova-db
```

Copia el `database_id` a `wrangler.jsonc` en lugar de `REEMPLAZAR_CON_EL_ID_DE_D1`.

## 3. Tablas

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## 4. Probar en local

```bash
npm run dev
```

Abre la URL que imprime Wrangler.

## 5. Desplegar

```bash
npm run deploy
```

## 6. Envío a Internet

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
```

`MAIL_FROM` debe ser un remitente autorizado por Resend.

Si no hay clave, CorreoNova **no finge** el envío externo: guarda el mensaje en Enviados y entrega solo a usuarios locales.

## 7. Recepción desde Internet

En Cloudflare Dashboard:

1. Activa Email Routing en tu dominio.
2. Crea un registro MX según indique Cloudflare.
3. Destino: *Send to a Worker* → este Worker.
4. El destinatario (`para@tudominio.com`) debe existir como usuario registrado.

Documentación: https://developers.cloudflare.com/email-routing/

## 8. DNS recomendado (dominio propio)

- **MX** → Email Routing de Cloudflare
- **SPF** → `v=spf1 include:_spf.resend.com ~all` (ajusta al proveedor)
- **DKIM** → claves que te dé Resend o Cloudflare
- **DMARC** → `v=DMARC1; p=quarantine; rua=mailto:admin@tudominio.com`

## API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/` | Interfaz |
| GET | `/api/health` | Estado |
| POST | `/api/register` | Alta |
| POST | `/api/login` | Sesión |
| POST | `/api/logout` | Salir |
| GET | `/api/me` | Usuario actual |
| POST | `/api/password` | Cambiar clave |
| GET | `/api/messages` | Lista + búsqueda |
| PATCH | `/api/messages/:id` | Leer, estrella, mover |
| DELETE | `/api/messages/:id` | Borrar definitivo |
| POST | `/api/send` | Enviar o borrador |
| GET | `/api/contacts` | Destinatarios recientes |

## Límites de esta versión

No incluye todavía un parser MIME de producción con adjuntos en R2, verificación de alta por correo, 2FA, ni panel de administración. El esquema y el Worker están listos para añadirlos.
