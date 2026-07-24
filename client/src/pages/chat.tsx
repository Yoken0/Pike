import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import DocumentSidebar from "@/components/DocumentSidebar";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import ContextPanel from "@/components/ContextPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export type AppStats = {
  documentsCount: number;
  processedCount: number;
  totalSizeMB: string;
  status: string;
  model: string;
  quota: {
    minute: { used: number; limit: number; remaining: number; resetsAt: string };
    day: { used: number; limit: number; remaining: number; resetsAt: string };
  };
};

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => localStorage.getItem("pike-library-collapsed") === "true");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => localStorage.getItem("pike-inspector-collapsed") === "true");
  const [currentSessionId, setCurrentSessionId] = useState("");
  const { data: stats } = useQuery<AppStats>({ queryKey: ["/api/stats"], refetchInterval: 10_000 });

  useEffect(() => {
    setCurrentSessionId((id) => id || crypto.randomUUID());
  }, []);

  useEffect(() => {
    localStorage.setItem("pike-library-collapsed", String(libraryCollapsed));
  }, [libraryCollapsed]);

  useEffect(() => {
    localStorage.setItem("pike-inspector-collapsed", String(inspectorCollapsed));
  }, [inspectorCollapsed]);

  return (
    <main className={`app-shell ${libraryCollapsed ? "library-collapsed" : ""} ${inspectorCollapsed ? "inspector-collapsed" : ""}`}>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close library" onClick={() => setSidebarOpen(false)} />}
      <aside className={`library-panel ${sidebarOpen ? "is-open" : ""} ${libraryCollapsed ? "is-collapsed" : ""}`} aria-hidden={libraryCollapsed && !sidebarOpen}>
        {(!libraryCollapsed || sidebarOpen) && <DocumentSidebar onClose={() => setSidebarOpen(false)} stats={stats} />}
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open library">
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="library-toggle"
              onClick={() => setLibraryCollapsed(value => !value)}
              aria-label={libraryCollapsed ? "Show library sidebar" : "Hide library sidebar"}
              title={libraryCollapsed ? "Show library" : "Hide library"}
            >
              {libraryCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <div className="brand-mark"><Sparkles className="h-4 w-4" /></div>
            <div>
              <div className="flex items-center gap-2"><h1>Pike</h1><span className="status-dot">ready</span></div>
              <p>Your research, distilled.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && <span className="model-pill">{stats.model.replace("gemini-", "")}</span>}
            <Button
              variant="ghost"
              size="icon"
              className="inspector-toggle"
              onClick={() => setInspectorCollapsed(value => !value)}
              aria-label={inspectorCollapsed ? "Show run details sidebar" : "Hide run details sidebar"}
              title={inspectorCollapsed ? "Show run details" : "Hide run details"}
            >
              {inspectorCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="workspace-body">
          <div className="conversation">
            <ChatMessages sessionId={currentSessionId} />
            <ChatInput sessionId={currentSessionId} quotaRemaining={stats?.quota.day.remaining} />
          </div>
          <aside className={`inspector-panel ${inspectorCollapsed ? "is-collapsed" : ""}`} aria-hidden={inspectorCollapsed}>
            {!inspectorCollapsed && <ContextPanel sessionId={currentSessionId} />}
          </aside>
        </div>
      </section>
    </main>
  );
}
