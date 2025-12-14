/* === SEYA – Webchat ===================================================== */

const BOOK_LINKS = {
  ostermiething: "https://meintermin.termingo.de/preisliste/326",
  mattighofen: "https://meintermin.termingo.de/preisliste/335",
};
const PHONE = {
  ostermiething: "+436609797072",
  mattighofen: "+436766627776",
};

/* --------- Storage mit Auto-Expire (30 min) ---------- */
const STORE_KEY = "seya_history_v3";
const MAX_AGE_MIN = 30;

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.messages)) return null;
    if (Date.now() - obj.ts > MAX_AGE_MIN * 60 * 1000) {
      sessionStorage.removeItem(STORE_KEY);
      return null;
    }
    return obj.messages;
  } catch {
    return null;
  }
}
function saveHistory(messages) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ ts: Date.now(), messages }));
  } catch {}
}
function resetHistory() {
  sessionStorage.removeItem(STORE_KEY);
}

/* ----------------- Initial Greeting ------------------ */
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. " +
  "In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

let history = loadHistory() || [{ role: "assistant", content: initialGreeting }];

/* ----------------- DOM Refs ------------------ */
let chatEl, formEl, inputEl, sendBtn, resetBtn;

/* ----------------- Rendering ------------------ */
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function render() {
  if (!chatEl) return;
  chatEl.innerHTML = "";
  for (const m of history) {
    const row = el("div", `msg ${m.role === "user" ? "user" : "bot"}`);
    if (m.role !== "user") row.appendChild(el("div", "icon", "💬"));
    const bubble = el(
      "div",
      "bubble",
      String(m.content || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    );
    row.appendChild(bubble);
    chatEl.appendChild(row);
  }
  showCTAIfReady(); // CTA abhängig von Zustand
  chatEl.scrollTop = chatEl.scrollHeight;
}

function showTyping() {
  const row = el("div", "msg bot");
  row.id = "typing";
  row.appendChild(el("div", "icon", "💬"));
  const b = el("div", "bubble");
  const dots = el("div", "typing");
  dots.appendChild(el("div", "dot"));
  dots.appendChild(el("div", "dot"));
  dots.appendChild(el("div", "dot"));
  b.appendChild(dots);
  row.appendChild(b);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

/* ----------- Standort + Service Erkennung ----------- */

// Sehr präzise Erkennung (ganze Wörter)
const SERVICE_KEYWORDS = [
  // Haare
  "haarschnitt","schnitt","kurzhaarschnitt","ponyschnitt","waschen","föhnen","styling",
  "farbe","tönung","balayage","strähnen","oberkopf","highlights","dauerwelle",
  "pflege","intensivpflege","haarkur",
  // Kosmetik
  "gesichtsbehandlung","kosmetik","microneedling","peeling","aquapeel","tiefenreinigung","aknebehandlung",
  // PMU
  "permanent make up","permanent makeup","microblading","augenbrauen","lippen","eyeliner","wimpernkranz",
  // Braut
  "braut","brautstyling","probe","hochstecken",
  // Herren
  "herren","bart","maschinenschnitt"
];

// Enthält Text eines Nutzers mindestens ein echtes Keyword?
function hasServiceKeyword(text) {
  const flat = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const tokens = flat.split(" ");
  // Spezialfälle mit Leerzeichen
  if (flat.includes("permanent make up") || flat.includes("permanent makeup")) return true;

  return SERVICE_KEYWORDS.some(word => {
    if (word.includes(" ")) return flat.includes(word); // Multiword
    return tokens.includes(word);
  });
}

function deriveBookingState(historyArr) {
  const allUserText = historyArr
    .filter(m => m.role === "user")
    .map(m => String(m.content || "").toLowerCase())
    .join(" . ");

  let location = null;
  if (/\bostermiething\b/i.test(allUserText)) location = "ostermiething";
  if (/\bmattighofen\b/i.test(allUserText)) location = "mattighofen";

  // Dienstleistung aus dem letzten User-Statement bevorzugen
  const lastUser = [...historyArr].reverse().find(m => m.role === "user");
  const hasService =
    lastUser ? hasServiceKeyword(String(lastUser.content || "")) : false;

  return { location, hasService };
}

/* ---------------- CTA nur wenn ready ----------------- */
function showCTAIfReady() {
  const state = deriveBookingState(history);
  const prev = document.getElementById("seya-cta");
  if (prev) prev.remove();

  if (state.location && state.hasService) {
    const bar = el("div", "cta-bar");
    bar.id = "seya-cta";
    const hint = el(
      "div",
      "cta-hint",
      "Super! Bitte auf „Termin online buchen“ tippen – ich leite dich direkt zur Buchungsseite weiter."
    );
    const actions = el("div", "cta-actions");
    const a1 = el("a", "cta-btn primary", "Termin online buchen");
    a1.href = BOOK_LINKS[state.location];
    a1.target = "_blank";
    const a2 = el("a", "cta-btn", "Telefonisch buchen");
    a2.href = "tel:" + PHONE[state.location];

    actions.appendChild(a1);
    actions.appendChild(a2);
    bar.appendChild(hint);
    bar.appendChild(actions);
    chatEl.appendChild(bar);
  }
}

/* ---------------- Senden & API Call ----------------- */
async function askSeya(text) {
  history.push({ role: "user", content: text });
  saveHistory(history);
  render();
  inputEl.value = "";
  sendBtn.disabled = true;

  showTyping();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    hideTyping();

    if (data?.reply) {
      history.push({ role: "assistant", content: data.reply });
    } else {
      history.push({ role: "assistant", content: "Entschuldige, ich habe gerade keine Antwort erhalten." });
    }
  } catch (err) {
    hideTyping();
    history.push({ role: "assistant", content: "Fehler: " + (err?.message || String(err)) });
  }
  saveHistory(history);
  sendBtn.disabled = false;
  render();
}

/* ---------------- Boot ----------------- */
window.addEventListener("DOMContentLoaded", () => {
  chatEl = document.getElementById("chat");
  formEl = document.getElementById("chat-form");
  inputEl = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");
  resetBtn = document.getElementById("reset-btn");

  render();

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    askSeya(text);
  });

  resetBtn.addEventListener("click", () => {
    resetHistory();
    history = [{ role: "assistant", content: initialGreeting }];
    saveHistory(history);
    render();
    inputEl.focus();
  });
});




