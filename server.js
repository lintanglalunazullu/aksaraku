import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { InferenceClient } from '@huggingface/inference';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Optional embedding provider config
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_EMBEDDING_MODEL = process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const EXPECTED_EMBEDDING_DIMENSION = Number(process.env.HUGGINGFACE_EXPECTED_EMBEDDING_DIMENSION || '384');

// Google / Vertex AI (Gemini) config fallback
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const GOOGLE_EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL || 'textembedding-gecko-001';

const hfClient = HUGGINGFACE_API_KEY ? new InferenceClient(HUGGINGFACE_API_KEY) : null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
}

if (!HUGGINGFACE_API_KEY && !(GOOGLE_API_KEY && GOOGLE_PROJECT_ID)) {
  console.warn('Warning: set HUGGINGFACE_API_KEY or GOOGLE_API_KEY+GOOGLE_PROJECT_ID to generate embeddings');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

function validateEmbedding(embedding) {
  return (
    Array.isArray(embedding) &&
    embedding.length === EXPECTED_EMBEDDING_DIMENSION &&
    embedding.every((value) => typeof value === 'number')
  );
}

async function embedText(text) {
  if (HUGGINGFACE_API_KEY && hfClient) {
    const result = await hfClient.featureExtraction({
      model: HUGGINGFACE_EMBEDDING_MODEL,
      inputs: text,
    });

    if (!Array.isArray(result)) {
      throw new Error(`Hugging Face featureExtraction response invalid: ${JSON.stringify(result)}`);
    }

    // result may be [[...]] or [...] depending on model / provider
    const embedding = Array.isArray(result[0]) && typeof result[0][0] === 'number' ? result[0] : result;
    if (!validateEmbedding(embedding)) {
      throw new Error(`Invalid embedding shape from HF: ${JSON.stringify(result)}`);
    }
    return embedding;
  }

  if (GOOGLE_API_KEY && GOOGLE_PROJECT_ID) {
    const host = `${GOOGLE_LOCATION}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/publishers/google/models/${GOOGLE_EMBEDDING_MODEL}:predict?key=${GOOGLE_API_KEY}`;

    const body = { instances: [{ content: text }] };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = resp.headers.get('content-type') || '';
    const respBody = await resp.text();
    if (!resp.ok) {
      throw new Error(`Vertex AI request failed ${resp.status}: ${respBody}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error(`Vertex AI returned non-JSON response: ${respBody}`);
    }

    const j = JSON.parse(respBody);
    const emb = j?.predictions?.[0]?.embedding || j?.predictions?.[0]?.value || j?.predictions?.[0] || j?.embeddings?.[0] || j?.data?.[0]?.embedding;

    if (!validateEmbedding(emb)) {
      throw new Error(`Invalid embedding shape from Vertex AI: ${JSON.stringify(j)}`);
    }
    return emb;
  }

  throw new Error('No embedding provider configured. Set HUGGINGFACE_API_KEY or GOOGLE_API_KEY and GOOGLE_PROJECT_ID.');
}

function normalizeChunk(chunk) {
  const content = String(chunk.text || '');
  let embedding = chunk.embedding;

  if (embedding != null) {
    if (!validateEmbedding(embedding)) {
      throw new Error(
        `Invalid embedding for chunk${chunk.id ? ` id=${chunk.id}` : ''}. Expected vector length ${EXPECTED_EMBEDDING_DIMENSION}.`,
      );
    }
  }

  const row = {
    pdf_name: chunk.pdf_name || chunk.pdfName || null,
    content,
    embedding,
  };

  if (chunk.metadata !== undefined) {
    row.metadata = chunk.metadata;
  }

  return row;
}

// POST /embed-upsert
// body: { chunks: [{ id?, text, pdf_name?, metadata?, embedding? }, ...] }
app.post('/embed-upsert', async (req, res) => {
  const { chunks } = req.body;
  if (!Array.isArray(chunks)) return res.status(400).json({ error: 'invalid chunks' });

  try {
    const rows = [];
    for (const c of chunks) {
      const chunk = normalizeChunk(c);
      if (!chunk.embedding) {
        chunk.embedding = await embedText(chunk.content);
      }
      rows.push(chunk);
    }

    const { data, error } = await supabase.from('pdf_documents').insert(rows).select();
    if (error) return res.status(500).json({ error });
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// POST /embed-upsert-raw
// body: { chunks: [{ id?, text, pdf_name?, metadata?, embedding }, ...] }
app.post('/embed-upsert-raw', async (req, res) => {
  const { chunks } = req.body;
  if (!Array.isArray(chunks)) return res.status(400).json({ error: 'invalid chunks' });

  try {
    const rows = chunks.map((c) => {
      const chunk = normalizeChunk(c);
      if (!chunk.embedding) {
        throw new Error(`Missing embedding for chunk${c.id ? ` id=${c.id}` : ''}`);
      }
      return chunk;
    });

    const { data, error } = await supabase.from('pdf_documents').insert(rows).select();
    if (error) return res.status(500).json({ error });
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.post('/query-docs', async (req, res) => {
  const { question } = req.body;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const embedding = await embedText(question.trim());
    const { data, error } = await supabase.rpc('match_pdf_documents', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 4,
    });

    if (error) {
      console.error('Supabase vector search error:', error);
      return res.status(500).json({ error: String(error) });
    }

    return res.json({ data: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
