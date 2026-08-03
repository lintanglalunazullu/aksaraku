import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '12mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

async function embedText(text) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });
  const j = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(j));
  return j.data?.[0]?.embedding;
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
