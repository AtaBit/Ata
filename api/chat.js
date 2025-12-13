// /api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Body lesen
    const { messages } = req.body || {};

    // Validieren
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid payload: "messages" must be an array.' });
    }

    // System-Prompt (SEYA-Identität)
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
      `Frag am Ende freundlich nach einem Terminfenster.`

    // Frontend-Nachrichten defensiv mappen
    const mapped = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content ?? '').slice(0, 4000) // Safety
      }))
    ];

    // OpenAI-Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // OpenAI-Request (günstig & gut)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',         // günstig und ausreichend
        temperature: 0.4,
        messages: mapped
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // OpenAI-Fehler 1:1 zurückgeben, damit du siehst, was los ist
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI error' });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(500).json({ error: 'No reply from model' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

