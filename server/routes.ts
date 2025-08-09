import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer, { type MulterError } from "multer";
import { storage } from "./storage";
import { insertMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateChatResponse } from "./services/openai";
import { searchKnowledgeBase, formatContextFromResults, extractSourcesFromResults } from "./services/vectorStore";
import { processUploadedFile, autoAcquireDocuments } from "./services/documentProcessor";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['text/plain', 'application/pdf', 'text/markdown'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
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
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Upload document
  app.post("/api/documents/upload", upload.single('file'), async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const document = await processUploadedFile(
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      res.json(document);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Auto-acquire documents
  app.post("/api/documents/auto-acquire", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const documents = await autoAcquireDocuments(query);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDocument(id);
      
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
      const sessions = await storage.getAllChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Create new chat session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get messages for a session
  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getMessagesBySession(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Send message (chat)
  app.post("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        sessionId,
      });

      // Save user message
      const userMessage = await storage.createMessage(messageData);

      // Search knowledge base for relevant context
      const searchResults = await searchKnowledgeBase(messageData.content);
      const context = formatContextFromResults(searchResults);
      const sources = extractSourcesFromResults(searchResults);

      // Get conversation history
      const history = await storage.getMessagesBySession(sessionId);
      const chatMessages = history
        .filter(msg => msg.role !== 'system')
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Add current user message
      chatMessages.push({
        role: "user",
        content: messageData.content,
      });

      // Generate AI response
      const aiResponse = await generateChatResponse(chatMessages, context);

      // Save assistant message
      const assistantMessage = await storage.createMessage({
        content: aiResponse.content,
        role: "assistant",
        sessionId,
        sources: sources.length > 0 ? sources : null,
      });

      // Update session last message time
      await storage.updateChatSession(sessionId, {
        lastMessageAt: new Date(),
      });

      res.json({
        userMessage,
        assistantMessage,
        sources,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Search knowledge base
  app.post("/api/search", async (req, res) => {
    try {
      const { query, limit = 5 } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const results = await searchKnowledgeBase(query, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get system stats
  app.get("/api/stats", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      const processedDocuments = documents.filter(doc => doc.status === 'processed');
      const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

      const stats = {
        documentsCount: documents.length,
        processedCount: processedDocuments.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(1),
        status: "active",
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
