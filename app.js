/* ===========================
   SEYA – Masterclass KI Chat
   =========================== */

const BOOK_LINKS = {
  ostermiething: "https://meintermin.termingo.de/preisliste/326",
  mattighofen: "https://meintermin.termingo.de/preisliste/335",
};
const PHONE = {
  ostermiething: "+436609797072",
  mattighofen: "+436766627776",
};

/* --- Session Storage mit 30-Minuten Timeout --- */
const STORE_KEY = "seya_history_v4";
const MAX_AGE_MIN = 30;

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.messages) return null;
    if (Date.now() - obj.ts > MAX_AGE_MIN * 60000) {
      sessionStorage.removeItem(STORE_KEY);
      return null;
    }
    return obj.messages;
  } catch { return null; }
}

function saveHistory(messages) {
  sessionStorage.setItem(STORE_KEY, JSON.stringify({ ts: Date.now(), messages }));
}

function resetHistory() {
  sessionStorage.removeItem(STORE_KEY);
}

/* --- Begrüßung --- */
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

let history = loadHistory() || [
  { role: "assistant", content: initialGreeting }
];

/* --- DOM --- */
let chatEl, formEl, inputEl, sendBtn, resetBtn;

/* ===========================
   Chat Rendering
   =========================== */
function createEl(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function render() {
  chatEl.innerHTML = "";
  history.forEach(m => {
    const row = createEl("div", `msg ${m.role === "user" ? "user" : "bot"}`);
    if (m.role !== "user") row.appendChild(createEl("div", "icon", "💬"));
    const bubble = createEl(
      "div",
      "bubble",
      m.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    );
    row.appendChild(bubble);
    chatEl.appendChild(row);
  });

  showCTA();  
  chatEl.scrollTop = chatEl.scrollHeight;
}

/* --- Typing Indicator --- */
function showTyping() {
  const row = createEl("div", "msg bot");
  row.id = "typing";
  row.appendChild(createEl("div", "icon", "💬"));

  const b = createEl("div", "bubble");
  const dots = createEl("div", "typing");
  dots.appendChild(createEl("div","dot"));
  dots.appendChild(createEl("div","dot"));
  dots.appendChild(createEl("div","dot"));

  b.appendChild(dots);
  row.appendChild(b);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

/* ===========================
   Dienstleistung & Standort
   =========================== */
function norm(s){
  return String(s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

const SERVICE_KEYWORDS = [
  "haarschnitt","schnitt","kurzhaarschnitt","ponyschnitt",
  "waschen","foehnen","styling",
  "farbe","toenung","ansatz","balayage","ombre","straehnen","highlights","dauerwelle",
  "pflege","intensivpflege","kur","haarkur","maske",
  "gesichtsbehandlung","kosmetik","microneedling","peeling","aquapeel",
  "tiefenreinigung","aknebehandlung","express",
  "permanent make up","microblading","augenbrauen","lippen","eyeliner","wimpernkranz",
  "braut","brautstyling","brautfrisur","probe","hochstecken",
  "herren","bart","maschinenschnitt"
];

function hasServiceKeyword(text){
  const flat = norm(text);
  const tokens = new Set(flat.split(" "));

  if (flat.includes("permanent make up")) return true;

  return SERVICE_KEYWORDS.some(w=>{
    const n = norm(w);
    if (n.includes(" ")) return flat.includes(n);
    return tokens.has(n);
  });
}

function deriveBookingState(historyArr){
  const userTexts = historyArr.filter(m=>m.role==="user")
    .map(m=>m.content.toLowerCase())
    .join(" . ");

  let location = null;
  if (/\bostermiething\b/.test(userTexts)) location = "ostermiething";
  if (/\bmattighofen\b/.test(userTexts))  location = "mattighofen";

  const lastUser = [...historyArr].reverse().find(m=>m.role==="user");
  const hasService = lastUser ? hasServiceKeyword(lastUser.content) : false;

  return { location, hasService };
}

/* ===========================
   CTA Bar
   =========================== */
function showCTA(){
  const state = deriveBookingState(history);

  const old = document.getElementById("seya-cta");
  if (old) old.remove();

  if (state.location && state.hasService){
    const bar = createEl("div","cta-bar");
    bar.id = "seya-cta";

    const hint = createEl("div","cta-hint",
      "Perfekt! Bitte auf „Termin online buchen“ tippen – ich leite dich weiter."
    );

    const acts = createEl("div","cta-actions");
    const a1 = createEl("a","cta-btn primary","Termin online buchen");
    a1.href = BOOK_LINKS[state.location];
    a1.target="_blank";

    const a2 = createEl("a","cta-btn","Telefonisch buchen");
    a2.href = "tel:"+PHONE[state.location];

    acts.appendChild(a1);
    acts.appendChild(a2);

    bar.appendChild(hint);
    bar.appendChild(acts);
    chatEl.appendChild(bar);
  }
}

/* ===========================
   Senden
   =========================== */
async function askSEYA(text){
  history.push({ role:"user", content:text });
  saveHistory(history);
  render();

  inputEl.value="";
  sendBtn.disabled=true;
  showTyping();

  try{
    const response = await fetch("/api/chat",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ messages: history })
    });
    const data = await response.json();
    hideTyping();

    if (data.reply){
      history.push({ role:"assistant", content:data.reply });
    } else {
      history.push({ role:"assistant", content:"Ich habe gerade keine Antwort bekommen." });
    }
  } catch(err){
    hideTyping();
    history.push({ role:"assistant", content:"Fehler: "+err.message });
  }

  saveHistory(history);
  sendBtn.disabled=false;
  render();
}

/* ===========================
   Start
   =========================== */
window.addEventListener("DOMContentLoaded",()=>{
  chatEl = document.getElementById("chat");
  formEl = document.getElementById("chat-form");
  inputEl = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");
  resetBtn = document.getElementById("reset-btn");

  render();

  formEl.addEventListener("submit",e=>{
    e.preventDefault();
    const text = inputEl.value.trim();
    if (text) askSEYA(text);
  });

  resetBtn.addEventListener("click",()=>{
    resetHistory();
    history = [{ role:"assistant", content:initialGreeting }];
    saveHistory(history);
    render();
  });
});





