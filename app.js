// ============ Konfiguration ============

// Termingo-Links & Telefon je Standort
const BOOK_LINKS = {
  ostermiething: "https://meintermin.termingo.de/preisliste/326",
  mattighofen:  "https://meintermin.termingo.de/preisliste/335",
};
const PHONE = {
  ostermiething: "+436609797072",
  mattighofen:   "+436766627776",
};

// Standort & Leistung erkennen (einfache RegEx – jederzeit erweiterbar)
const LOCATION_REGEX = /(ostermiething|mattighofen)/i;
// Präzise Erkennung von Dienstleistungen — nur ganze Wörter
const SERVICE_KEYWORDS = [
  "haarschnitt", "schnitt", "kurzhaarschnitt", "ponyschnitt",
  "waschen", "föhnen", "styling",
  "farbe", "tönung", "balayage", "strähnen", "oberkopf", "highlights", "dauerwelle",

  "pflege", "intensivpflege", "haarkur",

  "gesichtsbehandlung", "kosmetik", "microneedling", "peeling", "aquapeel",
  "tiefenreinigung", "aknebehandlung",

  "permanent make up", "permanent makeup", "microblading",
  "augenbrauen", "lippen", "eyeliner", "wimpernkranz",

  "braut", "brautstyling", "probe", "hochstecken",

  "herren", "bart", "maschinenschnitt"
];

// Funktion prüft, ob mindestens 1 echtes Keyword vorkommt
function hasService(text) {
  return SERVICE_KEYWORDS.some(word =>
    text.split(/\W+/).includes(word.replace(/\s+/g, "").toLowerCase())
  );
}


// Beginn-Nachricht
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

// ============ Verlauf speichern (30 Min Auto-Reset) ============
const STORE_KEY = "seya_history_v2";
const MAX_AGE_MIN = 30;

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
  } catch {
    return null;
  }
}
function saveHistory(messages) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ ts: Date.now(), messages }));
  } catch {}
}
function resetHistory() { sessionStorage.removeItem(STORE_KEY); }

// ============ UI / Chat ============

let chatEl, formEl, inputEl, sendBtn;
let history = loadHistory() || [];

function ensureGreeting() {
  if (!history.some(m => m?.role === "assistant")) {
    history.push({ role: "assistant", content: initialGreeting });
  }
}
ensureGreeting();

function mdStrong(s){ return String(s||"").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>"); }

// Standort/Leistung aus Gespräch ableiten
function deriveBookingState(messages) {
  const text = (messages||[]).map(m=>m?.content||"").join("\n").toLowerCase();
  let location = null;
  const loc = text.match(LOCATION_REGEX);
  if (loc) {
    const found = loc[1].toLowerCase();
    location = found.includes("oster") ? "ostermiething" : "mattighofen";
  }
  const hasServiceSelected = hasService(text);
return { location, hasService: hasServiceSelected };

}

function render() {
  chatEl.innerHTML = "";
  for (const m of history) {
    const row = document.createElement("div");
    row.className = `msg ${m.role === "user" ? "user" : "bot"}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = mdStrong(m.content);
    row.appendChild(bubble);
    chatEl.appendChild(row);
  }

  // CTA – nur wenn Standort & Leistung vorhanden
  const state = deriveBookingState(history);
const old = document.getElementById("seya-cta");
if (old) old.remove();

if (state.location && state.hasService) {
  const cta = document.createElement("div");
  cta.id = "seya-cta";
  cta.className = "cta-bar";
  cta.innerHTML = `
    <div class="cta-hint">
      Super! Bitte auf „Termin online buchen“ tippen – ich leite dich direkt zur Buchungsseite weiter.
    </div>
    <div class="cta-actions">
      <a class="cta-btn primary" href="${BOOK_LINKS[state.location]}" target="_blank">
        Termin online buchen
      </a>
      <a class="cta-btn" href="tel:${PHONE[state.location]}">Telefonisch buchen</a>
    </div>
  `;
  chatEl.appendChild(cta);
}


  chatEl.scrollTop = chatEl.scrollHeight;
}

function push(role, content) {
  history.push({ role, content });
  saveHistory(history);
  render();
}

let typingEl=null;
function showTyping() {
  typingEl = document.createElement("div");
  typingEl.className = "msg bot";
  typingEl.innerHTML = `
    <div class="bubble">
      <div class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
    </div>`;
  chatEl.appendChild(typingEl);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  if (typingEl) {
    typingEl.remove();
    typingEl=null;
  }
}

// ============ API Call ============
async function talkToSEYA(text) {
  push("user", text);
  inputEl.value = "";
  inputEl.focus();
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/api/chat",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await res.json();
    hideTyping();

    if (!res.ok) {
      push("assistant", `Fehler: ${data?.error || res.statusText}`);
    } else {
      push("assistant", data.reply || "Entschuldige, ich habe gerade keine Antwort erhalten.");
    }
  } catch (err) {
    hideTyping();
    push("assistant", "Fehler: " + (err?.message || String(err)));
  } finally {
    sendBtn.disabled = false;
  }
}

// ============ Init ============
window.addEventListener("DOMContentLoaded", () => {
  chatEl = document.getElementById("chat");
  formEl = document.getElementById("chat-form");
  inputEl = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");

  // Reset-Button
  document.getElementById("reset-btn").addEventListener("click", () => {
    resetHistory();
    history = [];
    ensureGreeting();
    saveHistory(history);
    render();
    inputEl.focus();
  });

  render();

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    talkToSEYA(text);
  });
});



