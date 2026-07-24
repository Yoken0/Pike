import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { AI_MODEL, generateChatResponse } from "./services/gemini";
import { AiQuotaError, assertAiQuotaAvailable, getAiQuota } from "./services/aiQuota";
import { searchKnowledgeBase, formatContextFromResults, extractSourcesFromResults } from "./services/vectorStore";
import { processUploadedFile, autoAcquireDocuments } from "./services/documentProcessor";
import { getUserId } from "./services/userIdentity";

function withoutOwnerId<T extends { ownerId: string }>(record: T): Omit<T, "ownerId"> {
  const { ownerId: _ownerId, ...publicRecord } = record;
  return publicRecord;
}

// Configure multer for file uploads with optimized settings
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow one file at a time
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
      'text/plain', 
      'application/pdf', 
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    const allowedExtensions = ['.pdf', '.txt', '.docx', '.md', '.doc'];
    
    const hasValidMime = allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/');
    const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
    
    if (hasValidMime || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type') as any, false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const documents = await storage.getAllDocuments(userId);
      res.json(documents.map(withoutOwnerId));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Upload document
  app.post("/api/documents/upload", upload.single('file'), async (req: Request, res) => {
    try {
      const userId = getUserId(req, res);
      console.log('Upload request received');
      console.log('req.file:', req.file);
      console.log('req.body:', req.body);
      console.log('Content-Type:', req.headers['content-type']);
      
      if (!req.file) {
        console.log('No file found in request');
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log('Processing file:', req.file.originalname, req.file.size, req.file.mimetype);
      const document = await processUploadedFile(
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype,
        userId,
      );

      res.json(withoutOwnerId(document));
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Auto-acquire documents
  app.post("/api/documents/auto-acquire", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const documents = await autoAcquireDocuments(query, userId);
      res.json(documents.map(withoutOwnerId));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const { id } = req.params;
      const success = await storage.deleteDocument(id, userId);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Document not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get all chat sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const sessions = await storage.getAllChatSessions(userId);
      res.json(sessions.map(withoutOwnerId));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Create new chat session
  app.post("/api/sessions", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const sessionData = insertChatSessionSchema.parse({ ...req.body, ownerId: userId });
      const session = await storage.createChatSession(sessionData);
      res.json(withoutOwnerId(session));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get messages for a session
  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const { sessionId } = req.params;
      const session = await storage.getChatSession(sessionId);
      if (session && session.ownerId !== userId) return res.status(404).json({ error: "Session not found" });
      const messages = await storage.getMessagesBySession(sessionId, userId);
      res.json(messages.map(withoutOwnerId));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Send message (chat)
  app.post("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      assertAiQuotaAvailable(userId);
      const { sessionId } = req.params;
      const existingSession = await storage.getChatSession(sessionId);
      if (existingSession && existingSession.ownerId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (!existingSession) {
        await storage.createChatSession({ ownerId: userId, title: null }, sessionId);
      }
      const messageData = insertMessageSchema.parse({
        ...req.body,
        sessionId,
        ownerId: userId,
      });

      // Save user message
      const userMessage = await storage.createMessage(messageData);

      // Search knowledge base for relevant context
      const searchResults = await searchKnowledgeBase(messageData.content, userId);
      const context = formatContextFromResults(searchResults);
      const sources = extractSourcesFromResults(searchResults);

      // Get conversation history
      const history = await storage.getMessagesBySession(sessionId, userId);
      const chatMessages = history
        .filter(msg => msg.role !== 'system')
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Generate AI response
      const aiResponse = await generateChatResponse(chatMessages, userId, context);

      // Save assistant message
      const assistantMessage = await storage.createMessage({
        content: aiResponse.content,
        role: "assistant",
        sessionId,
        ownerId: userId,
        sources: sources.length > 0 ? sources : null,
      });

      // Update session last message time
      await storage.updateChatSession(sessionId, {
        lastMessageAt: new Date(),
      });

      res.json({
        userMessage: withoutOwnerId(userMessage),
        assistantMessage: withoutOwnerId(assistantMessage),
        sources,
      });
    } catch (error) {
      if (error instanceof AiQuotaError) {
        res.setHeader("Retry-After", error.retryAfterSeconds);
        const userId = getUserId(req, res);
        return res.status(429).json({ error: error.message, quota: getAiQuota(userId) });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Search knowledge base
  app.post("/api/search", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const { query, limit = 5 } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const results = await searchKnowledgeBase(query, userId, limit);
      res.json(results.map(result => ({ ...result, document: withoutOwnerId(result.document) })));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get system stats
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = getUserId(req, res);
      const documents = await storage.getAllDocuments(userId);
      const processedDocuments = documents.filter(doc => doc.status === 'processed');
      const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

      const stats = {
        documentsCount: documents.length,
        processedCount: processedDocuments.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(1),
        status: "active",
        model: AI_MODEL,
        quota: getAiQuota(userId),
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
