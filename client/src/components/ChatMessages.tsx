import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Sparkles } from "lucide-react";
import type { Message } from "@shared/schema";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Source = { documentId: string; filename: string; relevance: number; fileType: string };

export default function ChatMessages({ sessionId }: { sessionId: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/sessions", sessionId, "messages"], enabled: Boolean(sessionId),
  });
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  return (
    <div className="message-scroll">
      <div className="message-column">
        {messages.length === 0 ? <EmptyState /> : messages.map((message) => (
          <article key={message.id} className={`message-row ${message.role}`}>
            {message.role === "assistant" && <div className="assistant-avatar"><Sparkles /></div>}
            <div className="message-content">
              <div className="message-meta">{message.role === "assistant" ? "Pike" : "You"}</div>
              <div className="message-copy">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    a: ({ children, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                    input: ({ checked, ...props }) => (
                      <input {...props} checked={checked} disabled />
                    ),
                  }}
                >
                  {String(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === "assistant" && Array.isArray(message.sources) && message.sources.length > 0 && (
                <div className="source-list">
                  {(message.sources as Source[]).map((source) => (
                    <span className="source-chip" key={`${source.documentId}-${source.filename}`}>
                      <FileText /> {source.filename} <b>{source.relevance}%</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span className="eyebrow">DOCUMENT INTELLIGENCE</span>
      <h2>Turn scattered reading<br />into clear answers.</h2>
      <p>Add a document to your library, then ask Pike to compare claims, extract details, or explain what matters.</p>
      <div className="starter-grid">
        <button>Summarize the key ideas <span>→</span></button>
        <button>Find disagreements between sources <span>→</span></button>
        <button>Build a concise study guide <span>→</span></button>
      </div>
    </div>
  );
}
