import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DocumentSidebar from "@/components/DocumentSidebar";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import ContextPanel from "@/components/ContextPanel";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Circle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  const { data: stats } = useQuery<{
    documentsCount: number;
    processedCount: number;
    totalSizeMB: string;
    status: string;
  }>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Create initial session
  useEffect(() => {
    if (!currentSessionId) {
      // Generate a browser-compatible UUID
      const sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setCurrentSessionId(sessionId);
    }
  }, [currentSessionId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Document Sidebar */}
      <div className={`
        w-80 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out 
        lg:translate-x-0 absolute lg:relative z-30 h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <DocumentSidebar 
          onClose={() => setSidebarOpen(false)}
          stats={stats}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-toggle-sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Pike</h1>
                <p className="text-sm text-muted-foreground">AI-powered document assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-emerald-600">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                <span data-testid="text-status">Ready</span>
              </div>
              <ThemeToggle />
              <Button variant="ghost" size="sm" data-testid="button-settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatMessages sessionId={currentSessionId} />
            <ChatInput sessionId={currentSessionId} />
          </div>
          
          {/* Context Panel - hidden on smaller screens */}
          <div className="hidden xl:block w-80 bg-card border-l border-border">
            <ContextPanel sessionId={currentSessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
