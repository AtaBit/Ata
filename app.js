// === SEYA Webchat – Komplettversion mit Termingo-Buttons ===

// ---- Termingo-Links (fertig eingetragen) ----
const TERMINGO = {
  ostermiething: "https://meintermin.termingo.de/preisliste/326",
  mattighofen:   "https://meintermin.termingo.de/preisliste/335"
};

// (Optional) Telefon-Buttons
const PHONE = {
  ostermiething: "+436609797072",
  mattighofen:   "+436766627776"
};

// Merkt den Standort, sobald genannt
let selectedLocation = null;

// ---------- Storage mit Auto-Expire (pro Tab) ----------
const STORE_KEY = "seya_history_v2";
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
  } catch {
    return null;
  }
}
function saveHistory(messages) {
  try {
    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify({ ts: Date.now(), messages })
    );
  } catch {}
}
function resetHistory() {
  sessionStorage.removeItem(STORE_KEY);
}

// ---------- Begrüßung ----------
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

// Verlauf laden oder mit Begrüßung starten
let history = loadHistory() || [
  { role: "assistant", content: initialGreeting }
];
saveHistory(history);

// ---------- DOM-Refs ----------
const chatEl  = document.getElementById("chat");
const formEl  = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

// ---------- Rendering ----------
function render() {
  if (!chatEl) return;
  chatEl.innerHTML = "";

  for (const m of history) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${m.role === "user" ? "user" : "bot"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    // Optional: eigenes Bild einbinden
    // if (m.role !== "user") { const img = document.createElement("img"); img.src="/seya.png"; img.alt="SEYA"; avatar.appendChild(img); }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = String(m.content || "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chatEl.appendChild(wrap);
  }

  chatEl.scrollTop = chatEl.scrollHeight;
}

// ---------- Helpers ----------
function pushAndRender(msg) {
  history.push(msg);
  saveHistory(history);
  render();
}

function showTyping() {
  const t = document.createElement("div");
  t.id = "typing";
  t.className = "typing";
  t.innerHTML = `SEYA schreibt <span></span><span></span><span></span>`;
  chatEl.appendChild(t);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping(){ document.getElementById("typing")?.remove(); }

// Standort aus User-Text erkennen
function detectLocationFromText(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("ostermiething")) return "ostermiething";
  if (t.includes("mattighofen"))   return "mattighofen";
  return null;
}

// Buchungs-Buttons einblenden
function appendBookingCTA(location) {
  const url = TERMINGO[location];
  if (!url) return;

  const wrap = document.createElement("div");
  wrap.className = "cta-wrap";

  const label = document.createElement("div");
  label.className = "cta-label";
  label.textContent = "Schnell buchen:";

  const btn = document.createElement("a");
  btn.className = "cta-btn";
  btn.href = url;
  btn.target = "_blank";
  btn.rel = "noopener";
  btn.textContent = "Termin online buchen";

  wrap.appendChild(label);
  wrap.appendChild(btn);

  const phone = PHONE[location];
  if (phone) {
    const tel = document.createElement("a");
    tel.className = "cta-btn outline";
    tel.href = `tel:${phone}`;
    tel.textContent = "Telefonisch buchen";
    wrap.appendChild(tel);
  }

  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ---------- Senden / API-Aufruf ----------
async function talkToSEYA(text) {
  // User-Nachricht anzeigen
  pushAndRender({ role: "user", content: text });

  // Standort mitschneiden, falls genannt
  const loc = detectLocationFromText(text);
  if (loc) selectedLocation = loc;

  // Typing-Indicator
  const typingIndex = history.length;
  pushAndRender({ role: "assistant", content: "Seya tippt …" });

  sendBtn.disabled = true;
  inputEl.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    const data = await res.json();
    const reply = data?.reply || "Entschuldige, ich konnte gerade nichts empfangen.";

    // Typing-Indicator durch echte Antwort ersetzen
    history[typingIndex] = { role: "assistant", content: reply };
    saveHistory(history);
    render();

    // Falls Standort noch nicht gesetzt, versuche ihn aus der Bot-Antwort zu lesen
    if (!selectedLocation) {
      const last = (history[history.length - 1]?.content || "").toLowerCase();
      if (last.includes("ostermiething")) selectedLocation = "ostermiething";
      if (last.includes("mattighofen"))   selectedLocation = "mattighofen";
    }

    // Buttons einblenden, wenn Standort klar ist
    if (selectedLocation) {
      appendBookingCTA(selectedLocation);
    }
  } catch (e) {
    history[typingIndex] = { role: "assistant", content: "Fehler: " + (e?.message || String(e)) };
    saveHistory(history);
    render();
  } finally {
    sendBtn.disabled = false;
  }
}

// ---------- Init ----------
render();

formEl?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  talkToSEYA(text);
});

// Optional: Reset-Button einhängen (falls vorhanden)
// document.getElementById("reset-chat")?.addEventListener("click", () => {
//   resetHistory();
//   history = [{ role: "assistant", content: initialGreeting }];
//   saveHistory(history);
//   render();
// });


