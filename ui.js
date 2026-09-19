export const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#050817">
<title>CorreoNova</title>
<style>
:root{
  --bg:#050817;--bg2:#07101f;--panel:#0a1428;--panel2:#10192f;--line:#1d3d67;
  --text:#eef4ff;--muted:#8f9bb3;--accent:#1887ff;--accent2:#5945ff;--ok:#3ee0b0;
  --danger:#ff5d7a;--unread:#54d6ff;--hover:#12243f;
}
body.light{
  --bg:#eef3fb;--bg2:#e4ecf8;--panel:#ffffff;--panel2:#f4f7fd;--line:#c9d6ea;
  --text:#10203a;--muted:#5b6b86;--hover:#e8f0fb;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
button,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
.app{display:grid;grid-template-rows:64px 1fr;height:100%}
.top{display:flex;align-items:center;gap:16px;padding:0 18px;border-bottom:1px solid var(--line);background:rgba(8,16,36,.85);backdrop-filter:blur(12px)}
body.light .top{background:rgba(255,255,255,.9)}
.brand{font-size:22px;font-weight:800;letter-spacing:-.6px;white-space:nowrap}
.brand b{color:#54d6ff}
.search{flex:1;display:flex}
.search input{width:100%;max-width:560px;margin:0 auto;border:1px solid var(--line);background:var(--panel2);border-radius:999px;padding:10px 16px;outline:none}
.top-actions{display:flex;gap:8px;align-items:center}
.btn{border:1px solid var(--line);background:var(--panel2);border-radius:12px;padding:8px 12px}
.btn.primary{background:linear-gradient(100deg,var(--accent),var(--accent2));border:0;font-weight:700;color:#fff}
.btn.danger{border-color:#6a2434;color:var(--danger)}
.shell{display:grid;grid-template-columns:240px minmax(280px,420px) 1fr;min-height:0}
.side,.list,.read{min-height:0;overflow:auto}
.side{border-right:1px solid var(--line);padding:16px 12px;background:var(--bg2)}
.compose{width:100%;border:0;border-radius:14px;padding:12px;font-weight:800;color:#fff;background:linear-gradient(100deg,#147fff,#5a3ff2);margin-bottom:14px}
.nav{display:grid;gap:4px}
.nav button{text-align:left;border:0;background:transparent;border-radius:12px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;color:var(--text)}
.nav button.active,.nav button:hover{background:var(--hover)}
.count{min-width:22px;text-align:center;font-size:12px;color:var(--unread)}
.account{margin-top:18px;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}
.account small{color:var(--muted)}
.list{border-right:1px solid var(--line);background:var(--panel)}
.list-head{position:sticky;top:0;background:var(--panel);padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
.msg{width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;padding:12px 14px}
.msg:hover,.msg.active{background:var(--hover)}
.msg.unread strong{color:var(--unread)}
.msg .meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:12px}
.msg p{margin:6px 0 0;color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.empty,.gate{padding:40px 20px;text-align:center;color:var(--muted)}
.read{padding:22px 26px;background:radial-gradient(circle at 100% 0%,rgba(24,135,255,.12),transparent 40%),var(--bg)}
.read h2{margin:8px 0 4px;font-size:26px}
.read .who{color:var(--muted);margin-bottom:16px}
.body{white-space:pre-wrap;line-height:1.55;border-top:1px solid var(--line);padding-top:16px}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:16px;z-index:20}
.modal.open{display:flex}
.card{width:min(680px,100%);background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:20px}
.card h2{margin:0 0 8px}
.card label{display:block;margin:12px 0 6px;color:var(--muted);font-size:13px}
.field{width:100%;border:1px solid var(--line);background:var(--panel2);border-radius:12px;padding:11px 12px;outline:none}
textarea.field{min-height:180px;resize:vertical}
.row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.status{min-height:20px;margin-top:8px;color:var(--ok);font-size:13px}
.status.err{color:var(--danger)}
.hidden{display:none}
@media(max-width:980px){
  .shell{grid-template-columns:1fr}
  .side,.list{display:none}
  .side.show,.list.show{display:block}
  .read{min-height:60vh}
}
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="brand">Correo<b>Nova</b></div>
    <div class="search"><input id="q" placeholder="Buscar correo, asunto o persona"></div>
    <div class="top-actions">
      <button class="btn" id="themeBtn" title="Tema">◐</button>
      <button class="btn" id="mobileFolders">Carpetas</button>
      <button class="btn" id="accountBtn">Cuenta</button>
    </div>
  </header>
  <div class="shell">
    <aside class="side show" id="side">
      <button class="compose" id="newBtn">＋ Redactar</button>
      <nav class="nav" id="nav"></nav>
      <div class="account">
        <strong id="whoName">Invitado</strong><br>
        <small id="whoMail">Inicia sesión para enviar y recibir</small>
      </div>
    </aside>
    <section class="list show" id="listPane">
      <div class="list-head"><strong id="folderTitle">Entrada</strong><button class="btn" id="refreshBtn">Actualizar</button></div>
      <div id="list"></div>
    </section>
    <section class="read" id="read">
      <div class="gate" id="welcome">
        <h2>Centro de comunicaciones</h2>
        <p>Crea una cuenta, envía mensajes a otros usuarios de CorreoNova y recibe correo externo si configuras Cloudflare Email Routing.</p>
      </div>
    </section>
  </div>
</div>

<div class="modal" id="authModal">
  <div class="card">
    <h2>Tu cuenta</h2>
    <div id="loggedOut">
      <label>Nombre</label><input class="field" id="displayName" placeholder="Nombre visible">
      <label>Correo</label><input class="field" id="email" type="email" placeholder="tu@dominio.com">
      <label>Contraseña (mín. 8)</label><input class="field" id="password" type="password">
      <div class="row">
        <button class="btn" id="closeAuth">Cerrar</button>
        <button class="btn" id="registerBtn">Crear cuenta</button>
        <button class="btn primary" id="loginBtn">Entrar</button>
      </div>
    </div>
    <div id="loggedIn" class="hidden">
      <p id="sessionInfo"></p>
      <label>Nueva contraseña</label><input class="field" id="newPass" type="password" placeholder="Opcional">
      <div class="row">
        <button class="btn" id="savePass">Guardar</button>
        <button class="btn danger" id="logoutBtn">Cerrar sesión</button>
        <button class="btn" id="closeAuth2">Cerrar</button>
      </div>
    </div>
    <div class="status" id="authStatus"></div>
  </div>
</div>

<div class="modal" id="composeModal">
  <div class="card">
    <h2 id="composeTitle">Nuevo mensaje</h2>
    <label>Para</label><input class="field" id="to" placeholder="uno@correo.com, dos@correo.com">
    <label>CC</label><input class="field" id="cc" placeholder="opcional">
    <label>Asunto</label><input class="field" id="subject">
    <label>Mensaje</label><textarea class="field" id="body"></textarea>
    <div class="row">
      <button class="btn" id="draftBtn">Guardar borrador</button>
      <button class="btn" id="closeCompose">Cancelar</button>
      <button class="btn primary" id="sendBtn">Enviar</button>
    </div>
    <div class="status" id="sendStatus"></div>
  </div>
</div>

<script>
const FOLDERS = [
  ["inbox","📥 Entrada"],
  ["starred","⭐ Importantes"],
  ["sent","📤 Enviados"],
  ["drafts","📝 Borradores"],
  ["archive","📦 Archivo"],
  ["trash","🗑️ Papelera"]
];
let folder="inbox", user=null, messages=[], selected=null, replyMeta=null;
const $=id=>document.getElementById(id);
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]))}
async function api(path, opts={}){
  const r=await fetch(path,{credentials:"include",...opts});
  const text=await r.text();
  let data={}; try{data=JSON.parse(text)}catch{data={error:text||"Respuesta inválida"}}
  if(!r.ok) throw new Error(data.error||"Error");
  return data;
}
function setStatus(id,msg,err=false){const n=$(id);n.textContent=msg;n.className="status"+(err?" err":"");}
function openModal(id){$(id).classList.add("open")}
function closeModal(id){$(id).classList.remove("open")}
function renderNav(counts={}){
  $("nav").innerHTML=FOLDERS.map(([id,label])=>{
    const c=counts[id]||0;
    return \`<button data-folder="\${id}" class="\${folder===id?"active":""}">\${label} <span class="count">\${c||""}</span></button>\`;
  }).join("");
  $("nav").onclick=e=>{
    const b=e.target.closest("button"); if(!b)return;
    folder=b.dataset.folder; selected=null; loadMessages();
  };
}
function preview(m){
  return \`<button class="msg \${m.is_read?"":"unread"} \${selected===m.id?"active":""}" data-id="\${m.id}">
    <div class="meta"><span>\${esc(m.sender)}</span><span>\${esc((m.created_at||"").replace("T"," ").slice(0,16))}</span></div>
    <strong>\${m.is_starred?"★ ":""}\${esc(m.subject||"(sin asunto)")}</strong>
    <p>\${esc(m.body)}</p>
  </button>\`;
}
function renderList(){
  $("folderTitle").textContent=(FOLDERS.find(f=>f[0]===folder)||[,"Carpeta"])[1];
  if(!messages.length){$("list").innerHTML="<div class='empty'>No hay mensajes.</div>";return}
  $("list").innerHTML=messages.map(preview).join("");
  $("list").onclick=e=>{
    const b=e.target.closest(".msg"); if(!b)return;
    selected=b.dataset.id; renderList(); renderRead(messages.find(x=>x.id===selected));
    if(user) api("/api/messages/"+selected,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({is_read:1})}).catch(()=>{});
  };
}
function renderRead(m){
  if(!m){$("read").innerHTML="<div class='empty'>Selecciona un mensaje.</div>";return}
  $("read").innerHTML=\`
    <div class="meta">\${esc(m.created_at||"")}</div>
    <h2>\${esc(m.subject||"(sin asunto)")}</h2>
    <div class="who">De: \${esc(m.sender)}<br>Para: \${esc(m.recipients)}\${m.cc?"<br>CC: "+esc(m.cc):""}</div>
    <div class="actions">
      <button class="btn" data-act="reply">Responder</button>
      <button class="btn" data-act="forward">Reenviar</button>
      <button class="btn" data-act="star">\${m.is_starred?"Quitar estrella":"Destacar"}</button>
      <button class="btn" data-act="archive">Archivar</button>
      <button class="btn danger" data-act="trash">\${folder==="trash"?"Eliminar":"Papelera"}</button>
    </div>
    <div class="body">\${esc(m.body)}</div>\`;
  $("read").onclick=async e=>{
    const act=e.target.dataset.act; if(!act)return;
    if(act==="reply"){replyMeta={to:m.sender,subject:(m.subject||"").startsWith("Re:")?m.subject:"Re: "+(m.subject||""),body:"\\n\\n---\\n"+m.body,in_reply_to:m.id}; openCompose()}
    if(act==="forward"){replyMeta={to:"",subject:(m.subject||"").startsWith("Rv:")?m.subject:"Rv: "+(m.subject||""),body:"\\n\\n--- Mensaje reenviado ---\\nDe: "+m.sender+"\\n"+m.body}; openCompose()}
    if(act==="star"){await patch(m.id,{is_starred:m.is_starred?0:1}); loadMessages()}
    if(act==="archive"){await patch(m.id,{folder:"archive"}); loadMessages()}
    if(act==="trash"){
      if(folder==="trash") await api("/api/messages/"+m.id,{method:"DELETE"});
      else await patch(m.id,{is_deleted:1});
      selected=null; loadMessages();
    }
  };
}
async function patch(id,data){
  await api("/api/messages/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
}
async function loadMe(){
  try{
    const d=await api("/api/me"); user=d.user;
    $("whoName").textContent=user.display_name;
    $("whoMail").textContent=user.email;
    $("loggedOut").classList.add("hidden");
    $("loggedIn").classList.remove("hidden");
    $("sessionInfo").textContent=user.email;
  }catch{
    user=null;
    $("whoName").textContent="Invitado";
    $("whoMail").textContent="Inicia sesión para usar el correo";
    $("loggedOut").classList.remove("hidden");
    $("loggedIn").classList.add("hidden");
  }
}
async function loadMessages(){
  renderNav();
  if(!user){$("list").innerHTML="<div class='empty'>Inicia sesión para ver tu correo.</div>";return}
  try{
    const d=await api("/api/messages?folder="+encodeURIComponent(folder)+"&q="+encodeURIComponent($("q").value.trim()));
    messages=d.messages||[];
    renderNav(d.counts||{});
    renderList();
    if(selected){const m=messages.find(x=>x.id===selected); if(m) renderRead(m); else $("read").innerHTML="<div class='empty'>Selecciona un mensaje.</div>"}
  }catch(e){$("list").innerHTML="<div class='empty'>"+esc(e.message)+"</div>"}
}
function openCompose(){
  if(!user){openModal("authModal"); setStatus("authStatus","Primero crea o inicia sesión.",true); return}
  $("composeTitle").textContent=replyMeta?"Redactar":"Nuevo mensaje";
  $("to").value=replyMeta?.to||"";
  $("cc").value="";
  $("subject").value=replyMeta?.subject||"";
  $("body").value=replyMeta?.body||"";
  setStatus("sendStatus","");
  openModal("composeModal");
}
$("newBtn").onclick=()=>{replyMeta=null; openCompose()};
$("accountBtn").onclick=()=>openModal("authModal");
$("closeAuth").onclick=$("closeAuth2").onclick=()=>closeModal("authModal");
$("closeCompose").onclick=()=>closeModal("composeModal");
$("themeBtn").onclick=()=>document.body.classList.toggle("light");
$("refreshBtn").onclick=loadMessages;
$("q").oninput=()=>loadMessages();
$("mobileFolders").onclick=()=>{$("side").classList.toggle("show"); $("listPane").classList.toggle("show")};
$("registerBtn").onclick=async()=>{
  setStatus("authStatus","Creando cuenta...");
  try{
    const d=await api("/api/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value,display_name:$("displayName").value})});
    user=d.user; closeModal("authModal"); await loadMe(); await loadMessages();
  }catch(e){setStatus("authStatus",e.message,true)}
};
$("loginBtn").onclick=async()=>{
  setStatus("authStatus","Entrando...");
  try{
    const d=await api("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value})});
    user=d.user; closeModal("authModal"); await loadMe(); await loadMessages();
  }catch(e){setStatus("authStatus",e.message,true)}
};
$("logoutBtn").onclick=async()=>{await api("/api/logout",{method:"POST"}); user=null; messages=[]; selected=null; closeModal("authModal"); await loadMe(); $("list").innerHTML="<div class='empty'>Sesión cerrada.</div>"; $("read").innerHTML="<div class='gate'><h2>Sesión cerrada</h2></div>"};
$("savePass").onclick=async()=>{
  try{await api("/api/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:$("newPass").value})}); setStatus("authStatus","Contraseña actualizada.")}
  catch(e){setStatus("authStatus",e.message,true)}
};
async function sendOrDraft(draft){
  setStatus("sendStatus",draft?"Guardando...":"Enviando...");
  try{
    const payload={to:$("to").value,cc:$("cc").value,subject:$("subject").value,body:$("body").value,draft,in_reply_to:replyMeta?.in_reply_to||null};
    const d=await api("/api/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    setStatus("sendStatus", draft?"Borrador guardado." : (d.sent?"Enviado.":"Guardado en Enviados. Entrega externa pendiente de proveedor."));
    if(!draft){ $("to").value=$("cc").value=$("subject").value=$("body").value=""; setTimeout(()=>closeModal("composeModal"),700); }
    loadMessages();
  }catch(e){setStatus("sendStatus",e.message,true)}
}
$("sendBtn").onclick=()=>sendOrDraft(false);
$("draftBtn").onclick=()=>sendOrDraft(true);
renderNav();
loadMe().then(loadMessages);
</script>
</body>
</html>`;
