// === SEYA Webchat – stabile Komplettversion ===

// ---------- Storage mit Auto-Expire ----------
const STORE_KEY = "seya_history_v2";
const MAX_AGE_MIN = 30; // nach 30 Minuten Inaktivität neu starten

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    // älter als MAX_AGE_MIN? -> neu starten
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

// ---------- Render ----------
function render() {
  if (!chatEl) return;
  chatEl.innerHTML = "";

  for (const m of history) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${m.role === "user" ? "user" : "bot"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";

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

// ---------- Helper ----------
function pushAndRender(msg) {
  history.push(msg);
  saveHistory(history);
  render();
}

// ---------- Senden / API-Aufruf ----------
async function talkToSEYA(text) {
  // eigene Nachricht
  pushAndRender({ role: "user", content: text });

  // Typing-Indicator einfügen
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

    // Typing-Indicator durch echte Antwort ersetzen
    history[typingIndex] = {
      role: "assistant",
      content: data?.reply || "Entschuldige, ich konnte gerade nichts empfangen."
    };
    saveHistory(history);
    render();
  } catch (e) {
    history[typingIndex] = {
      role: "assistant",
      content: "Fehler: " + (e?.message || String(e))
    };
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

// Optional: Reset-Funktion (z. B. an einen Button hängen)
// document.getElementById("reset")?.addEventListener("click", () => {
//   resetHistory();
//   history = [{ role: "assistant", content: initialGreeting }];
//   saveHistory(history);
//   render();
// });

