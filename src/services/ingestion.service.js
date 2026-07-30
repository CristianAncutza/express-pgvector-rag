import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import { pool } from '../db.js';

// Model configuration for embeddings
const embeddingModel = google.textEmbeddingModel('text-embedding-004');

export async function ingestDocument(content, metadata = {}) {
  // Generate the vector embedding using Vercel AI SDK
  const { embedding } = await embed({
    model: embeddingModel,
    value: content,
  });

  // Format embedding array as PostgreSQL vector literal string format: '[0.1, 0.2, ...]'
  const vectorString = `[${embedding.join(',')}]`;

  // Insert into pgvector
  const query = `
    INSERT INTO documents (content, metadata, embedding)
    VALUES ($1, $2, $3::vector)
    RETURNING id, content, created_at;
  `;

  const result = await pool.query(query, [content, JSON.stringify(metadata), vectorString]);
  return result.rows[0];
}