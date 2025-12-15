// ---------- Verlauf (mit Auto-Expire) ----------
const STORE_KEY   = "seya_history_v2";
const MAX_AGE_MIN = 30; // nach 30 Minuten Inaktivität neu starten

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > MAX_AGE_MIN * 60 * 1000) {
      sessionStorage.removeItem(STORE_KEY);
      return null;
    }
    return Array.isArray(obj.messages) ? obj.messages : null;
  } catch { return null; }
}
function saveHistory(messages){
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ ts: Date.now(), messages })); } catch {}
}
function resetHistory(){ sessionStorage.removeItem(STORE_KEY); }

// ---------- UI ----------
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. " +
  "In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

let history = loadHistory() ?? [];
if (!history.some(m => m.role === "assistant")) {
  history.push({ role: "assistant", content: initialGreeting });
  saveHistory(history);
}

let chatEl, formEl, inputEl, sendBtn, bookBtn, resetBtn;
let typing = false;

function el(tag, cls){ const n = document.createElement(tag); if(cls) n.className = cls; return n; }

function render(){
  chatEl.innerHTML = "";
  for(const m of history){
    const wrap = el("div", `msg ${m.role === "user" ? "user" : "bot"}`);
    const avatar = el("div", "avatar");
    avatar.textContent = m.role === "user" ? "👤" : "💬";
    const bubble = el("div", "bubble");
    bubble.innerHTML = String(m.content||"").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
    if(m.role !== "user") wrap.append(avatar);
    wrap.append(bubble);
    if(m.role === "user") wrap.append(avatar);
    chatEl.append(wrap);
  }
  if(typing){
    const t = el("div","msg bot");
    t.append(el("div","avatar")).textContent = "💬";
    const b = el("div","bubble");
    const twrap = el("div","typing");
    twrap.append(el("span","dot"), el("span","dot"), el("span","dot"));
    b.append(twrap); t.append(b); chatEl.append(t);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function callAPI(messages){
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ messages })
  });
  if(!res.ok){
    const data = await res.json().catch(()=> ({}));
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function send(text){
  const trimmed = text.trim();
  if(!trimmed) return;
  inputEl.value = ""; inputEl.focus();

  history.push({ role:"user", content: trimmed });
  saveHistory(history); typing = true; render();
  sendBtn.disabled = true;

  try{
    const { reply } = await callAPI(history);
    history.push({ role:"assistant", content: reply || "…" });
  }catch(err){
    history.push({ role:"assistant", content: "Fehler: " + err.message });
  }finally{
    typing = false; saveHistory(history); render(); sendBtn.disabled = false;
  }
}

function init(){
  chatEl   = document.getElementById("chat");
  formEl   = document.getElementById("chat-form");
  inputEl  = document.getElementById("chat-input");
  sendBtn  = document.getElementById("send-btn");
  bookBtn  = document.getElementById("book-btn");
  resetBtn = document.getElementById("reset-btn");

  render();

  formEl.addEventListener("submit", (e)=>{
    e.preventDefault(); send(inputEl.value);
  });

  bookBtn.addEventListener("click", ()=>{
    // Wenn du eine Buchungsplattform hast, hier verlinken:
    window.open("https://masterclass-hairbeauty.com/kontakt/", "_blank");
  });

  resetBtn.addEventListener("click", ()=>{
    resetHistory();
    history = [{ role:"assistant", content: initialGreeting }];
    saveHistory(history); render();
  });
}

document.addEventListener("DOMContentLoaded", init);
