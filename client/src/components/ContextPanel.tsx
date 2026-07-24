import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Gauge, Layers3 } from "lucide-react";
import type { Message } from "@shared/schema";
import type { AppStats } from "@/pages/chat";

type Source = { documentId: string; filename: string; relevance: number; fileType: string };

export default function ContextPanel({ sessionId }: { sessionId: string }) {
  const { data: messages = [] } = useQuery<Message[]>({ queryKey: ["/api/sessions", sessionId, "messages"], enabled: Boolean(sessionId) });
  const { data: stats } = useQuery<AppStats>({ queryKey: ["/api/stats"], refetchInterval: 10_000 });
  const assistant = messages.filter((message) => message.role === "assistant").at(-1);
  const sources = (Array.isArray(assistant?.sources) ? assistant.sources : []) as Source[];
  const dailyPercentage = stats ? (stats.quota.day.used / stats.quota.day.limit) * 100 : 0;

  return (
    <div className="inspector-content">
      <div className="panel-heading"><span>Run details</span><BarChart3 /></div>
      <section className="inspector-section">
        <div className="section-label"><Gauge /> AI allowance</div>
        <div className="quota-line"><b>{stats?.quota.day.remaining ?? "—"}</b><span>of {stats?.quota.day.limit ?? "—"} remaining</span></div>
        <div className="quota-track"><span style={{ width: `${Math.min(100, dailyPercentage)}%` }} /></div>
        <p>Resets daily at 00:00 UTC</p>
      </section>
      <section className="inspector-section">
        <div className="section-label"><Layers3 /> Active context</div>
        {sources.length ? sources.map((source) => (
          <div className="context-source" key={`${source.documentId}-${source.filename}`}>
            <FileText /><div><b>{source.filename}</b><span>{source.relevance}% relevance</span></div>
          </div>
        )) : <p>No sources retrieved yet. Ask a question to see what Pike used.</p>}
      </section>
      <section className="inspector-section model-card">
        <span>Model</span><b>{stats?.model ?? "Loading…"}</b>
        <small>Optimized for fast, lower-cost research workflows.</small>
      </section>
    </div>
  );
}
