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

The server will call Google Vertex AI (Gemini) embeddings (if `GOOGLE_API_KEY` and `GOOGLE_PROJECT_ID` are set) and insert rows into Supabase table `pdf_documents` with columns: `pdf_name`, `content`, `metadata`, `embedding`.

Environment

- `GOOGLE_API_KEY`: API key for Google Cloud (or use service account workflow)
- `GOOGLE_PROJECT_ID`: your GCP project id
- `GOOGLE_LOCATION`: region (default `us-central1`)
- `GOOGLE_EMBEDDING_MODEL`: embedding model name (default `textembedding-gecko-001`)

Security

Use the `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_API_KEY` only on the server. Do not expose them to the browser.
