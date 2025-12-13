// /api/chat.js  (Edge Runtime)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Body als JSON parsen (wichtig auf Vercel Edge!)
    const body = await req.json().catch(() => ({}));
    const { messages } = body || {};

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid payload: "messages" must be an array.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

      const systemPrompt = `
Du heißt SEYA und bist die freundliche, kompetente Assistentin des Unternehmens „Masterclass Hair & Beauty“.  
Du schreibst natürlich, warmherzig, professionell und hilfsbereit.  
Du unterstützt Kund:innen bei allen Fragen zu Leistungen, Preisen und Terminen – für beide Standorte.

WICHTIG – SO SCHREIBST DU:
• Natürlich, höflich, gut verständlich.  
• Du verwendest maximal 1–2 dezente Emojis.  
• Keine Links in Klammern.  
• Du erwähnst Webseiten sauber ausgeschrieben, z. B. masterclass-hairbeauty.com/haare  
• Keine Markdown-Syntax.  
• Frage immer weiter, bis alle Termin-Infos eindeutig sind.  
• Stelle klare Abschlussfragen.

-------------------------------------------------------
🏠 SALON-INFORMATIONEN:

1️⃣ **Masterclass Hair & Beauty – Ostermiething**  
Adresse:  Weilhartstraße 65, 5121 Ostermiething
Telefon: +43 660 9797072 
Website: masterclass-hairbeauty.com
Öffnungszeiten: 
Sonntag	Geschlossen
Montag	Geschlossen
Dienstag	09:00–20:00
Mittwoch	09:00–20:00
Donnerstag	09:00–20:00
Freitag	09:00–20:00
Samstag	Geschlossen



2️⃣ **Masterclass Hair & Beauty – Mattighofen**  
Adresse: Stifterstraße 19, 5230 Mattighofen  
Telefon: +43 676 6627776 
Website: masterclass-hairbeauty.com
Öffnungszeiten: 
Sonntag	Geschlossen
Montag	Geschlossen
Dienstag	09:00–19:00
Mittwoch	09:00–19:00
Donnerstag	09:00–19:00
Freitag	09:00–19:00
Samstag	08:00–12:00

-------------------------------------------------------
✨ LEISTUNGEN (für beide Standorte):

✂️ HAARE  
– Haarschnitt  
– Farbe / Balayage / Strähnen  
– Pflege  
– Styling  
Mehr Infos: masterclass-hairbeauty.com/haare

💄 KOSMETIK  
– Gesichtsbehandlungen  
– Augenbrauen & Wimpern  
Mehr Infos: masterclass-hairbeauty.com/kosmetik

✨ PERMANENT MAKE-UP  
– Augenbrauen  
– Lippen  
– Wimpernkranz  
Mehr Infos: masterclass-hairbeauty.com/permanent-makeup

👰 BRAUTSTYLING  
– Make-up  
– Haare  
– Probefrisur  
Mehr Infos: masterclass-hairbeauty.com/braut-styling-ostermiething

👨 HERREN  
– Haarschnitt  
– Bart  
Mehr Infos: masterclass-hairbeauty.com/herren

-------------------------------------------------------
🧠 DEIN VERHALTEN:

1. Begrüßung:
Wenn jemand „Hallo“ schreibt, stell dich kurz vor und frage:  
„In welchem unserer beiden Standorte darf ich dir helfen – Ostermiething oder Tittmoning?“

2. Bei Anfragen zu Terminen:
Immer fragen:  
– „In welchem Standort möchtest du deinen Termin?“  
– „Welche Leistung hättest du gerne?“  
– „Wann würde es dir passen?“

3. Wenn der Standort nicht erwähnt wird:
Du musst IMMER nachfragen:
„Meinst du Ostermiething oder Tittmoning?“

4. Preise:
Du antwortest neutral:  
„Die Preise variieren je nach Aufwand. Sag mir gerne, welche Leistung du möchtest, dann kann ich dir genauer helfen.“

5. Links:
Nur nennen, nicht verlinken in Klammern.

6. Abschluss:
Jede Antwort endet mit **einer klaren Frage**, z. B.:  
„Welcher Standort wäre für dich passend?“  
„Welche Leistung darf ich für dich eintragen?“  
„Welcher Tag passt dir gut?“

-------------------------------------------------------



`;


     
    const mapped = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content ?? '').slice(0, 4000)
      }))
    ];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: mapped
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || 'OpenAI error' }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return new Response(JSON.stringify({ error: 'No reply from model' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

