// === SEYA Webchat – robuster Start mit Begrüßung ===
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

// Verlauf aus LocalStorage laden (optional)
function loadHistory() {
  try {
    const raw = localStorage.getItem("seya_history");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}
function saveHistory(h) {
  try { localStorage.setItem("seya_history", JSON.stringify(h)); } catch (_) {}
}

let history = loadHistory();

function ensureGreeting() {
  // Wenn noch keine Assistant-Nachricht existiert → Begrüßung einfügen
  if (!history.some(m => m?.role === "assistant")) {
    history.unshift({ role: "assistant", content: initialGreeting });
  }
}

let chatEl, formEl, inputEl, sendBtn;

function render() {
  if (!chatEl) return; // Sicherheitsnetz
  chatEl.innerHTML = "";
  for (const m of history) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${m.role === "user" ? "user" : "bot"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (m.role !== "user") {
      // Optionales Bild: auskommentieren, wenn du keins hast
      // const img = document.createElement("img");
      // img.src = "/seya.png";
      // img.alt = "SEYA";
      // avatar.appendChild(img);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = String(m.content || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chatEl.appendChild(wrap);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
  saveHistory(history);
}

// Warten bis DOM da ist → dann Elemente holen, Begrüßung setzen, rendern
document.addEventListener("DOMContentLoaded", () => {
  chatEl  = document.getElementById("chat");
  formEl  = document.getElementById("chat-form");
  inputEl = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");

  if (!chatEl || !formEl || !inputEl) {
    console.error("Chat-Elemente nicht gefunden. Prüfe IDs in index.html.");
    return;
  }

  ensureGreeting();
  render();
});



function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.id = "typing";
  typingDiv.className = "typing";
  typingDiv.innerHTML = `SEYA schreibt <span></span><span></span><span></span>`;
  chatEl.appendChild(typingDiv);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  document.getElementById("typing")?.remove();
}

async function talkToSEYA(text) {
  // 1) Eigene Nachricht sofort anzeigen
  history.push({ role: "user", content: text });
  render();

  // 2) UI sperren + Typing
  inputEl.value = "";
  sendBtn?.setAttribute("disabled", "true");
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    // 3) Fehler-Handling mit Klartext im Chat
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(errText || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const reply = data?.reply || data?.message;

    hideTyping();

    if (!reply) {
      history.push({ role: "assistant", content: "Ups, keine Antwort erhalten. Versuch es bitte nochmal." });
    } else {
      history.push({ role: "assistant", content: reply });
    }
  } catch (e) {
    console.error(e);
    hideTyping();
    history.push({ role: "assistant", content: `Fehler: ${String(e.message || e)}` });
  } finally {
    sendBtn?.removeAttribute("disabled");
    render();
  }
}

// Formular-Submit
formEl?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (inputEl?.value || "").trim();
  if (!text) return;
  talkToSEYA(text);
});

