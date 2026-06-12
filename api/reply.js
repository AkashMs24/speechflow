// AI Reply API - Translate transcript + Generate reply in selected language
// =========================================================================

import fetch from 'node-fetch';

const languageNames = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
    zh: 'Chinese (Simplified)', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { text, language = 'en', tone = 'professional' } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });

        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

        const targetLang = languageNames[language] || 'English';

        const toneInstructions = {
            professional: 'professional and clear',
            friendly: 'warm and friendly',
            formal: 'highly formal and structured',
            casual: 'casual and conversational'
        };
        const toneDesc = toneInstructions[tone] || toneInstructions.professional;

        // Single Groq call — translate AND reply together
        const prompt = `You are a multilingual assistant. The user recorded this message: "${text}"

Do two things, strictly in ${targetLang} only:

1. TRANSLATION: Translate the above message into ${targetLang}.
2. REPLY: Write a ${toneDesc} reply to the message in ${targetLang}. Keep it under 3 sentences.

Respond ONLY in this exact JSON format, no extra text:
{
  "translation": "<translated text in ${targetLang}>",
  "reply": "<reply text in ${targetLang}>"
}`;

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192',   // 70B is much better at multilingual tasks
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 400,
                temperature: 0.3
            })
        });

        let translation = null;
        let reply = null;

        if (groqResponse.ok) {
            const data = await groqResponse.json();
            const raw = data.choices?.[0]?.message?.content?.trim() || '';
            try {
                // Strip markdown code fences if present
                const clean = raw.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(clean);
                translation = parsed.translation || null;
                reply = parsed.reply || null;
            } catch {
                // If JSON parse fails, use the raw text as reply
                reply = raw;
            }
        } else {
            console.error('Groq error:', await groqResponse.text());
        }

        // Fallback
        if (!reply) reply = `Got it! Let's work through that together.`;
        if (!translation) translation = text; // return original if translation failed

        return res.status(200).json({
            translation,
            reply,
            language,
            tone,
            audio: null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reply error:', error);
        return res.status(500).json({ error: error.message || 'Reply generation failed' });
    }
}
