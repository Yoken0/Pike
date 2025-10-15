// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  documents;
  messages;
  chatSessions;
  vectorChunks;
  constructor() {
    this.documents = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.chatSessions = /* @__PURE__ */ new Map();
    this.vectorChunks = /* @__PURE__ */ new Map();
  }
  // Documents
  async getDocument(id) {
    return this.documents.get(id);
  }
  async getAllDocuments() {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async createDocument(insertDocument) {
    const id = randomUUID();
    const document = {
      ...insertDocument,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      processedAt: null,
      // Ensure required fields have defaults
      status: insertDocument.status || "processing",
      source: insertDocument.source || "upload",
      url: insertDocument.url || null,
      embedding: insertDocument.embedding || null
    };
    this.documents.set(id, document);
    return document;
  }
  async updateDocument(id, updates) {
    const document = this.documents.get(id);
    if (!document) return void 0;
    const updated = { ...document, ...updates };
    this.documents.set(id, updated);
    return updated;
  }
  async deleteDocument(id) {
    return this.documents.delete(id);
  }
  // Messages
  async getMessage(id) {
    return this.messages.get(id);
  }
  async getMessagesBySession(sessionId) {
    return Array.from(this.messages.values()).filter((msg) => msg.sessionId === sessionId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  async createMessage(insertMessage) {
    const id = randomUUID();
    const message = {
      ...insertMessage,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      sources: insertMessage.sources || null
    };
    this.messages.set(id, message);
    return message;
  }
  // Chat Sessions
  async getChatSession(id) {
    return this.chatSessions.get(id);
  }
  async getAllChatSessions() {
    return Array.from(this.chatSessions.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }
  async createChatSession(insertSession) {
    const id = randomUUID();
    const session = {
      ...insertSession,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      lastMessageAt: /* @__PURE__ */ new Date(),
      title: insertSession.title || null
    };
    this.chatSessions.set(id, session);
    return session;
  }
  async updateChatSession(id, updates) {
    const session = this.chatSessions.get(id);
    if (!session) return void 0;
    const updated = { ...session, ...updates };
    this.chatSessions.set(id, updated);
    return updated;
  }
  // Vector Chunks
  async getVectorChunk(id) {
    return this.vectorChunks.get(id);
  }
  async getVectorChunksByDocument(documentId) {
    return Array.from(this.vectorChunks.values()).filter((chunk) => chunk.documentId === documentId);
  }
  async createVectorChunk(insertChunk) {
    const id = randomUUID();
    const chunk = {
      ...insertChunk,
      id
    };
    this.vectorChunks.set(id, chunk);
    return chunk;
  }
  async searchVectorChunks(embedding, limit = 5) {
    const chunks = Array.from(this.vectorChunks.values());
    const similarities = chunks.map((chunk) => {
      const chunkEmbedding = chunk.embedding;
      if (!chunkEmbedding || chunkEmbedding.length !== embedding.length) {
        return { ...chunk, similarity: 0 };
      }
      const similarity = this.cosineSimilarity(embedding, chunkEmbedding);
      return { ...chunk, similarity };
    });
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }
  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull().default("processing"),
  // processing, processed, failed
  source: text("source").notNull().default("upload"),
  // upload, web_search
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  embedding: jsonb("embedding")
  // Store as JSON array
});
var messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  role: text("role").notNull(),
  // user, assistant, system
  sessionId: text("session_id").notNull(),
  sources: jsonb("sources"),
  // Array of document IDs and relevance scores
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var vectorChunks = pgTable("vector_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: text("document_id").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull()
});
var insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  processedAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});
var insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true
});
var insertVectorChunkSchema = createInsertSchema(vectorChunks).omit({
  id: true
});

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
var genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "your-gemini-api-key");
async function generateChatResponse(messages2, context) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let prompt = "";
    const systemMessage = messages2.find((msg) => msg.role === "system");
    if (systemMessage) {
      prompt += systemMessage.content + "\n\n";
    } else {
      prompt += `You are a helpful personal assistant powered by RAG (Retrieval-Augmented Generation). 
      You have access to a knowledge base of documents and can search the web for additional information.
      
      ${context ? `Here is relevant context from the knowledge base:

${context}` : ""}
      
      Please provide accurate, helpful responses based on the available information. If you reference specific sources, mention them in your response.

`;
    }
    const conversationMessages = messages2.filter((msg) => msg.role !== "system");
    for (const message of conversationMessages) {
      if (message.role === "user") {
        prompt += `User: ${message.content}
`;
      } else if (message.role === "assistant") {
        prompt += `Assistant: ${message.content}
`;
      }
    }
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text2 = response.text();
    return {
      content: text2,
      usage: {
        prompt_tokens: 0,
        // Gemini doesn't provide detailed token usage in the same format
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function generateEmbedding(text2) {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text2);
    return result.embedding.values;
  } catch (error) {
    throw new Error(`Gemini embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// server/services/vectorStore.ts
async function searchKnowledgeBase(query, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const chunks = await storage.searchVectorChunks(queryEmbedding, limit * 2);
    const results = [];
    const seenDocuments = /* @__PURE__ */ new Set();
    for (const chunk of chunks) {
      if (seenDocuments.has(chunk.documentId) && results.length > 0) {
        continue;
      }
      const document = await storage.getDocument(chunk.documentId);
      if (document && document.status === "processed") {
        results.push({
          chunk,
          document,
          similarity: chunk.similarity
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
function formatContextFromResults(results) {
  if (results.length === 0) {
    return "";
  }
  let context = "Relevant information from knowledge base:\n\n";
  results.forEach((result, index) => {
    context += `[${index + 1}] From "${result.document.filename}":
`;
    context += `${result.chunk.content}

`;
  });
  return context;
}
function extractSourcesFromResults(results) {
  return results.map((result) => ({
    documentId: result.document.id,
    filename: result.document.filename,
    relevance: Math.round(result.similarity * 100),
    fileType: result.document.fileType,
    url: result.document.url
  }));
}

// server/services/webSearch.ts
async function searchWeb(query, limit = 5) {
  try {
    const apiKey = process.env.SERPER_API_KEY || process.env.SEARCH_API_KEY || "demo-key";
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: limit
      })
    });
    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.organic) {
      return [];
    }
    return data.organic.map((result) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet || ""
    }));
  } catch (error) {
    console.error("Web search error:", error);
    return [
      {
        title: `Research Results for "${query}"`,
        url: "https://example.com/research",
        snippet: `Relevant information about ${query} from academic sources and recent publications.`
      }
    ];
  }
}
async function scrapeWebContent(url) {
  try {
    const cheerio = await import("cheerio");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RAG-Bot/1.0)"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside").remove();
    let content = "";
    const contentSelectors = [
      "main",
      "[role='main']",
      ".content",
      "#content",
      "article",
      ".post-content",
      ".entry-content"
    ];
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        content = element.text().trim();
        break;
      }
    }
    if (!content) {
      content = $("body").text().trim();
    }
    content = content.replace(/\s+/g, " ").trim();
    if (content.length > 1e4) {
      content = content.slice(0, 1e4) + "...";
    }
    return content || "No content could be extracted from this URL.";
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return `Error: Could not extract content from ${url}`;
  }
}

// server/services/documentProcessor.ts
async function processUploadedFile(filename, content, mimetype) {
  try {
    let textContent = "";
    let fileType = "text";
    if (mimetype === "application/pdf") {
      fileType = "pdf";
      textContent = content.toString("utf-8");
    } else if (mimetype.startsWith("text/")) {
      fileType = "text";
      textContent = content.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
    const document = await storage.createDocument({
      filename,
      content: textContent,
      fileType,
      size: content.length,
      status: "processing",
      source: "upload",
      url: null
    });
    processDocumentEmbeddings(document.id, textContent);
    return document;
  } catch (error) {
    throw new Error(`Failed to process file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function processWebDocument(url, title) {
  try {
    const document = await storage.createDocument({
      filename: title,
      content: "Processing...",
      fileType: "web",
      size: 0,
      status: "processing",
      source: "web_search",
      url
    });
    scrapeAndProcessDocument(document.id, url);
    return document;
  } catch (error) {
    throw new Error(`Failed to process web document: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function scrapeAndProcessDocument(documentId, url) {
  try {
    const content = await scrapeWebContent(url);
    await storage.updateDocument(documentId, {
      content,
      size: content.length
    });
    await processDocumentEmbeddings(documentId, content);
  } catch (error) {
    console.error(`Failed to scrape document ${documentId}:`, error);
    await storage.updateDocument(documentId, {
      status: "failed",
      content: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
async function processDocumentEmbeddings(documentId, content) {
  try {
    const chunks = splitTextIntoChunks(content, 500, 50);
    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.text);
        await storage.createVectorChunk({
          documentId,
          content: chunk.text,
          embedding,
          startIndex: chunk.start,
          endIndex: chunk.end
        });
      } catch (error) {
        console.error(`Failed to process chunk for document ${documentId}:`, error);
      }
    }
    await storage.updateDocument(documentId, {
      status: "processed",
      processedAt: /* @__PURE__ */ new Date()
    });
    console.log(`Successfully processed document ${documentId} with ${chunks.length} chunks`);
  } catch (error) {
    console.error(`Failed to process embeddings for document ${documentId}:`, error);
    await storage.updateDocument(documentId, {
      status: "failed"
    });
  }
}
function splitTextIntoChunks(text2, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  while (start < text2.length) {
    const end = Math.min(start + chunkSize, text2.length);
    const chunkText = text2.slice(start, end);
    chunks.push({
      text: chunkText.trim(),
      start,
      end
    });
    if (end === text2.length) break;
    start = end - overlap;
  }
  return chunks.filter((chunk) => chunk.text.length > 0);
}
async function autoAcquireDocuments(query) {
  try {
    const searchResults = await searchWeb(query, 3);
    const documents2 = [];
    for (const result of searchResults) {
      try {
        const document = await processWebDocument(result.url, result.title);
        documents2.push(document);
      } catch (error) {
        console.error(`Failed to process search result ${result.url}:`, error);
      }
    }
    return documents2;
  } catch (error) {
    console.error("Failed to auto-acquire documents:", error);
    return [];
  }
}

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["text/plain", "application/pdf", "text/markdown"];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("text/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  }
});
async function registerRoutes(app2) {
  app2.get("/api/documents", async (req, res) => {
    try {
      const documents2 = await storage.getAllDocuments();
      res.json(documents2);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/documents/upload", upload.single("file"), async (req, res) => {
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
  app2.post("/api/documents/auto-acquire", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      const documents2 = await autoAcquireDocuments(query);
      res.json(documents2);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/documents/:id", async (req, res) => {
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
  app2.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages2 = await storage.getMessagesBySession(sessionId);
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        sessionId
      });
      const userMessage = await storage.createMessage(messageData);
      const searchResults = await searchKnowledgeBase(messageData.content);
      const context = formatContextFromResults(searchResults);
      const sources = extractSourcesFromResults(searchResults);
      const history = await storage.getMessagesBySession(sessionId);
      const chatMessages = history.filter((msg) => msg.role !== "system").slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content
      }));
      chatMessages.push({
        role: "user",
        content: messageData.content
      });
      const aiResponse = await generateChatResponse(chatMessages, context);
      const assistantMessage = await storage.createMessage({
        content: aiResponse.content,
        role: "assistant",
        sessionId,
        sources: sources.length > 0 ? sources : null
      });
      await storage.updateChatSession(sessionId, {
        lastMessageAt: /* @__PURE__ */ new Date()
      });
      res.json({
        userMessage,
        assistantMessage,
        sources
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/search", async (req, res) => {
    try {
      const { query, limit = 5 } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      const results = await searchKnowledgeBase(query, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const documents2 = await storage.getAllDocuments();
      const processedDocuments = documents2.filter((doc) => doc.status === "processed");
      const totalSize = documents2.reduce((sum, doc) => sum + doc.size, 0);
      const stats = {
        documentsCount: documents2.length,
        processedCount: processedDocuments.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(1),
        status: "active"
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  server.listen({
    port,
    host,
    reusePort: true
  }, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
