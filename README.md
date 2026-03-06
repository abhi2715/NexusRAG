# ⚡ NexusRAG

An intelligent document chat app powered by **Groq + Llama 3.3 70B**. Upload PDFs, Word docs, or CSVs and ask questions with pinpoint accuracy.

![NexusRAG](https://img.shields.io/badge/powered%20by-Groq%20%2B%20Llama%203.3-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)

---

## ✨ Features

- 📄 Upload **PDF, DOCX, CSV, TXT** files (up to 30MB)
- 🔍 NLP chunking + semantic retrieval (RAG)
- ⚡ Powered by **Groq's ultra-fast inference** (Llama 3.3 70B)
- 💬 Cited responses with source chips
- 🗂️ Persistent chat history (localStorage)
- 🗑️ Delete individual chats with confirmation
- 🖱️ Custom animated cursor with hover effects
- 🌑 Dark theme with smooth animations

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/nexusrag.git
cd nexusrag
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and add your Groq API key:
```
REACT_APP_GROQ_API_KEY=your_groq_api_key_here
REACT_APP_GROQ_MODEL=llama-3.3-70b-versatile
```
Get a free Groq API key at → https://console.groq.com

### 4. Run locally
```bash
npm start
```
Opens at http://localhost:3000

### 5. Build for production
```bash
npm run build
```

---

## 📁 Project Structure

```
nexusrag/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── NexusRAG.jsx      # Main app orchestrator
│   │   ├── Sidebar.jsx       # Left sidebar (upload + history)
│   │   ├── ChatArea.jsx      # Messages + input
│   │   ├── MsgBubble.jsx     # Individual message component
│   │   ├── HistoryItem.jsx   # Chat history row with delete
│   │   ├── Cursor.jsx        # Custom animated cursor
│   │   └── MD.jsx            # Markdown renderer
│   ├── hooks/
│   │   ├── useSessions.js    # Chat session state + persistence
│   │   └── useDocs.js        # File upload + processing state
│   ├── utils/
│   │   ├── extractors.js     # PDF / DOCX / CSV / TXT parsers
│   │   ├── nlp.js            # Text chunking + retrieval scoring
│   │   ├── groq.js           # Groq API client
│   │   ├── storage.js        # localStorage helpers
│   │   └── format.js         # Date / size / type formatters
│   ├── styles/
│   │   └── tokens.js         # Design tokens (colors, file colors)
│   ├── App.jsx
│   └── index.js
├── .env                      # Your API keys (not committed)
├── .env.example              # Template for others
├── .gitignore
└── package.json
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `REACT_APP_GROQ_API_KEY` | Your Groq API key |
| `REACT_APP_GROQ_MODEL` | Model to use (default: `llama-3.3-70b-versatile`) |

---

## 🌐 Deploy to Vercel

```bash
npm install -g vercel
vercel
```
Set environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## 📝 License

MIT
