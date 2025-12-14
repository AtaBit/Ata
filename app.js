// === SEYA Webchat – stabile Version ===
const chatEl  = document.getElementById("chat");
const formEl  = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let history = [
  {
    role: "assistant",
    content:
      "Hi, ich bin SEYA – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?"
  }
];

function render() {
  if (!chatEl) return console.error("#chat nicht gefunden");
  chatEl.innerHTML = "";
  for (const m of history) {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "bot"}`;
    // **bold** erlauben, Rest plain
    div.innerHTML = String(m.content || "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    chatEl.appendChild(div);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}
render();

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

