// api/chat.js — Vercel Serverless Function (Edge)
export const config = { runtime: "edge" };

/** Business-Konfiguration */
const BUSINESS = {
  name: "Masterclass Hair & Beauty",
  phone: "+43 000 0000000",                 // <- optional anpassen
  address: "Ostermiething & Mattighofen",   // <- optional anpassen
  links: {
    haare:  "https://masterclass-hairbeauty.com/haare/",
    kosmetik: "https://masterclass-hairbeauty.com/kosmetik/",
    pmu:    "https://masterclass-hairbeauty.com/permanent-makeup/",
    braut:  "https://masterclass-hairbeauty.com/braut-styling-ostermiething/",
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

  // Kategorien + Beispiel-Services (Preise/Dauer kannst du jederzeit schärfen)
  services: [
    {
      category: "Haare (Damen)",
      page: "haare",
      items: [
        { key: "cut_damen",   label: "Damenhaarschnitt & Föhnen", price: "45–70 €",  duration: "45–60 min" },
        { key: "color",       label: "Farbe / Tönung",            price: "ab 60 €",  duration: "60–120 min" },
        { key: "balayage",    label: "Balayage",                  price: "ab 120 €", duration: "120–180 min" },
        { key: "styling",     label: "Styling / Föhnen",          price: "25–40 €",  duration: "20–40 min" }
      ]
    },
    {
      category: "Herren",
      page: "herren",
      items: [
        { key: "cut_herren",  label: "Herrenhaarschnitt",         price: "25–35 €",  duration: "25–35 min" },
        { key: "bart",        label: "Bartservice",               price: "15 €",     duration: "15–20 min" }
      ]
    },
    {
      category: "Kosmetik",
      page: "kosmetik",
      items: [
        { key: "gesichtsbehandlung",     label: "Gesichtsbehandlung",                 price: "ab 49 €", duration: "45–75 min" },
        { key: "augenbrauen_wimpern",    label: "Brauen & Wimpern (Färben/Lifting)",  price: "ab 20 €", duration: "20–45 min" }
      ]
    },
    {
      category: "Permanent Make-up",
      page: "pmu",
      items: [
        { key: "pmu_brows",   label: "PMU Augenbrauen", price: "ab 200 €", duration: "120–180 min" },
        { key: "pmu_lips",    label: "PMU Lippen",      price: "ab 200 €", duration: "120–180 min" },
        { key: "pmu_liner",   label: "PMU Eyeliner",    price: "ab 180 €", duration: "90–150 min" }
      ]
    },
    {
      category: "Braut-Styling",
      page: "braut",
      items: [
        { key: "brautstyling", label: "Brautfrisur & Make-up (inkl. Probe)", price: "Paket / auf Anfrage", duration: "nach Absprache" },
        { key: "brautgaeste",  label: "Brautgäste (Frisur/Make-up)",         price: "auf Anfrage",         duration: "nach Absprache" }
      ]
    }
  ],

  // Empfehlung: wer macht was besonders gern/gut (nur Vorschlag, keine Pflicht)
  staffBySkill: {
    balayage: ["Seda", "Selina", "Dijana"],
    color: ["Seda", "Sevim", "Selina", "Dijana"],
    cut_damen: ["Seda", "Selina", "Anna", "Dijana"],
    styling: ["Seda", "Selina", "Anna"],
    cut_herren: ["Seda", "Anna", "Dijana"],
    bart: ["Seda", "Dijana"],
    gesichtsbehandlung: ["Sevim"],              // Kosmetik
    augenbrauen_wimpern: ["Sevim", "Selina"],   // Kosmetik/Brauen
    pmu_brows: ["Sema"],                        // Permanent Make-up
    pmu_lips: ["Sema"],                         // Permanent Make-up
    pmu_liner: ["Sema"],                        // Permanent Make-up
    brautstyling: ["Seda", "Selina"],
    brautgaeste: ["Seda", "Selina", "Anna"]
  }
};

const SYSTEM_PROMPT = (b) => `
Du heißt **Luna** und bist die freundliche Assistentin von **${b.name}** (${b.address}).
Aufgabe: Bedarf verstehen und einen Terminwunsch sauber vorbereiten (noch keine echte Buchung).

Rahmen:
- Öffnungszeiten: Mo ${b.hours.mon}, Di ${b.hours.tue}, Mi ${b.hours.wed}, Do ${b.hours.thu}, Fr ${b.hours.fri}, Sa ${b.hours.sat}, So ${b.hours.sun}.
- Team: ${b.staff.join(", ")}.
- Services (Richtpreise & Dauer):
${b.services.map(cat => `  • ${cat.category}: ${cat.items.map(i => `${i.label} (${i.price}, ${i.duration})`).join("; ")}`).join("\n")}
- Seiten mit Details:
  Haare: ${b.links.haare}
  Herren: ${b.links.herren}
  Kosmetik: ${b.links.kosmetik}
  PMU: ${b.links.pmu}
  Braut: ${b.links.braut}

Vorgehen:
1) Freundlich begrüßen, kurz Bedarf klären (z. B. Damen/Herren, Service).
2) Schrittweise einsammeln: Leistung(en), Wunschtag & Zeitfenster, optional Stylist:in (ggf. empfehlen: Balayage → ${b.staffBySkill.balayage.join(", ")}; PMU → Sema; Kosmetik → Sevim), Vor- & Nachname, Telefonnummer.
3) Bei Preisen: „ab“-Preise klar sagen. Wenn unklar, auf die Seite verweisen.
4) Samstage: „nach Vereinbarung“. Wenn Kunde genau Samstag möchte, aktiv Rückfrage stellen und ggf. Telefonnummer für Rückruf nehmen.
5) Zum Schluss Zusammenfassung mit allen Daten + Frage: „Soll ich das so eintragen?“
6) Wenn Telefon gewünscht: ${b.phone}
Sprich kurz, klar, warmherzig. Antworte auf Deutsch. Nutze Absätze & kurze Aufzählungen.
`;

export default async function handler(req) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY fehlt in Vercel (Project → Settings → Environment Variables)." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // oder "gpt-5-mini", falls bei dir verfügbar
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(BUSINESS) },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text }), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Entschuldige, ich habe gerade nichts verstanden.";
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
