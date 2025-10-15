import { storage } from "../storage";
import { generateEmbedding } from "./gemini";
import { searchWeb, scrapeWebContent } from "./webSearch";
import type { Document, InsertDocument } from "@shared/schema";

export async function processUploadedFile(
  filename: string,
  content: Buffer,
  mimetype: string
): Promise<Document> {
  try {
    // Convert buffer to text based on file type
    let textContent = "";
    let fileType = "text";

    if (mimetype === "application/pdf") {
      fileType = "pdf";
      // For demo purposes, assume PDF content is extracted
      textContent = content.toString("utf-8");
    } else if (mimetype.startsWith("text/")) {
      fileType = "text";
      textContent = content.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    // Create document record
    const document = await storage.createDocument({
      filename,
      content: textContent,
      fileType,
      size: content.length,
      status: "processing",
      source: "upload",
      url: null,
    });

    // Process document in background
    processDocumentEmbeddings(document.id, textContent);

    return document;
  } catch (error) {
    throw new Error(`Failed to process file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function processWebDocument(url: string, title: string): Promise<Document> {
  try {
    // Create document record
    const document = await storage.createDocument({
      filename: title,
      content: "Processing...",
      fileType: "web",
      size: 0,
      status: "processing",
      source: "web_search",
      url,
    });

    // Scrape content in background
    scrapeAndProcessDocument(document.id, url);

    return document;
  } catch (error) {
    throw new Error(`Failed to process web document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function scrapeAndProcessDocument(documentId: string, url: string): Promise<void> {
  try {
    const content = await scrapeWebContent(url);
    
    // Update document with scraped content
    await storage.updateDocument(documentId, {
      content,
      size: content.length,
    });

    // Process embeddings
    await processDocumentEmbeddings(documentId, content);
  } catch (error) {
    console.error(`Failed to scrape document ${documentId}:`, error);
    await storage.updateDocument(documentId, {
      status: "failed",
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function processDocumentEmbeddings(documentId: string, content: string): Promise<void> {
  try {
    // Split content into chunks
    const chunks = splitTextIntoChunks(content, 500, 50); // 500 chars with 50 char overlap
    
    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.text);
        
        await storage.createVectorChunk({
          documentId,
          content: chunk.text,
          embedding,
          startIndex: chunk.start,
          endIndex: chunk.end,
        });
      } catch (error) {
        console.error(`Failed to process chunk for document ${documentId}:`, error);
      }
    }

    // Mark document as processed
    await storage.updateDocument(documentId, {
      status: "processed",
      processedAt: new Date(),
    });

    console.log(`Successfully processed document ${documentId} with ${chunks.length} chunks`);
  } catch (error) {
    console.error(`Failed to process embeddings for document ${documentId}:`, error);
    await storage.updateDocument(documentId, {
      status: "failed",
    });
  }
}

interface TextChunk {
  text: string;
  start: number;
  end: number;
}

function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.slice(start, end);
    
    chunks.push({
      text: chunkText.trim(),
      start,
      end,
    });

    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.text.length > 0);
}

export async function autoAcquireDocuments(query: string): Promise<Document[]> {
  try {
    // Search web for relevant documents
    const searchResults = await searchWeb(query, 3);
    
    const documents: Document[] = [];
    
    for (const result of searchResults) {
      try {
        const document = await processWebDocument(result.url, result.title);
        documents.push(document);
      } catch (error) {
        console.error(`Failed to process search result ${result.url}:`, error);
      }
    }

    return documents;
  } catch (error) {
    console.error("Failed to auto-acquire documents:", error);
    return [];
  }
}
