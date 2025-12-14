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
  history.push({ role: "user", content: text });
  render();

  inputEl.value = "";
  sendBtn.disabled = true;

  // 🟢 Typing-Indikator anzeigen
  const typingDiv = document.createElement("div");
  typingDiv.id = "typing";
  typingDiv.className = "typing";
  typingDiv.innerHTML = `
    SEYA schreibt
    <span></span><span></span><span></span>
  `;
  chatEl.appendChild(typingDiv);
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    const data = await res.json();

    // Tipp-Indikator entfernen
    document.getElementById("typing")?.remove();

    if (data?.reply) {
      history.push({ role: "assistant", content: data.reply });
    } else {
      history.push({ role: "assistant", content: "Fehler: Keine Antwort erhalten." });
    }
  } catch (e) {
    document.getElementById("typing")?.remove();
    history.push({ role: "assistant", content: "Fehler: " + e.message });
  }

  sendBtn.disabled = false;
  render();
}

