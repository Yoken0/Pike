import { storage } from "../storage";
import { generateEmbedding } from "./openai";
import type { VectorChunk, Document } from "@shared/schema";

export interface SearchResult {
  chunk: VectorChunk;
  document: Document;
  similarity: number;
}

export async function searchKnowledgeBase(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search vector chunks
    const chunks = await storage.searchVectorChunks(queryEmbedding, limit * 2); // Get more to filter
    
    // Get corresponding documents
    const results: SearchResult[] = [];
    const seenDocuments = new Set<string>();
    
    for (const chunk of chunks) {
      // Skip if we already have a result from this document (to diversify results)
      if (seenDocuments.has(chunk.documentId) && results.length > 0) {
        continue;
      }
      
      const document = await storage.getDocument(chunk.documentId);
      if (document && document.status === "processed") {
        results.push({
          chunk,
          document,
          similarity: chunk.similarity,
        });
        seenDocuments.add(chunk.documentId);
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  } catch (error) {
    console.error("Vector search error:", error);
    return [];
  }
}

export function formatContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "";
  }
  
  let context = "Relevant information from knowledge base:\n\n";
  
  results.forEach((result, index) => {
    context += `[${index + 1}] From "${result.document.filename}":\n`;
    context += `${result.chunk.content}\n\n`;
  });
  
  return context;
}

export function extractSourcesFromResults(results: SearchResult[]) {
  return results.map(result => ({
    documentId: result.document.id,
    filename: result.document.filename,
    relevance: Math.round(result.similarity * 100),
    fileType: result.document.fileType,
    url: result.document.url,
  }));
}
