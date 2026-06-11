// Transcription API - Powered by Groq Whisper
// ============================================
// Uses multer memory storage to parse multipart/form-data on Vercel serverless

import FormData from 'form-data';
import fetch from 'node-fetch';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
        }

        // Parse multipart/form-data — populates req.file and req.body
        await runMiddleware(req, res, upload.single('audio'));

        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Read model and language from parsed body
        const model = req.body?.model || 'whisper-large-v3-turbo';
        const language = req.body?.language || null; // null = auto-detect

        console.log(`Transcribing with model=${model} language=${language || 'auto'} size=${file.size}`);

        // Build multipart request to Groq
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname || 'audio.webm',
            contentType: file.mimetype || 'audio/webm',
        });
        formData.append('model', model);
        if (language) {
            formData.append('language', language);
        }

        const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error('Groq API error:', errText);
            throw new Error(`Groq API error ${groqResponse.status}: ${errText}`);
        }

        const transcription = await groqResponse.json();

        const result = {
            text: transcription.text || '',
            language: transcription.language || language || 'en',
            duration: transcription.duration || 0,
            segments: processSegments(transcription),
            wordCount: (transcription.text || '').split(/\s+/).filter(w => w.length > 0).length,
            model: model
        };

        return res.status(200).json(result);

    } catch (error) {
        console.error('Transcription error:', error);
        return res.status(500).json({ error: error.message || 'Transcription failed' });
    }
}

function processSegments(transcription) {
    // Use real Groq segments if available
    if (transcription.segments && transcription.segments.length > 0) {
        return transcription.segments.map(seg => ({
            start: seg.start,
            end: seg.end,
            text: seg.text
        }));
    }

    // Fallback: split text into ~10-word chunks with estimated timing
    if (!transcription.text) return [];

    const words = transcription.text.split(/\s+/);
    const segments = [];
    let currentTime = 0;
    let currentSegment = '';
    let segmentStart = 0;

    words.forEach((word, idx) => {
        currentSegment += (currentSegment ? ' ' : '') + word;
        if ((idx + 1) % 10 === 0 || idx === words.length - 1) {
            segments.push({ start: segmentStart, end: currentTime + 1.5, text: currentSegment });
            segmentStart = currentTime + 1.5;
            currentSegment = '';
        }
        currentTime += 0.15;
    });

    return segments;
}
