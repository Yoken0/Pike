import 'dotenv/config';
import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { AiQuotaError, consumeAiRequest } from "./aiQuota";

// Initialize Gemini AI with explicit API version
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "your-gemini-api-key");
export const AI_MODEL = process.env.AI_MODEL || "gemini-3.5-flash-lite";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function generateChatResponse(
  messages: ChatMessage[],
  userId: string,
  context?: string
): Promise<ChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: AI_MODEL,
    });

    const systemMessage = messages.find(msg => msg.role === "system")?.content;
    let systemInstruction = systemMessage || `You are a helpful personal assistant.`;

    if (context) {
      systemInstruction += `\n\nHere is relevant context from the knowledge base:\n\n${context}`;
    }

    const history: Content[] = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    const currentMessage = history.pop();
    if (!currentMessage || currentMessage.role !== 'user') {
      throw new Error("The final message in the history must be from the 'user'.");
    }

    const chat = model.startChat({
      history,
      systemInstruction: {
        role: 'user', 
        parts: [{ text: systemInstruction }],
      },
    });

    consumeAiRequest(userId);
    const result = await chat.sendMessage(currentMessage.parts);
    const response = result.response;
    const text = response.text();
    
    const usage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    return { content: text, usage };

  } catch (error) {
    if (error instanceof AiQuotaError) throw error;
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateEmbedding(text: string, userId: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    consumeAiRequest(userId);
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    if (error instanceof AiQuotaError) throw error;
    if (error instanceof Error && error.message.includes('quota')) {
      console.warn('Gemini embedding quota exceeded, returning empty embedding');
      return [];
    }
    throw new Error(`Gemini embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateTitle(content: string, userId: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: AI_MODEL });
    const prompt = `Generate a short, descriptive title (3-6 words) for this conversation. Respond with only the title, no quotes or extra text.\n\nContent: ${content.slice(0, 500)}`;
    consumeAiRequest(userId);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim().replace(/["']/g, ""); // Remove quotes
    
    return title || "New Conversation";
  } catch (error) {
    if (error instanceof AiQuotaError) throw error;
    console.error("Failed to generate title:", error);
    return "New Conversation";
  }
}
