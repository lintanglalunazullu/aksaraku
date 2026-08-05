lucide.createIcons();

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const chatThread = document.getElementById("chatThread");
const threadInner = chatThread.querySelector(".max-w-3xl");

// Configuration Constants
const GEMINI_API_KEY = "AQ.Ab8RN6JqgIuaVnj5xLn9_KGGKPfR16vhBLbDPw5jTWqn-2XT5g"; // Ganti dengan API Key Anda yang valid
const GEMINI_MODEL = "gemini-3.5-flash-lite"; // Menggunakan model Lite yang kuota gratisnya 500 RPD
const SUPABASE_URL = "https://pwohquppbydpycpqwxtg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b2hxdXBwYnlkcHljcHF3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjYyNTUsImV4cCI6MjEwMTEwMjI1NX0.QUmKNTzaw88NZqb7ihR9Mgm7laJzm6_-M7Ktz0hNcGU";

// Enable / disable send button based on input content
chatInput.addEventListener("input", () => {
    sendBtn.disabled = chatInput.value.trim().length === 0;
});

function formatTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

function scrollToBottom() {
    chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: "smooth" });
}

function appendUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col items-end animate-fadeUp";
    wrapper.innerHTML = `
      <div class="bg-bubbleUser rounded-2xl rounded-tr-sm px-4 py-3.5 max-w-[85%]">
        <p class="text-sm leading-relaxed text-[#F3F4F6]"></p>
      </div>
      <span class="text-[11px] text-[#6B7280] mt-1.5 mr-1">Terkirim • ${formatTime()}</span>
    `;
    wrapper.querySelector("p").textContent = text;
    threadInner.appendChild(wrapper);
    return wrapper;
}

function appendTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-start gap-3 animate-fadeUp";
    wrapper.id = "typingIndicator";
    wrapper.innerHTML = `
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-900/30">
        <i data-lucide="book-open" class="w-4.5 h-4.5 text-white"></i>
      </div>
      <div class="bg-bubbleAi border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style="animation-delay:0ms"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style="animation-delay:150ms"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style="animation-delay:300ms"></span>
        </div>
      </div>
    `;
    threadInner.appendChild(wrapper);
    lucide.createIcons();
    return wrapper;
}

function appendAiReply(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-start gap-3 animate-fadeUp";
    wrapper.innerHTML = `
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-900/30">
        <i data-lucide="book-open" class="w-4.5 h-4.5 text-white"></i>
      </div>
      <div class="bg-bubbleAi border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3.5 max-w-[85%]">
        <p class="text-sm leading-relaxed text-[#F3F4F6] whitespace-pre-wrap"></p>
      </div>
    `;
    wrapper.querySelector("p").textContent = text;
    threadInner.appendChild(wrapper);
    lucide.createIcons();
    return wrapper;
}

// Alternatif ringkas tanpa perlu generate Vektor/Embedding terlebih dahulu
async function handleSend(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  appendUserMessage(trimmed);
  chatInput.value = "";
  sendBtn.disabled = true;
  scrollToBottom();

  const typing = appendTypingIndicator();
  scrollToBottom();

  try {
    // 1. Ambil dokumen relevan dari backend dengan embedding dan pgvector
    const docs = await queryDocs(trimmed);

    // 2. Kirim langsung pertanyaan & dokumen ke Gemini 3.5 Flash Lite
    const reply = await generateGeminiReply(trimmed, docs);

    typing.remove();
    appendAiReply(reply);
  } catch (error) {
    typing.remove();
    console.error(error);
    appendAiReply("Maaf, terjadi kesalahan saat memproses request: " + error.message);
  } finally {
    sendBtn.disabled = false;
    scrollToBottom();
  }
}

// Ambil dokumen relevan dari backend query endpoint
async function queryDocs(question) {
  const response = await fetch('http://127.0.0.1:3000/query-docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Gagal melakukan query dokument');
  }

  return result.data || [];
}

// Ambil dokumen langsung tanpa RPC Vector (fallback)
async function fetchPdfDocuments() {
  if (!window.supabase) return [];
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabaseClient
    .from('pdf_documents')
    .select('pdf_name, content')
    .limit(10); // Mengambil 10 chunk dokumen terbaik

  if (error) return [];
  return data || [];
}

// Generate embedding dari pertanyaan menggunakan REST API text-embedding-004
// Generate embedding dari pertanyaan menggunakan REST API text-embedding-004 (Format Perbaikan)
async function generateQueryEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { 
        parts: [{ text }] 
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error("Gagal generate embedding: " + (result.error?.message || JSON.stringify(result)));
  }

  return result.embedding.values;
}

// Melakukan Similarity Search ke Supabase via RPC match_pdf_documents
async function fetchPdfDocumentsByVector(embeddingVector) {
    if (!window.supabase) {
        console.warn("Supabase JS SDK tidak terdeteksi di browser.");
        return [];
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Memanggil fungsi RPC pgvector di Supabase
    const { data, error } = await supabaseClient.rpc("match_pdf_documents", {
        query_embedding: embeddingVector,
        match_threshold: 0.3,
        match_count: 4
    });

    if (error) {
        console.error("Supabase vector search error:", error);
        // Fallback jika RPC gagal: ambil 3 baris teratas
        const fallback = await supabaseClient.from("pdf_documents").select("pdf_name, content").limit(3);
        return fallback.data || [];
    }

    return data || [];
}

function buildGeminiPrompt(question, docs) {
    const docContext = docs.length
        ? docs
            .map((doc, index) => `[Dokumen ${index + 1} - ${doc.pdf_name || "Tanpa Nama"}]:\n${doc.content}`)
            .join("\n\n---\n\n")
        : "Tidak ditemukan informasi dokumen yang cocok di database.";

    return `Anda adalah asisten AI yang menjawab pertanyaan pengguna HANYA berdasarkan konteks dokumen PDF berikut.

KONTEKS DOKUMEN:
${docContext}

PERTANYAAN PENGGUNA:
${question}

INSTRUKSI:
1. Jawablah pertanyaan dengan singkat, jelas, dan akurat berdasarkan konteks di atas.
2. Jika jawaban tidak tercantum di dokumen, beritahukan dengan sopan bahwa informasi tidak ada di dalam dokumen.`;
}

// Mengirim request ke Gemini API versi REST v1beta standar
async function generateGeminiReply(question, docs) {
    const prompt = buildGeminiPrompt(question, docs);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error?.message || "Gagal mendapatkan respon dari Gemini.");
    }

    return result.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini tidak mengembalikan teks jawaban.";
}

// Form submit handler
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSend(chatInput.value);
});

// Suggestion pill click handler
document.querySelectorAll(".suggestion-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
        handleSend(pill.textContent);
    });
});

// New Research button
document.getElementById("newResearchBtn").addEventListener("click", () => {
    chatInput.focus();
});