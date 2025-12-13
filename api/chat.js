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

    const systemPrompt =
      `Du heißt SEYA und bist die freundliche Assistentin des Salons "Masterclass Hair & Beauty". ` +
      `Antworte kurz, hilfreich und auf Deutsch. Biete aktiv passende Leistungen an ` +
      `(Haare, Kosmetik, Permanent Make-up, Braut-Styling, Herren) und frage nach Wunschtermin. ` +
      `Wenn sinnvoll, verweise auf die passenden Seiten:\n` +
      `• Haare: https://masterclass-hairbeauty.com/haare/\n` +
      `• Kosmetik: https://masterclass-hairbeauty.com/kosmetik/\n` +
      `• Permanent Make-up: https://masterclass-hairbeauty.com/permanent-makeup/\n` +
      `• Braut-Styling: https://masterclass-hairbeauty.com/braut-styling-ostermiething/\n` +
      `• Herren: https://masterclass-hairbeauty.com/herren/\n` +
      `Frag am Ende freundlich nach einem Terminfenster.`;

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

