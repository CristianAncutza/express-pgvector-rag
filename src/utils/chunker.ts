interface ChunkOptions {
  chunkSize?: number;     // chars per block
  chunkOverlap?: number;  // shared chars between blocks
}

export function chunkText(
  text: string, 
  { chunkSize = 800, chunkOverlap = 100 }: ChunkOptions = {}
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex - chunkOverlap;
  }

  return chunks;
}