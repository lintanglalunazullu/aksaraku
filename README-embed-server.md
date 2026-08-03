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

The server will call OpenAI embeddings (model `text-embedding-3-small`) and insert rows into Supabase table `pdf_documents` with columns: `pdf_name`, `content`, `metadata`, `embedding`.

Security

Use the `SUPABASE_SERVICE_ROLE_KEY` only on the server. Do not expose it to the browser.
