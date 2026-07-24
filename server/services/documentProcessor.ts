import { storage } from "../storage";
import { generateEmbeddings } from "./gemini";
import { searchWeb, scrapeWebContent } from "./webSearch";
import type { Document } from "@shared/schema";
import * as mammoth from "mammoth";
import { createHash } from "crypto";

const EMBEDDING_BATCH_SIZE = 20;
const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 180;

export async function processUploadedFile(
  filename: string,
  content: Buffer,
  mimetype: string,
  ownerId: string,
): Promise<Document> {
  try {
    console.log(`Processing file: ${filename} (${mimetype}, ${content.length} bytes)`);
    const contentHash = createHash("sha256").update(content).digest("hex");
    const existingDocument = await storage.getDocumentByHash(ownerId, contentHash);
    if (existingDocument && existingDocument.status !== "failed") {
      return existingDocument;
    }
    if (existingDocument) {
      await storage.deleteDocument(existingDocument.id, ownerId);
    }
    
    // Extract text content based on file type
    let textContent = "";
    let fileType = "text";

    const lowerFilename = filename.toLowerCase();
    if (mimetype === "application/pdf" || lowerFilename.endsWith(".pdf")) {
      fileType = "pdf";
      console.log("Extracting PDF content...");
      try {
        const pdfParse = await import("pdf-parse");
        const pdfData = await pdfParse.default(content);
        textContent = pdfData.text;
        console.log(`Extracted ${textContent.length} characters from PDF`);
        
        if (!textContent.trim() || textContent.length < 10) {
          throw new Error("PDF contains no extractable text");
        }
      } catch (error) {
        console.error("PDF parsing failed:", error);
        throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
               mimetype === "application/msword" || lowerFilename.endsWith(".docx") || lowerFilename.endsWith(".doc")) {
      fileType = "docx";
      console.log("Extracting DOCX content...");
      try {
        const result = await mammoth.extractRawText({ buffer: content });
        textContent = result.value;
        console.log(`Extracted ${textContent.length} characters from DOCX`);
      } catch (error) {
        console.error("DOCX parsing failed:", error);
        throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (mimetype.startsWith("text/") || lowerFilename.endsWith(".txt") || lowerFilename.endsWith(".md")) {
      fileType = "text";
      textContent = content.toString("utf-8");
      console.log(`Extracted ${textContent.length} characters from text file`);
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    if (!textContent.trim()) {
      throw new Error("No text content could be extracted from the file");
    }

    // Create document record
    const document = await storage.createDocument({
      ownerId,
      filename,
      content: textContent,
      fileType,
      size: content.length,
      status: "processing",
      source: "upload",
      url: null,
      contentHash,
    });

    console.log(`Created document ${document.id}, starting background processing...`);

    // Process document in background (non-blocking)
    processDocumentEmbeddings(document.id, textContent, ownerId).catch(error => {
      console.error(`Background processing failed for document ${document.id}:`, error);
    });

    return document;
  } catch (error) {
    console.error(`Failed to process file ${filename}:`, error);
    throw new Error(`Failed to process file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function processWebDocument(url: string, title: string, ownerId: string): Promise<Document> {
  try {
    // Create document record
    const document = await storage.createDocument({
      ownerId,
      filename: title,
      content: "Processing...",
      fileType: "web",
      size: 0,
      status: "processing",
      source: "web_search",
      url,
      contentHash: null,
    });

    // Scrape content in background
    scrapeAndProcessDocument(document.id, url, ownerId);

    return document;
  } catch (error) {
    throw new Error(`Failed to process web document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function scrapeAndProcessDocument(documentId: string, url: string, ownerId: string): Promise<void> {
  try {
    const content = await scrapeWebContent(url);
    
    // Update document with scraped content
    await storage.updateDocument(documentId, {
      content,
      size: content.length,
    });

    // Process embeddings
    await processDocumentEmbeddings(documentId, content, ownerId);
  } catch (error) {
    console.error(`Failed to scrape document ${documentId}:`, error);
    await storage.updateDocument(documentId, {
      status: "failed",
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function processDocumentEmbeddings(documentId: string, content: string, ownerId: string): Promise<void> {
  try {
    console.log(`Starting embedding processing for document ${documentId}`);
    
    const chunks = splitTextIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Split document into ${chunks.length} chunks`);

    let processedChunks = 0;

    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      console.log(`Embedding chunks ${start + 1}-${start + batch.length}/${chunks.length}`);
      const embeddings = await generateEmbeddings(batch.map(chunk => chunk.text), ownerId);

      if (embeddings.length !== batch.length) {
        throw new Error(`Embedding service returned ${embeddings.length} results for ${batch.length} chunks`);
      }

      await Promise.all(batch.map((chunk, index) => {
        const embedding = embeddings[index];
        if (!embedding?.length) throw new Error(`No embedding returned for chunk ${start + index + 1}`);
        return storage.createVectorChunk({
            documentId,
            content: chunk.text,
            embedding,
            startIndex: chunk.start,
            endIndex: chunk.end,
        });
      }));
      processedChunks += batch.length;
    }

    // Mark document as processed
    await storage.updateDocument(documentId, {
      status: "processed",
      processedAt: new Date(),
    });

    console.log(`Successfully processed document ${documentId} with ${processedChunks} chunks`);
  } catch (error) {
    console.error(`Failed to process embeddings for document ${documentId}:`, error);
    await storage.deleteVectorChunksByDocument(documentId);
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

export async function autoAcquireDocuments(query: string, ownerId: string): Promise<Document[]> {
  try {
    // Search web for relevant documents
    const searchResults = await searchWeb(query, 3);
    
    const documents: Document[] = [];
    
    for (const result of searchResults) {
      try {
        const document = await processWebDocument(result.url, result.title, ownerId);
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
