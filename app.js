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

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history   // <-- WICHTIG! Ein ARRAY
      })
    });

    const data = await res.json();

    if (data.reply) {
      history.push({
        role: "assistant",
        content: data.reply
      });
    } else {
      history.push({
        role: "assistant",
        content: "Fehler: Keine Antwort erhalten."
      });
    }
  } catch (err) {
    history.push({
      role: "assistant",
      content: "Fehler: " + err.message
    });
  }

  sendBtn.disabled = false;
  render();
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  talkToSEYA(text);
});

