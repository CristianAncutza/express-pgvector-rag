import { google } from '@ai-sdk/google';
import { embed, streamText } from 'ai';
// @ts-expect-error No declaration file for ../db.js
import { pool } from '../db.js';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
const chatModel = google('gemini-2.0-flash-lite');

interface DocumentRow {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
  created_at: Date;
}

//Obtains google embedding and truncates it to 768 dimensions
async function getEmbedding768(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  
  return embedding.slice(0, 768);
}

export async function ingestDocument(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<DocumentRow> {
  const embedding = await getEmbedding768(content);
  const vectorString = `[${embedding.join(',')}]`;

  const query = `
    INSERT INTO documents (content, metadata, embedding)
    VALUES ($1, $2, $3::vector)
    RETURNING id, content, created_at;
  `;

  const result = await pool.query(query, [content, JSON.stringify(metadata), vectorString]);
  return result.rows[0];
}

async function searchSimilarDocuments(userQuery: string, limit = 3): Promise<DocumentRow[]> {
  const embedding = await getEmbedding768(userQuery);
  const vectorString = `[${embedding.join(',')}]`;
 
  const query = `
    SELECT content, metadata, 1 - (embedding <=> $1::vector) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> $1::vector) >= 0.60
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2;
  `;

  const result = await pool.query(query, [vectorString, limit]);
  return result.rows;
}

// Interfaces to manage history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// obtains last messages of session
async function getChatHistory(sessionId: string, limit = 6): Promise<ChatMessage[]> {
  const query = `
    SELECT role, content 
    FROM chat_messages 
    WHERE session_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2;
  `;
  const result = await pool.query(query, [sessionId, limit]);
  return result.rows.reverse(); 
}

// saves individual message
async function saveChatMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  const query = `
    INSERT INTO chat_messages (session_id, role, content)
    VALUES ($1, $2, $3);
  `;
  await pool.query(query, [sessionId, role, content]);
}

export async function answerQuestionStream(question: string, sessionId: string) {
  // saves user response in db
  await saveChatMessage(sessionId, 'user', question);

  // gets previous history and searches documents
  const history = await getChatHistory(sessionId);
  const relevantDocs = await searchSimilarDocuments(question, 3);

  const contextText = relevantDocs
    .map((doc, idx) => `[Document ${idx + 1}]:\n${doc.content}`)
    .join('\n\n');

  const systemPrompt = `
    You are a helpful and accurate AI assistant.
    Answer the user's question based on the provided context and conversation history.
    If the answer cannot be deduced from the context, state clearly that you do not have that information.

    --- RETRIEVED CONTEXT FROM DATABASE ---
    ${contextText || 'No relevant context found.'}
    ----------------------------------------
  `;

  // maps history to compatible format with SDK Vercel AI
  const messages = [
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
  ];

  return streamText({
    model: chatModel,
    system: systemPrompt,
    messages: messages,
    onFinish: async (event) => {
      // saves Gemini response in Postgres
      await saveChatMessage(sessionId, 'assistant', event.text);
    },
  });
}