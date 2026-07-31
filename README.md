# RAG Engine & Vector Search Service

A backend **RAG (Retrieval-Augmented Generation)** engine built with **Node.js, TypeScript, and Express**, integrated with **PostgreSQL (pgvector)** and **Google Gemini** models via the **Vercel AI SDK**.

It supports multi-format document ingestion (PDF, TXT, JSON), intelligent text fragmenting (*chunking*), 768-dimensional vector embedding storage, and a real-time streaming chat endpoint with conversational memory.

---

## Tech Stack

* **Runtime & Language:** Node.js, TypeScript
* **Web Framework:** Express.js
* **Vector Database:** PostgreSQL + `pgvector` Extension
* **AI Models:** Google Gemini API (`gemini-2.0-flash-lite` / `text-embedding-004`)
* **AI Orchestration:** Vercel AI SDK (`ai`, `@ai-sdk/google`)
* **File Processing:** `multer`, `pdf-parse`

---

## System Architecture


```

[ Document / PDF / TXT ]
│
▼

1. Text Extraction      ──► (pdf-parse / text)
│
▼
2. Chunking Strategy    ──► Text fragmenting with overlap (800 chars)
│
▼
3. Embedding Generation ──► Google Embeddings (768 dimensions)
│
▼
4. DB Storage           ──► PostgreSQL with pgvector (HNSW / Cosine Similarity)
│
▼
5. RAG Chat Stream      ──► Score threshold filter (>0.60) + Session history

```

---

## Key Features

* **Multi-Format Ingestion:** Load documents via raw JSON payloads or direct PDF/TXT file uploads.
* **Smart Chunking:** Splits text into optimized blocks to prevent loss of semantic context.
* **Similarity Vector Search:** Queries pgvector using cosine distance with relevance score thresholding.
* **Conversational Memory:** Persists chat history by `session_id` in PostgreSQL.
* **Streaming Responses:** Utilizes `streamText` to deliver Gemini's response to the client in real time.

---

## Environment Setup

### 1. Prerequisites
* Node.js v18+ installed.
* PostgreSQL instance with the `pgvector` extension enabled.
* Google AI Studio API Key.

### 2. Environment Variables (`.env`)

Create a `.env` file in the project root:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/your_database
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

```

### 3. Database Configuration

Run the following SQL statements in your PostgreSQL database:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store documents and vector embeddings
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for conversational chat memory
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

```

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone [https://github.com/CristianAncutza/express-pgvector-rag.git](https://github.com/CristianAncutza/express-pgvector-rag.git)
cd express-pgvector-rag

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev

```

The server will start at `http://localhost:3000`.

---

## API Endpoints

### 1. Text / JSON Ingestion (`POST /api/ingest`)

Inserts raw text directly into the database.

* **Body:**

```json
{
  "content": "Customer support phone hours are Monday through Friday from 9:00 AM to 6:00 PM.",
  "metadata": { "category": "info" }
}

```

---

### 2. File Ingestion (`POST /api/upload`)

Uploads `.pdf` or `.txt` files.

* **Content-Type:** `multipart/form-data`
* **Body:**
* `file`: [Select a PDF or TXT file]



---

### 3. RAG Chat with Streaming (`POST /api/chat`)

Queries stored context and maintains session conversational history.

* **Body:**

```json
{
  "sessionId": "user-session-123",
  "question": "What are the phone support operating hours?"
}

```

* **Response:** Plain text stream (`text/plain`).

---

