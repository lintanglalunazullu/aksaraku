lucide.createIcons();

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const chatThread = document.getElementById("chatThread");
const threadInner = chatThread.querySelector(".max-w-3xl");

const BACKEND_CHAT_URL = "https://aksaraku-api-one.vercel.app/chat";

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

function truncateText(text, maxChars = 320) {
    if (!text) return "";
    return text.length <= maxChars ? text : `${text.slice(0, maxChars).trim()}…`;
}

function createSourcesHtml(sources) {
    if (!Array.isArray(sources) || sources.length === 0) {
        return `<p class="text-sm text-[#9CA3AF]">Tidak ada dokumen relevan ditemukan.</p>`;
    }

    return sources
        .map((source) => {
            const fileName = source.pdf_name || source.file_name || "Nama dokumen tidak tersedia";
            const accuracy = source.akurasi != null ? `Akurasi: ${source.akurasi}` : "";
            const snippet = truncateText(source.content || source.snippet || "Tidak ada cuplikan tersedia.");

            return `
                <div class="rounded-xl border border-white/10 bg-[#111827] p-4 space-y-2">
                    <div class="flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
                        <span class="font-semibold text-white">File: ${fileName}</span>
                        <span>${accuracy}</span>
                    </div>
                    <p class="text-xs text-[#9CA3AF] leading-relaxed">${snippet}</p>
                </div>
            `;
        })
        .join("");
}

function appendAiReplyWithSources(answer, sources) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-start gap-3 animate-fadeUp";
    wrapper.innerHTML = `
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-900/30">
        <i data-lucide="book-open" class="w-4.5 h-4.5 text-white"></i>
      </div>
      <div class="bg-bubbleAi border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3.5 max-w-[85%] space-y-4">
        <div>
          <p class="text-sm leading-relaxed text-[#F3F4F6] whitespace-pre-wrap"></p>
        </div>
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Sumber dokumen</p>
          <div class="grid gap-3">${createSourcesHtml(sources)}</div>
        </div>
      </div>
    `;

    wrapper.querySelector("p").textContent = answer;
    threadInner.appendChild(wrapper);
    lucide.createIcons();
    return wrapper;
}

async function fetchChatResponse(question) {
    const response = await fetch(BACKEND_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || "Gagal memanggil endpoint /chat");
    }

    const payload = Array.isArray(result) ? result[0] : result;
    if (!payload || typeof payload.answer !== "string") {
        throw new Error("Respons API tidak valid atau kosong.");
    }

    return {
        answer: payload.answer,
        sources: Array.isArray(payload.sources) ? payload.sources : [],
    };
}

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
    const { answer, sources } = await fetchChatResponse(trimmed);
    typing.remove();
    appendAiReplyWithSources(answer, sources);
  } catch (error) {
    typing.remove();
    console.error(error);
    appendAiReply("Maaf, terjadi kesalahan saat memproses request: " + (error.message || "Unknown error"));
  } finally {
    sendBtn.disabled = false;
    scrollToBottom();
  }
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