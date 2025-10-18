import { storage } from "../storage";
import { generateEmbedding } from "./gemini";
import { searchWeb, scrapeWebContent } from "./webSearch";
import type { Document, InsertDocument } from "@shared/schema";
import * as mammoth from "mammoth";

export async function processUploadedFile(
  filename: string,
  content: Buffer,
  mimetype: string
): Promise<Document> {
  try {
    console.log(`Processing file: ${filename} (${mimetype}, ${content.length} bytes)`);
    
    // Extract text content based on file type
    let textContent = "";
    let fileType = "text";

    if (mimetype === "application/pdf") {
      fileType = "pdf";
      console.log("Extracting PDF content...");
      try {
        const pdfParse = await import("pdf-parse");
        const pdfData = await pdfParse.default(content);
        textContent = pdfData.text;
        console.log(`Extracted ${textContent.length} characters from PDF`);
        
        // Check if we got meaningful content
        if (!textContent.trim() || textContent.length < 10) {
          console.warn("PDF parsing returned empty or very short content, falling back to basic extraction");
          textContent = content.toString("utf-8");
        }
      } catch (error) {
        console.error("PDF parsing failed:", error);
        console.log("Falling back to basic text extraction for PDF");
        textContent = content.toString("utf-8");
      }
    } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
               mimetype === "application/msword") {
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
    } else if (mimetype.startsWith("text/")) {
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
      filename,
      content: textContent,
      fileType,
      size: content.length,
      status: "processing",
      source: "upload",
      url: null,
    });

    console.log(`Created document ${document.id}, starting background processing...`);

    // Process document in background (non-blocking)
    processDocumentEmbeddings(document.id, textContent).catch(error => {
      console.error(`Background processing failed for document ${document.id}:`, error);
    });

    return document;
  } catch (error) {
    console.error(`Failed to process file ${filename}:`, error);
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
    console.log(`Starting embedding processing for document ${documentId}`);
    
    // Split content into chunks
    const chunks = splitTextIntoChunks(content, 1000, 100); // Larger chunks (1000 chars) with 100 char overlap
    console.log(`Split document into ${chunks.length} chunks`);
    
    // Process chunks in parallel batches to avoid overwhelming the API
    const batchSize = 5; // Process 5 chunks at a time
    const batches = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }
    
    let processedChunks = 0;
    
    for (const batch of batches) {
      console.log(`Processing batch of ${batch.length} chunks (${processedChunks + 1}-${processedChunks + batch.length}/${chunks.length})`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk.text);
          
          await storage.createVectorChunk({
            documentId,
            content: chunk.text,
            embedding,
            startIndex: chunk.start,
            endIndex: chunk.end,
          });
          
          return true;
        } catch (error) {
          console.error(`Failed to process chunk for document ${documentId}:`, error);
          return false;
        }
      });
      
      const results = await Promise.all(batchPromises);
      const successCount = results.filter(Boolean).length;
      processedChunks += batch.length;
      
      console.log(`Batch completed: ${successCount}/${batch.length} chunks processed successfully`);
      
      // Small delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mark document as processed
    await storage.updateDocument(documentId, {
      status: "processed",
      processedAt: new Date(),
    });

    console.log(`Successfully processed document ${documentId} with ${processedChunks} chunks`);
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
