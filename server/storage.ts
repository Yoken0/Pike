import { type Document, type InsertDocument, type Message, type InsertMessage, type ChatSession, type InsertChatSession, type VectorChunk, type InsertVectorChunk } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Documents
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesBySession(sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Chat Sessions
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getAllChatSessions(): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;

  // Vector Chunks
  getVectorChunk(id: string): Promise<VectorChunk | undefined>;
  getVectorChunksByDocument(documentId: string): Promise<VectorChunk[]>;
  createVectorChunk(chunk: InsertVectorChunk): Promise<VectorChunk>;
  searchVectorChunks(embedding: number[], limit?: number): Promise<Array<VectorChunk & { similarity: number }>>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private messages: Map<string, Message>;
  private chatSessions: Map<string, ChatSession>;
  private vectorChunks: Map<string, VectorChunk>;

  constructor() {
    this.documents = new Map();
    this.messages = new Map();
    this.chatSessions = new Map();
    this.vectorChunks = new Map();
  }

  // Documents
  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: new Date(),
      processedAt: null,
      // Ensure required fields have defaults
      status: insertDocument.status || "processing",
      source: insertDocument.source || "upload",
      url: insertDocument.url || null,
      embedding: insertDocument.embedding || null,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updated = { ...document, ...updates };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      sources: insertMessage.sources || null,
    };
    this.messages.set(id, message);
    return message;
  }

  // Chat Sessions
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      title: insertSession.title || null,
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.chatSessions.set(id, updated);
    return updated;
  }

  // Vector Chunks
  async getVectorChunk(id: string): Promise<VectorChunk | undefined> {
    return this.vectorChunks.get(id);
  }

  async getVectorChunksByDocument(documentId: string): Promise<VectorChunk[]> {
    return Array.from(this.vectorChunks.values())
      .filter(chunk => chunk.documentId === documentId);
  }

  async createVectorChunk(insertChunk: InsertVectorChunk): Promise<VectorChunk> {
    const id = randomUUID();
    const chunk: VectorChunk = {
      ...insertChunk,
      id,
    };
    this.vectorChunks.set(id, chunk);
    return chunk;
  }

  async searchVectorChunks(embedding: number[], limit: number = 5): Promise<Array<VectorChunk & { similarity: number }>> {
    const chunks = Array.from(this.vectorChunks.values());
    
    // Calculate cosine similarity
    const similarities = chunks.map(chunk => {
      const chunkEmbedding = chunk.embedding as number[];
      if (!chunkEmbedding || chunkEmbedding.length !== embedding.length) {
        return { ...chunk, similarity: 0 };
      }
      
      const similarity = this.cosineSimilarity(embedding, chunkEmbedding);
      return { ...chunk, similarity };
    });

    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const storage = new MemStorage();
