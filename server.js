import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '12mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Google / Vertex AI (Gemini) config
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const GOOGLE_EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL || 'textembedding-gecko-001';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

async function embedText(text) {
  // Prefer Google Vertex AI (Gemini) embeddings if configured
  if (GOOGLE_API_KEY && GOOGLE_PROJECT_ID) {
    const host = `${GOOGLE_LOCATION}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/publishers/google/models/${GOOGLE_EMBEDDING_MODEL}:embedText?key=${GOOGLE_API_KEY}`;

    const body = { instances: [{ content: text }] };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const j = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(j));

    // Try multiple possible response shapes
    const emb = j?.predictions?.[0]?.embedding || j?.predictions?.[0]?.value || j?.predictions?.[0] || j?.embeddings?.[0] || j?.data?.[0]?.embedding;
    return emb;
  }

  throw new Error('No embedding provider configured. Set GOOGLE_API_KEY and GOOGLE_PROJECT_ID.');
}

// POST /embed-upsert
// body: { chunks: [{ id?, text, pdf_name?, metadata? }, ...] }
app.post('/embed-upsert', async (req, res) => {
  const { chunks } = req.body;
  if (!Array.isArray(chunks)) return res.status(400).json({ error: 'invalid chunks' });

  try {
    const rows = [];
    for (const c of chunks) {
      const text = String(c.text || '');
      const embedding = await embedText(text);
      rows.push({
        pdf_name: c.pdf_name || c.pdfName || null,
        content: text,
        metadata: c.metadata || null,
        embedding,
      });
    }

    const { data, error } = await supabase.from('pdf_documents').insert(rows);
    if (error) return res.status(500).json({ error });
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
