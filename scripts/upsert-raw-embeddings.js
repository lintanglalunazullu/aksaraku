import fs from 'fs/promises';
import fetch from 'node-fetch';

const [filePath = 'embeddings.json', endpoint = 'https://aksaraku-gamma.vercel.app/embed-upsert-raw'] = process.argv.slice(2);

async function main() {
  const payloadText = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(payloadText);

  if (!payload || !Array.isArray(payload.chunks)) {
    throw new Error('Input file must contain a JSON object with a `chunks` array.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
  }

  console.log(`Uploaded ${payload.chunks.length} chunks successfully.`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
