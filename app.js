// === SEYA Webchat – stabile Komplettversion ===
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

function loadHistory() {
  try { const raw = localStorage.getItem("seya_history"); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveHistory(h) { try { localStorage.setItem("seya_history", JSON.stringify(h)); } catch {} }

let history = loadHistory();
function ensureGreeting() {
  if (!history.some(m => m?.role === "assistant")) {
    history.unshift({ role: "assistant", content: initialGreeting });
  }
}

let chatEl, formEl, inputEl, sendBtn;

function render() {
  if (!chatEl) return;
  chatEl.innerHTML = "";
  for (const m of history) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${m.role === "user" ? "user" : "bot"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    // Optional eigenes Bild:
    // if (m.role !== "user") { const img = document.createElement("img"); img.src="/seya.png"; avatar.appendChild(img); }

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

function showTyping() {
  const t = document.createElement("div");
  t.id = "typing";
  t.className = "typing";
  t.innerHTML = `SEYA schreibt <span></span><span></span><span></span>`;
  chatEl.appendChild(t);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping(){ document.getElementById("typing")?.remove(); }

async function talkToSEYA(text) {
  // Eigene Nachricht sofort zeigen
  history.push({ role: "user", content: text });
  render();

  inputEl.value = "";
  sendBtn?.setAttribute("disabled", "true");
  showTyping();

  try {
    // Debug-Log im Browser, falls nötig
    console.debug("[SEYA] POST /api/chat payload:", { messages: history });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    if (!res.ok) {
      const errText = await res.text().catch(()=> "");
      throw new Error(errText || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(()=> ({}));
    hideTyping();

    const reply = data?.reply || data?.message;
    if (!reply) {
      history.push({ role: "assistant", content: "Ups, keine Antwort erhalten. Versuche es bitte nochmal." });
    } else {
      history.push({ role: "assistant", content: reply });
    }
  } catch (e) {
    hideTyping();
    console.error("[SEYA] Fehler:", e);
    history.push({ role: "assistant", content: `Fehler: ${String(e.message || e)}` });
  } finally {
    sendBtn?.removeAttribute("disabled");
    render();
  }
}

// Warten bis DOM da ist, dann erst alles verdrahten
document.addEventListener("DOMContentLoaded", () => {
  chatEl  = document.getElementById("chat");
  formEl  = document.getElementById("chat-form");
  inputEl = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");

  if (!chatEl || !formEl || !inputEl) {
    console.error("Chat-Elemente nicht gefunden. Prüfe IDs (#chat, #chat-form, #chat-input, #send-btn).");
    return;
  }

  ensureGreeting();
  render();

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (inputEl.value || "").trim();
    if (!text) return;
    talkToSEYA(text);
  });
});


