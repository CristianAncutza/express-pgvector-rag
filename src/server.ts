import express from 'express';
import dotenv from 'dotenv';
// @ts-expect-error Local JS module has no TypeScript declaration file.
import { initDb } from './db.js';
import { ingestDocument, answerQuestionStream } from './services/rag.service.js';
import multer from 'multer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

type StreamableResult = {
  pipeTextStreamToResponse: (res: express.Response) => void;
};

app.use(express.json());

// Ingests document into vector storage
app.post('/api/ingest', async (req, res) => {
  try {
    const { content, metadata } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Field "content" is required and must be a string.' });
    }

    const document = await ingestDocument(content, metadata);
    return res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('Ingestion error:', error);
    return res.status(500).json({ error: 'Failed to process and ingest document.' });
  }
});

//  RAG Chat with Streaming response
app.post('/api/chat', async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Field "question" is required.' });
    }

    const currentSessionId = sessionId || 'default-session';

    const result = await answerQuestionStream(question, currentSessionId);
        
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // Uses update method pipeTextStreamToResponse
    result.pipeTextStreamToResponse(res);
  } catch (error: any) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({ error: 'Error processing request.' });
  }
});

async function bootstrap() {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});


// New endpoint to process file ingest
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded in "file".' });
    }

    // extracts text from file
    const extractedText = await extractTextFromFile(req.file);

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'The file is empty.' });
    }

    // ingest text with chunking
    const metadata = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
    };

    const insertedChunks = await ingestDocument(extractedText, metadata);

    return res.status(201).json({
      message: 'File processed successfully.',
      filename: req.file.originalname,
      totalChunks: insertedChunks.length,
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return res.status(500).json({ error: error.message || 'Error processing file.' });
  }
});

bootstrap();