import { PDFParse } from 'pdf-parse';

export async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const mimeType = file.mimetype;

  // For files (.txt, .md, .json)
  if (mimeType === 'text/plain' || mimeType.includes('text/')) {
    return file.buffer.toString('utf-8');
  }

  // For PDF files
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const data = await parser.getText();
      return data.text;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`File format not supported: ${mimeType}`);
}