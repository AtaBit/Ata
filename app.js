// --------------------- Chat-Speicher ---------------------
function loadHistory() {
  try {
    const raw = sessionStorage.getItem("seya_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveHistory(h) {
  try {
    localStorage.setItem("seya_history", JSON.stringify(h));
  } catch {}
}

let history = loadHistory();

const initialGreeting =
  "Hi, ich bin SEYA – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

if (!history.some(m => m.role === "assistant")) {
  history.unshift({ role: "assistant", content: initialGreeting });
}

// --------------------- DOM ---------------------
const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");

// --------------------- Rendering ---------------------
function render() {
  chatEl.innerHTML = "";
  history.forEach(m => {
    const row = document.createElement("div");
    row.className = "msg " + (m.role === "user" ? "user" : "bot");

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.content;

    if (m.role !== "user") row.appendChild(avatar);
    row.appendChild(bubble);
    chatEl.appendChild(row);
  });

  chatEl.scrollTop = chatEl.scrollHeight;
}

// --------------------- Standort + Leistung Erkennung ---------------------
const LOCATIONS = ["ostermiething", "mattighofen"];

const SERVICE_KEYWORDS = {
  haare: ["haarschnitt", "haare", "farbe", "färben", "styling", "pflege", "balayage", "strähnen"],
  kosmetik: ["kosmetik", "gesichts", "peeling", "aquapeel", "microneedling"],
  pmu: ["permanent", "microblading", "lippen", "eyeliner", "wimpernkranz"],
  braut: ["braut", "brautfrisur", "probe", "hochstecken"],
  herren: ["herren", "männer", "bart", "maschinenschnitt"]
};

function allText() {
  return history.map(m => m.content.toLowerCase()).join(" ");
}

function detectLocation() {
  const t = allText();
  if (t.includes("ostermiething")) return "ostermiething";
  if (t.includes("mattighofen")) return "mattighofen";
  return null;
}

function detectService() {
  const t = allText();
  for (const [key, arr] of Object.entries(SERVICE_KEYWORDS)) {
    if (arr.some(w => t.includes(w))) return key;
  }
  return null;
}

// --------------------- Buttons ---------------------
function updateActions() {
  const box = document.getElementById("actions");
  const btn = document.getElementById("bookBtn");

  const loc = detectLocation();
  const svc = detectService();

  const ready = loc && svc;

  box.classList.toggle("hidden", !ready);

  if (ready) {
    const url =
      loc === "ostermiething"
        ? "https://meintermin.termingo.de/preisliste/326";
        
      loc === "mattighofen"
    ?   "https://meintermin.termingo.de/preisliste/335";

    btn.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
  }
}

// --------------------- Nachrichten senden ---------------------
formEl.addEventListener("submit", async e => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  history.push({ role: "user", content: text });
  inputEl.value = "";
  render();
  updateActions();
  saveHistory(history);

  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history })
  });

  const data = await resp.json();
  if (data.reply) {
    history.push({ role: "assistant", content: data.reply });
  } else {
    history.push({ role: "assistant", content: "Es gab einen Fehler. Bitte versuche es erneut." });
  }

  render();
  updateActions();
  saveHistory(history);
});

// --------------------- Start ---------------------
render();
updateActions();



