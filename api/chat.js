export const config = { runtime: "edge" };

const BUSINESS = {
  name: "Masterclass Hair & Beauty",
  phone: "+43 000 0000000",
  address: "Ostermiething & Mattighofen",

  links: {
    haare: "https://masterclass-hairbeauty.com/haare/",
    kosmetik: "https://masterclass-hairbeauty.com/kosmetik/",
    pmu: "https://masterclass-hairbeauty.com/permanent-makeup/",
    braut: "https://masterclass-hairbeauty.com/braut-styling-ostermiething/",
    herren: "https://masterclass-hairbeauty.com/herren/"
  },

  hours: {
    mon: "geschlossen",
    tue: "09:00–19:00",
    wed: "09:00–19:00",
    thu: "09:00–19:00",
    fri: "09:00–19:00",
    sat: "nach Vereinbarung",
    sun: "geschlossen"
  },

  staff: ["Seda", "Sema", "Sevim", "Selina", "Anna", "Dijana"],

  staffBySkill: {
    balayage: ["Seda", "Selina", "Dijana"],
    color: ["Seda", "Sevim", "Selina", "Dijana"],
    cut_damen: ["Seda", "Selina", "Anna", "Dijana"],
    styling: ["Seda", "Selina", "Anna"],
    cut_herren: ["Seda", "Anna", "Dijana"],
    bart: ["Seda", "Dijana"],
    gesichtsbehandlung: ["Sevim"],
    augenbrauen_wimpern: ["Sevim", "Selina"],
    pmu_brows: ["Sema"],
    pmu_lips: ["Sema"],
    pmu_liner: ["Sema"],
    brautstyling: ["Seda", "Selina"],
    brautgaeste: ["Seda", "Selina", "Anna"]
  },

  services: [
    { category: "Haare", page: "haare" },
    { category: "Kosmetik", page: "kosmetik" },
    { category: "Permanent Make-up", page: "pmu" },
    { category: "Braut-Styling", page: "braut" },
    { category: "Herren", page: "herren" }
  ]
};

const SYSTEM_PROMPT = (b) => `
Du bist **Luna**, die Assistentin von ${b.name}.
Antwortstil: herzlich, freundlich, professionell, weiblich.

Aufgaben:
- Kunden begrüßen
- Leistungen erklären (Haare, Herren, Kosmetik, PMU, Braut)
- Preise nennen
- Dauer erklären
- Mitarbeiter empfehlen
- Öffnungszeiten erklären
- Links schicken, wenn sinnvoll
- Termin vorbereiten: Datum, Uhrzeit, Name, Telefonnummer

Sei immer höflich, warm und hilfsbereit.
`;

export default async function handler(req) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY fehlt." }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(BUSINESS) },
          ...messages
        ]
      })
    });

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "Fehler.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
