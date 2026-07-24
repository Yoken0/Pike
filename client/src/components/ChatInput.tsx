import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatInput({ sessionId, quotaRemaining }: { sessionId: string; quotaRemaining?: number }) {
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const send = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/sessions/${sessionId}/messages`, { content, role: "user" }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => toast({ title: "Pike couldn't answer", description: extractError(error.message), variant: "destructive" }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024) throw new Error("Files must be 10 MB or smaller.");
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      if (!response.ok) throw new Error((await response.json()).error || "Upload failed");
      return response.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Added to your library", description: `${doc.filename} is being indexed.` });
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });

  const submit = () => {
    const content = message.trim();
    if (content && sessionId && quotaRemaining !== 0) send.mutate(content);
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
          placeholder="Ask a question across your sources…"
          rows={1}
          disabled={send.isPending || quotaRemaining === 0}
          aria-label="Message"
        />
        <div className="composer-actions">
          <button className="icon-action" onClick={() => fileRef.current?.click()} aria-label="Upload a document" disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <Paperclip />}
          </button>
          <input ref={fileRef} className="hidden" type="file" accept=".pdf,.txt,.docx,.md,.doc" onChange={(event) => event.target.files?.[0] && upload.mutate(event.target.files[0])} />
          <span className="composer-hint">{quotaRemaining === 0 ? "Daily limit reached" : `${quotaRemaining ?? "—"} AI requests left today`}</span>
          <button className="send-action" onClick={submit} disabled={!message.trim() || send.isPending || quotaRemaining === 0} aria-label="Send message">
            {send.isPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </button>
        </div>
      </div>
      <p className="composer-note">Pike can make mistakes. Verify important details against the cited source.</p>
    </div>
  );
}

function extractError(message: string) {
  const match = message.match(/\{.*\}/);
  if (!match) return message;
  try { return JSON.parse(match[0]).error || message; } catch { return message; }
}
