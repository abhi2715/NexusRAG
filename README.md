# ⚡ NexusRAG

**Chat with your documents.** Upload PDFs, Word docs, spreadsheets, Markdown, JSON, HTML or code, ask questions, and get **streaming answers with clickable citations** that link to the exact page and passage. It runs entirely in your browser and uses [Groq](https://groq.com) for fast inference.

![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Groq](https://img.shields.io/badge/LLM-Groq-f55036?style=flat-square)
![Local-first](https://img.shields.io/badge/storage-local--first-34d27e?style=flat-square)

---

## ✨ Features

### Retrieval & answers
- **BM25 retrieval** with stemming, phrase boosting and conversational query expansion (follow-ups like "what about the second one?" still find the right passages)
- **Sentence-aware chunking** that keeps PDF page numbers, so citations say *which page*
- **Inline citations** `[1]` `[2]`: click one to open the source passage, highlighted in the document viewer
- **Overview mode**: "summarize this" questions sample evenly across every document instead of keyword-matching
- **Exact spreadsheet stats**: CSV columns are pre-aggregated (sum, mean, median, min/max, top values), so totals come out right
- **Streaming responses** with a stop button, tokens/sec and latency stats
- **Suggested follow-up questions** after every answer
- **Auto-generated chat titles**

### Documents
- PDF (via pdf.js), **DOCX (via mammoth)**, CSV/TSV, Markdown, JSON, HTML, TXT and 25+ code file types, up to 50 MB each
- **Drop files anywhere** on the window, paste files into the message box, or **paste raw text** as a document
- **Persistent document library** in IndexedDB that survives reloads
- **Toggle documents in or out of context** per question
- **Document viewer** with stats, an AI summary, starter questions and full-text search across passages

### Chat experience
- Full **Markdown with GFM**: tables, task lists, syntax-highlighted code blocks with copy buttons
- **Edit & resend** any message, **regenerate** answers, **copy**, **read aloud** (text-to-speech)
- **Voice input** (Web Speech API)
- **Pin, rename, search** (titles *and* message content) and date-grouped history
- **Export** chats as Markdown or JSON; **backup/restore** all chats

### App
- **⌘K command palette**, full keyboard shortcuts (press `?`)
- **Dark / light / system themes**
- **Model picker** that lists the models live from your Groq account
- **Settings**: temperature, max tokens, top-K, context budget, conversation memory, custom instructions
- Mobile-first responsive layout, PWA manifest, reduced-motion support, accessible dialogs

---

## 🚀 Quick start

```bash
git clone https://github.com/abhi2715/NexusRAG.git
cd NexusRAG
npm install
npm start          # http://localhost:3000
```

Open **Settings → General** and paste a free Groq API key from [console.groq.com/keys](https://console.groq.com/keys). The key is stored only in your browser's localStorage and is only sent to `api.groq.com`.

### Using a server-side key (no per-user key needed)
When deployed on Vercel, the app includes a serverless proxy (`api/groq.js`) that adds your key **on the server**. Set it in **Vercel → Project → Settings → Environment Variables**:

| Name | Value |
|---|---|
| `GROQ_API_KEY` | your Groq key |

> ⚠️ Use exactly `GROQ_API_KEY`, **not** `REACT_APP_GROQ_API_KEY`. Anything prefixed `REACT_APP_` is compiled into the public JavaScript bundle and visible to every visitor.

The app detects the server key automatically. A key entered in Settings still overrides it. The proxy only allows chat and model-list calls from your own site's origin and caps `max_tokens`. Anyone who can open your site can still chat on your key, so watch your usage in the Groq console. To test the proxy locally, run `vercel dev` instead of `npm start`.

### Production build
```bash
npm run build
```

---

## ⌨️ Shortcuts

| Keys | Action |
|---|---|
| `⌘/Ctrl K` | Command palette & chat search |
| `⌘/Ctrl ⇧ O` | New chat |
| `⌘/Ctrl U` | Upload documents |
| `⌘/Ctrl B` | Toggle sidebar |
| `⌘/Ctrl ,` | Settings |
| `/` | Focus the message box |
| `Esc` | Stop generating / close dialogs |
| `?` | Show all shortcuts |

---

## 🧠 How it works

```
File ──► extract (pdf.js / mammoth / CSV parser) ──► sentence chunks (+page numbers)
                                                        │
Question (+ previous question) ──► BM25 ranking ◄───────┘   (IndexedDB-persisted)
          │
          ▼
 numbered passages [1..k] within a context budget ──► Groq (streaming) ──► answer with [n] citations
                                                                         └──► titles & follow-ups (JSON mode)
```

Everything except the LLM call runs locally. Apart from the optional key proxy there's no backend, and chats and documents never leave your device except as context sent to Groq.

---

## 📁 Project structure

```
api/
└── groq.js               # Vercel Edge Function: keeps GROQ_API_KEY server-side
src/
├── components/
│   ├── NexusRAG.jsx        # App orchestrator: RAG pipeline, shortcuts, modals
│   ├── Sidebar.jsx         # Document library + chat history
│   ├── ChatArea.jsx        # Top bar, message list, auto-scroll
│   ├── Composer.jsx        # Input, voice, attachments, model picker
│   ├── MsgBubble.jsx       # Message with actions, citations, stats, follow-ups
│   ├── MD.jsx              # Markdown (GFM + highlighting + citation links)
│   ├── DocPreview.jsx      # Document / source viewer drawer
│   ├── SettingsModal.jsx   # Settings tabs
│   ├── CommandPalette.jsx  # ⌘K palette
│   ├── EmptyState.jsx, Modal.jsx, Menu.jsx, Toasts.jsx, Cursor.jsx
├── hooks/
│   ├── useSessions.js      # Chats in IndexedDB (migrates v1 localStorage data)
│   ├── useDocs.js          # Ingestion + document library
│   ├── useSettings.js      # Settings + theme
│   ├── useSpeech.js        # Voice input & read-aloud
│   └── useMediaQuery.js
├── utils/
│   ├── extractors.js       # PDF / DOCX / CSV / JSON / HTML extraction
│   ├── nlp.js              # Chunking + BM25 retrieval + context building
│   ├── groq.js             # Streaming client, JSON mode, model list
│   ├── db.js               # IndexedDB wrapper
│   ├── settings.js, exporters.js, format.js
└── styles/
    ├── app.css             # Theme tokens (dark/light) + all styles
    └── tokens.js           # File-type colors
```

---

## 🌐 Deploy

**Vercel (recommended):** import the repo, keep the Create React App preset, add `GROQ_API_KEY` under Environment Variables, and deploy. The `api/` folder deploys as an Edge Function automatically.

Other static hosts (Netlify, GitHub Pages) work too via `npm run build`, but without the proxy each user has to enter their own key in Settings.

## 📝 License

MIT
