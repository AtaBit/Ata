// app.js

const chatEl  = document.getElementById("chat");
const formEl  = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let history = [
  {
    role: "assistant",
    content:
      "Hi, herzlich willkommen bei Masterclass! Ich bin **SEYA** 🌙 – deine persönliche Assistentin. Welche Leistung wünschst du dir und wann passt es dir?"
  }
];

function render() {
  chatEl.innerHTML = "";
  for (const m of history) {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "bot"}`;
    div.innerHTML = m.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    chatEl.appendChild(div);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}
render();

async function talkToSEYA(text) {
  // Nutzer-Nachricht anzeigen
  history.push({ role: "user", content: text });
  render();

  inputEl.value = "";
  sendBtn.disabled = true;

  try {
    // Falls dein Backend { message } erwartet:
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
      // ❗ Wenn dein Backend stattdessen die ganze History erwartet,
      // nimm: body: JSON.stringify({ messages: history })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(err || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.reply || data.message || "…";
    history.push({ role: "assistant", content: reply });
  } catch (e) {
    history.push({ role: "assistant", content: "Fehler: " + e.message });
  } finally {
    sendBtn.disabled = false;
    render();
  }
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  talkToSEYA(text);
});

