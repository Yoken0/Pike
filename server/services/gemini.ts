import 'dotenv/config';
import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "your-gemini-api-key");

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
  context?: string
): Promise<ChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
    });

    // 1. Construct the system instruction from the 'system' message and any RAG context
    const systemMessage = messages.find(msg => msg.role === "system")?.content;
    let systemInstruction = systemMessage || `You are a helpful personal assistant.`;

    if (context) {
      systemInstruction += `\n\nHere is relevant context from the knowledge base:\n\n${context}`;
    }

    // 2. Format the conversation history for the API (maps 'assistant' to 'model')
    const history: Content[] = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    // The last message is the new prompt, so we remove it from the history
    const currentMessage = history.pop();
    if (!currentMessage || currentMessage.role !== 'user') {
      throw new Error("The final message in the history must be from the 'user'.");
    }

    // 3. Start the chat with the proper system instruction and history
    const chat = model.startChat({
      history,
      systemInstruction: {
        role: 'user', // System instructions are passed within a user role wrapper
        parts: [{ text: systemInstruction }],
      },
    });

    const result = await chat.sendMessage(currentMessage.parts);
    const response = result.response;
    const text = response.text();
    
    // 4. Populate usage data correctly from the response metadata
    const usage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    return { content: text, usage };

  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Corrected Model: Use 'embedding-001' for text embeddings
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    // Handle quota exceeded errors gracefully
    if (error instanceof Error && error.message.includes('quota')) {
      console.warn('Gemini embedding quota exceeded, returning empty embedding');
      return []; // Return empty array for quota exceeded
    }
    throw new Error(`Gemini embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateTitle(content: string): Promise<string> {
  try {
    // Recommended Model: Use 'gemini-1.5-pro' for speed and cost
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Generate a short, descriptive title (3-6 words) for this conversation. Respond with only the title, no quotes or extra text.\n\nContent: ${content.slice(0, 500)}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim().replace(/["']/g, ""); // Remove quotes
    
    return title || "New Conversation";
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Conversation";
  }
}