import { PAGE } from "./ui.js";

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-credentials": "true",
      ...extra
    }
  });

function uuid() {
  return crypto.randomUUID();
}

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$120000$${b64(salt)}$${b64(bits)}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length < 4) return false;
  const [, iter, salt64, hash64] = parts;
  const data = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: unb64(salt64), iterations: Number(iter) || 120000, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits) === hash64;
}

function cookie(name, value, maxAge, req) {
  const secure = req && new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
}

function getCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function emailsOf(text) {
  return String(text || "")
    .split(/[;,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

async function currentUser(req, env) {
  const sid = getCookie(req, "cn_session");
  if (!sid || !env.DB) return null;
  return (
    (await env.DB.prepare(
      "SELECT u.id,u.email,u.display_name,u.signature FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?"
    )
      .bind(sid, new Date().toISOString())
      .first()) || null
  );
}

async function requireUser(req, env) {
  const u = await currentUser(req, env);
  if (!u) throw new Error("Debes iniciar sesión.");
  return u;
}

async function rateLimit(env, key, limit, windowMs) {
  if (!env.DB) return;
  const now = Date.now();
  await env.DB.prepare("DELETE FROM rate_events WHERE created_at < ?").bind(now - windowMs).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM rate_events WHERE key=?").bind(key).first();
  if ((row?.n || 0) >= limit) throw new Error("Demasiados intentos. Espera un momento.");
  await env.DB.prepare("INSERT INTO rate_events(id,key,created_at) VALUES(?,?,?)").bind(uuid(), key, now).run();
}

async function rememberContacts(env, ownerId, addresses) {
  for (const email of emailsOf(addresses)) {
    const id = uuid();
    await env.DB.prepare(
      "INSERT INTO contacts(id,owner_id,email,name,last_used) VALUES(?,?,?,?,?) ON CONFLICT(owner_id,email) DO UPDATE SET last_used=excluded.last_used"
    )
      .bind(id, ownerId, email, email.split("@")[0], new Date().toISOString())
      .run();
  }
}

async function countsFor(env, userId) {
  const { results } = await env.DB.prepare(
    `SELECT
      SUM(CASE WHEN folder='inbox' AND is_deleted=0 THEN 1 ELSE 0 END) AS inbox,
      SUM(CASE WHEN is_starred=1 AND is_deleted=0 THEN 1 ELSE 0 END) AS starred,
      SUM(CASE WHEN folder='sent' AND is_deleted=0 THEN 1 ELSE 0 END) AS sent,
      SUM(CASE WHEN folder='drafts' AND is_deleted=0 THEN 1 ELSE 0 END) AS drafts,
      SUM(CASE WHEN folder='archive' AND is_deleted=0 THEN 1 ELSE 0 END) AS archive,
      SUM(CASE WHEN is_deleted=1 THEN 1 ELSE 0 END) AS trash
     FROM messages WHERE owner_id=?`
  )
    .bind(userId)
    .all();
  return results?.[0] || {};
}

async function deliverLocal(env, { from, toList, ccList, subject, body, inReplyTo }) {
  const delivered = [];
  const targets = [...new Set([...toList, ...ccList])];
  for (const addr of targets) {
    const owner = await env.DB.prepare("SELECT id,email FROM users WHERE email=?").bind(addr).first();
    if (!owner) continue;
    await env.DB.prepare(
      "INSERT INTO messages(id,owner_id,folder,sender,recipients,cc,subject,body,in_reply_to) VALUES(?,?,?,?,?,?,?,?,?)"
    )
      .bind(uuid(), owner.id, "inbox", from, toList.join(", "), ccList.join(", "), subject, body, inReplyTo || null)
      .run();
    delivered.push(addr);
  }
  return delivered;
}

async function sendExternal(env, { from, toList, ccList, subject, body }) {
  if (!env.RESEND_API_KEY) return { sent: false, detail: "Sin RESEND_API_KEY" };
  const payload = {
    from: env.MAIL_FROM || from || "onboarding@resend.dev",
    to: toList,
    subject: subject || "(sin asunto)",
    text: body
  };
  if (ccList.length) payload.cc = ccList;
  const rr = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!rr.ok) {
    const t = await rr.text();
    throw new Error("El proveedor de correo rechazó el envío: " + t.slice(0, 240));
  }
  return { sent: true };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS"
        }
      });
    }

    try {
      if (req.method === "GET" && url.pathname === "/") {
        return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          version: env.APP_VERSION || "V12",
          database: !!env.DB,
          outbound: !!env.RESEND_API_KEY
        });
      }

      if (url.pathname === "/api/register" && req.method === "POST") {
        if (!env.DB) return json({ error: "D1 no está conectada. Sigue LEEME.md." }, 503);
        await rateLimit(env, "reg:" + (req.headers.get("CF-Connecting-IP") || "ip"), 8, 15 * 60 * 1000);
        const { email, password, display_name } = await req.json();
        const addr = String(email || "").toLowerCase().trim();
        if (!emailsOf(addr).length) return json({ error: "Correo inválido." }, 400);
        if (!password || String(password).length < 8) {
          return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
        }
        const id = uuid();
        const hash = await hashPassword(password);
        const name = String(display_name || addr.split("@")[0]).slice(0, 80);
        try {
          await env.DB.prepare("INSERT INTO users(id,email,password_hash,display_name) VALUES(?,?,?,?)")
            .bind(id, addr, hash, name)
            .run();
        } catch {
          return json({ error: "Ese correo ya está registrado." }, 409);
        }
        const sid = uuid();
        const expires = new Date(Date.now() + 30 * 86400000).toISOString();
        await env.DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(sid, id, expires).run();
        return json(
          { user: { id, email: addr, display_name: name } },
          200,
          { "set-cookie": cookie("cn_session", sid, 30 * 86400, req) }
        );
      }

      if (url.pathname === "/api/login" && req.method === "POST") {
        if (!env.DB) return json({ error: "D1 no está conectada." }, 503);
        await rateLimit(env, "login:" + (req.headers.get("CF-Connecting-IP") || "ip"), 20, 15 * 60 * 1000);
        const { email, password } = await req.json();
        const row = await env.DB.prepare("SELECT * FROM users WHERE email=?")
          .bind(String(email || "").toLowerCase().trim())
          .first();
        if (!row || !(await verifyPassword(password, row.password_hash))) {
          return json({ error: "Correo o contraseña incorrectos." }, 401);
        }
        const sid = uuid();
        const expires = new Date(Date.now() + 30 * 86400000).toISOString();
        await env.DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(sid, row.id, expires).run();
        return json(
          { user: { id: row.id, email: row.email, display_name: row.display_name } },
          200,
          { "set-cookie": cookie("cn_session", sid, 30 * 86400, req) }
        );
      }

      if (url.pathname === "/api/logout" && req.method === "POST") {
        const sid = getCookie(req, "cn_session");
        if (sid && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(sid).run();
        return json({ ok: true }, 200, { "set-cookie": cookie("cn_session", "", 0, req) });
      }

      if (url.pathname === "/api/me" && req.method === "GET") {
        const u = await currentUser(req, env);
        if (!u) return json({ error: "No autenticado" }, 401);
        return json({ user: u });
      }

      if (url.pathname === "/api/password" && req.method === "POST") {
        const u = await requireUser(req, env);
        const { password } = await req.json();
        if (!password || String(password).length < 8) return json({ error: "Contraseña demasiado corta." }, 400);
        const hash = await hashPassword(password);
        await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(hash, u.id).run();
        return json({ ok: true });
      }

      if (url.pathname === "/api/messages" && req.method === "GET") {
        const u = await requireUser(req, env);
        const q = url.searchParams.get("q") || "";
        const f = url.searchParams.get("folder") || "inbox";
        let sql =
          "SELECT id,folder,sender,recipients,cc,bcc,subject,body,is_read,is_starred,is_deleted,in_reply_to,created_at FROM messages WHERE owner_id=?";
        const args = [u.id];
        if (f === "starred") sql += " AND is_starred=1 AND is_deleted=0";
        else if (f === "trash") sql += " AND is_deleted=1";
        else {
          sql += " AND is_deleted=0 AND folder=?";
          args.push(f);
        }
        if (q) {
          sql += " AND (subject LIKE ? OR body LIKE ? OR sender LIKE ? OR recipients LIKE ?)";
          const like = "%" + q + "%";
          args.push(like, like, like, like);
        }
        sql += " ORDER BY created_at DESC LIMIT 200";
        const { results } = await env.DB.prepare(sql).bind(...args).all();
        return json({ messages: results || [], counts: await countsFor(env, u.id) });
      }

      const msgMatch = url.pathname.match(/^\/api\/messages\/([0-9a-f-]+)$/i);
      if (msgMatch && req.method === "GET") {
        const u = await requireUser(req, env);
        const row = await env.DB.prepare("SELECT * FROM messages WHERE id=? AND owner_id=?").bind(msgMatch[1], u.id).first();
        if (!row) return json({ error: "Mensaje no encontrado." }, 404);
        return json({ message: row });
      }

      if (msgMatch && req.method === "PATCH") {
        const u = await requireUser(req, env);
        const body = await req.json();
        const allowed = {
          is_read: "is_read",
          is_starred: "is_starred",
          is_deleted: "is_deleted",
          folder: "folder"
        };
        const sets = [];
        const args = [];
        for (const [k, col] of Object.entries(allowed)) {
          if (body[k] !== undefined) {
            sets.push(`${col}=?`);
            args.push(body[k]);
          }
        }
        if (!sets.length) return json({ error: "Nada que actualizar." }, 400);
        args.push(msgMatch[1], u.id);
        await env.DB.prepare(`UPDATE messages SET ${sets.join(",")} WHERE id=? AND owner_id=?`).bind(...args).run();
        return json({ ok: true });
      }

      if (msgMatch && req.method === "DELETE") {
        const u = await requireUser(req, env);
        await env.DB.prepare("DELETE FROM messages WHERE id=? AND owner_id=?").bind(msgMatch[1], u.id).run();
        return json({ ok: true });
      }

      if (url.pathname === "/api/contacts" && req.method === "GET") {
        const u = await requireUser(req, env);
        const { results } = await env.DB.prepare(
          "SELECT email,name,last_used FROM contacts WHERE owner_id=? ORDER BY last_used DESC LIMIT 50"
        )
          .bind(u.id)
          .all();
        return json({ contacts: results || [] });
      }

      if (url.pathname === "/api/send" && req.method === "POST") {
        const u = await requireUser(req, env);
        await rateLimit(env, "send:" + u.id, 30, 10 * 60 * 1000);
        const { to, cc, bcc, subject, body, draft, in_reply_to } = await req.json();
        const toList = emailsOf(to);
        const ccList = emailsOf(cc);
        const bccList = emailsOf(bcc);
        if (!draft && !toList.length) return json({ error: "Indica al menos un destinatario válido." }, 400);
        if (!draft && !String(body || "").trim() && !String(subject || "").trim()) {
          return json({ error: "El mensaje está vacío." }, 400);
        }
        const id = uuid();
        const folder = draft ? "drafts" : "sent";
        await env.DB.prepare(
          "INSERT INTO messages(id,owner_id,folder,sender,recipients,cc,bcc,subject,body,is_read,in_reply_to) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
        )
          .bind(
            id,
            u.id,
            folder,
            u.email,
            toList.join(", "),
            ccList.join(", "),
            bccList.join(", "),
            subject || "",
            body || "",
            1,
            in_reply_to || null
          )
          .run();

        if (draft) return json({ ok: true, draft: true, id });

        await rememberContacts(env, u.id, [...toList, ...ccList].join(","));
        const delivered = await deliverLocal(env, {
          from: u.email,
          toList,
          ccList,
          subject: subject || "",
          body: body || "",
          inReplyTo: in_reply_to
        });
        const external = [...toList, ...ccList, ...bccList].filter((addr) => !delivered.includes(addr));
        let sent = delivered.length > 0 && external.length === 0;
        if (external.length) {
          const out = await sendExternal(env, {
            from: u.email,
            toList: external,
            ccList,
            subject: subject || "",
            body: body || ""
          });
          sent = out.sent;
        }
        return json({
          ok: true,
          sent,
          delivered_local: delivered,
          queued_external: external,
          id
        });
      }

      return json({ error: "Ruta no encontrada" }, 404);
    } catch (e) {
      const msg = e.message || "Error interno";
      const status = /sesión|autenticado/i.test(msg) ? 401 : /Demasiados/.test(msg) ? 429 : 500;
      return json({ error: msg }, status);
    }
  },

  async email(message, env) {
    if (!env.DB) return;
    const to = String(message.to || "").toLowerCase();
    const user = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(to).first();
    if (!user) return;
    const subject = message.headers?.get("subject") || "(sin asunto)";
    const from = message.from || "desconocido";
    let body = "";
    try {
      const raw = await new Response(message.raw).text();
      body = raw.slice(0, 50000);
    } catch {
      body = "Mensaje recibido. No se pudo leer el contenido MIME completo.";
    }
    await env.DB.prepare(
      "INSERT INTO messages(id,owner_id,folder,sender,recipients,subject,body,message_id) VALUES(?,?,?,?,?,?,?,?)"
    )
      .bind(uuid(), user.id, "inbox", from, to, subject, body, message.headers?.get("message-id") || null)
      .run();
  }
};
