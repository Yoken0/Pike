import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-openai-api-key"
});

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
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a helpful personal assistant powered by RAG (Retrieval-Augmented Generation). 
      You have access to a knowledge base of documents and can search the web for additional information.
      
      ${context ? `Here is relevant context from the knowledge base:\n\n${context}` : ''}
      
      Please provide accurate, helpful responses based on the available information. If you reference specific sources, mention them in your response.`
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return {
      content: response.choices[0].message.content || "",
      usage: response.usage || undefined,
    };
  } catch (error) {
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`OpenAI embedding error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateTitle(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive title (3-6 words) for this conversation based on the content. Respond with only the title, no quotes or extra text."
        },
        {
          role: "user",
          content: content.slice(0, 500) // First 500 chars
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    return response.choices[0].message.content?.trim() || "New Conversation";
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Conversation";
  }
}
