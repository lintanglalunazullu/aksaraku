Server for generating embeddings and upserting to Supabase

Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Run server:

```bash
npm start
```

Endpoint

- `POST /embed-upsert` — body: `{ chunks: [{ text, pdf_name?, metadata? }, ...] }`.
  - If a chunk already includes `embedding`, the server will validate the vector and insert it directly.
  - If `embedding` is omitted, the server generates it using the configured provider.
- `POST /embed-upsert-raw` — body: `{ chunks: [{ text, pdf_name?, metadata?, embedding }, ...] }`.
  - This endpoint accepts precomputed embeddings and inserts them directly after validation.

The server will call Google Vertex AI (Gemini) embeddings (if `GOOGLE_API_KEY` and `GOOGLE_PROJECT_ID` are set) or Hugging Face (if `HUGGINGFACE_API_KEY` is set) and insert rows into Supabase table `pdf_documents` with columns: `pdf_name`, `content`, `metadata`, `embedding`.

Environment

- `GOOGLE_API_KEY`: API key for Google Cloud (or use service account workflow)
- `GOOGLE_PROJECT_ID`: your GCP project id
- `GOOGLE_LOCATION`: region (default `us-central1`)
- `GOOGLE_EMBEDDING_MODEL`: embedding model name (default `textembedding-gecko-001`)

Utility

- `npm run upsert-raw-embeddings -- path/to/embeddings.json` will send precomputed embeddings to `http://127.0.0.1:3000/embed-upsert-raw`.

Security

Use the `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_API_KEY` only on the server. Do not expose them to the browser.
