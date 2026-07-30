import pdfParse from 'pdf-parse';

export async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const mimeType = file.mimetype;

  // For files (.txt, .md, .json)
  if (mimeType === 'text/plain' || mimeType.includes('text/')) {
    return file.buffer.toString('utf-8');
  }

  // For PDF files
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  throw new Error(`File format not supported: ${mimeType}`);
}