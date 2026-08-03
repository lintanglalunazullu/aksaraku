const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const SUPABASE_URL = 'https://pwohquppbydpycpqwxtg.supabase.co';
// Ganti dengan Supabase anon key yang benar dari Project Settings > API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b2hxdXBwYnlkcHljcHF3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjYyNTUsImV4cCI6MjEwMTEwMjI1NX0.QUmKNTzaw88NZqb7ihR9Mgm7laJzm6_-M7Ktz0hNcGU';

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase client initialized:', supabaseClient);
const pdfFileInput = document.getElementById('pdfFile');
const processBtn = document.getElementById('processBtn');
const statusOutput = document.getElementById('status');

function logStatus(message) {
  const now = new Date().toLocaleTimeString('id-ID');
  statusOutput.textContent += `[${now}] ${message}\n`;
  statusOutput.scrollTop = statusOutput.scrollHeight;
}

function chunkText(text, size, overlap) {
  const tokens = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + size, tokens.length);
    chunks.push(tokens.slice(start, end).join(' '));
    start += size - overlap;
  }

  return chunks;
}

async function extractTextFromPDF(file) {
  logStatus('Memuat file PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let allText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    logStatus(`Mengekstrak teks halaman ${pageNum}/${pdf.numPages}...`);
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    allText += `${pageText}\n\n`;
  }

  return allText.trim();
}

async function processPdfFile() {
  const file = pdfFileInput.files[0];
  if (!file) {
    logStatus('Silakan pilih file PDF terlebih dahulu.');
    return;
  }

  try {
    statusOutput.textContent = '';
    const text = await extractTextFromPDF(file);
    logStatus('Membuat chunk teks...');
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    logStatus(`Dibuat ${chunks.length} chunk.`);

    // Contoh payload untuk dikirim ke backend.
    const payload = {
      pdf_name: file.name,
      chunks,
    };

    logStatus('Mengirim chunk langsung ke Supabase...');
    const result = await uploadChunksToSupabase(payload);
    logStatus(`Upload selesai: ${result.length} chunk tersimpan di Supabase.`);
  } catch (error) {
    console.error(error);
    logStatus(`Terjadi kesalahan: ${error.message}`);
  }
}

processBtn.addEventListener('click', processPdfFile);

async function uploadChunksToSupabase(payload) {
  if (!supabaseClient) {
    throw new Error('Supabase belum diinisialisasi. Pastikan CDN Supabase sudah dimuat.');
  }

  const rows = payload.chunks.map((chunk) => ({
    pdf_name: payload.pdf_name,
    content: chunk,
  }));

  const { data, error } = await supabaseClient.from('pdf_documents').insert(rows).select();
  console.log('Supabase insert result:', { data, error });

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(error.message || 'Gagal menyimpan chunk ke Supabase.');
  }

  if (!data || data.length === 0) {
    const message = 'Data tidak tersimpan: tidak ada baris dikembalikan. Periksa tabel atau aturan keamanan Supabase.';
    console.error(message);
    throw new Error(message);
  }

  return data;
}
