// AI Reply API - uses Groq for text generation
import fetch from 'node-fetch';

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
        let reply;

        if (groqApiKey) {
            // Use Groq LLM to generate a real contextual reply
            const toneInstructions = {
                professional: 'Reply in a clear, concise, professional manner.',
                friendly: 'Reply in a warm, upbeat, friendly manner.',
                formal: 'Reply in a highly formal, structured manner.',
                casual: 'Reply in a relaxed, conversational, casual manner.'
            };

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful assistant. ${toneInstructions[tone] || toneInstructions.professional} Keep replies under 3 sentences.`
                        },
                        { role: 'user', content: text }
                    ],
                    max_tokens: 200
                })
            });

            if (groqResponse.ok) {
                const data = await groqResponse.json();
                reply = data.choices?.[0]?.message?.content?.trim();
            }
        }

        // Fallback if Groq fails or key missing
        if (!reply) {
            const templates = {
                professional: `Thank you for sharing that. I've noted your message and will address it accordingly.`,
                friendly: `Oh nice! I heard you — let me help you with that right away!`,
                formal: `Your input has been acknowledged and will be handled with utmost care.`,
                casual: `Got it! Let's work through that together.`
            };
            reply = templates[tone] || templates.professional;
        }

        // Return reply text; frontend handles TTS via Web Speech API
        return res.status(200).json({
            reply,
            language,
            tone,
            audio: null, // TTS is handled client-side
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reply error:', error);
        return res.status(500).json({ error: error.message || 'Reply generation failed' });
    }
}
