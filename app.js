// -------- persistent session (30 Min) ----------
const STORE_KEY = "seya_history_v2";
const MAX_AGE_MIN = 30;

const loadHistory = () => {
  try{
    const raw = sessionStorage.getItem(STORE_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(Date.now()-obj.ts > MAX_AGE_MIN*60000){ sessionStorage.removeItem(STORE_KEY); return null; }
    return Array.isArray(obj.messages)? obj.messages : null;
  }catch{ return null; }
};
const saveHistory = (messages) => {
  try{ sessionStorage.setItem(STORE_KEY, JSON.stringify({ts:Date.now(), messages})) }catch{}
};
const resetHistory = () => { sessionStorage.removeItem(STORE_KEY); location.reload(); };

// -------- initial greeting ----------
const initialGreeting =
  "Hi, ich bin **SEYA** – deine Assistentin von Masterclass Hair & Beauty. In welchem Standort darf ich dir helfen – Ostermiething oder Mattighofen?";

let history = loadHistory() || [{ role:"assistant", content: initialGreeting }];
saveHistory(history);

// -------- DOM --------
const chatEl  = document.getElementById("chat");
const formEl  = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
document.getElementById("reset-btn").addEventListener("click", resetHistory);

// -------- render --------
function render(){
  chatEl.innerHTML = "";
  history.forEach(m=>{
    const row = document.createElement("div");
    row.className = `msg ${m.role === "user" ? "user" : "bot"}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = String(m.content||"").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
    row.appendChild(bubble);
    chatEl.appendChild(row);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
}
render();

// -------- talk to SEYA --------
async function talkToSEYA(text){
  history.push({ role:"user", content:text });
  render(); saveHistory(history);
  inputEl.value = ""; sendBtn.disabled = true;

  try{
    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await res.json();

    if(res.ok && data?.reply){
      history.push({ role:"assistant", content:data.reply });
    }else{
      history.push({ role:"assistant", content:"Entschuldige, da ging etwas schief – versuch’s bitte nochmal." });
    }
  }catch(e){
    history.push({ role:"assistant", content:"Netzwerkfehler – bitte prüfe die Verbindung." });
  }
  saveHistory(history); render(); sendBtn.disabled = false;
}

formEl.addEventListener("submit", (e)=>{
  e.preventDefault();
  const text = (inputEl.value||"").trim();
  if(!text) return;
  talkToSEYA(text);
});
