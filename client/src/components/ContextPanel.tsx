import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, File, CheckCircle, Loader2, Clock } from "lucide-react";
import type { Message } from "@shared/schema";

interface ContextPanelProps {
  sessionId: string;
}

interface Source {
  documentId: string;
  filename: string;
  relevance: number;
  fileType: string;
  url?: string;
}

export default function ContextPanel({ sessionId }: ContextPanelProps) {
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/sessions', sessionId, 'messages'],
    enabled: !!sessionId,
  });

  const { data: stats } = useQuery<{
    documentsCount: number;
    processedCount: number;
    totalSizeMB: string;
    status: string;
  }>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000,
  });

  // Get the last user message and assistant response
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
  
  const sources = lastAssistantMessage?.sources as Source[] || [];
  const sessionQueries = messages.filter(m => m.role === 'user').length;

  const getSourceIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      case 'web':
        return <Globe className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-green-500" />;
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 80) return "text-emerald-600";
    if (relevance >= 60) return "text-amber-600";
    return "text-slate-600";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-900">Context & Sources</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current Query Context */}
        {lastUserMessage && (
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
              Current Query
            </h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-900 line-clamp-3" data-testid="text-current-query">
                {lastUserMessage.content}
              </p>
            </div>
          </div>
        )}

        {/* Retrieved Documents */}
        {sources.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
              Relevant Sources
            </h4>
            <div className="space-y-2">
              {sources.map((source, index) => (
                <div 
                  key={index}
                  className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  data-testid={`source-${index}`}
                >
                  <div className="flex items-start space-x-2">
                    {getSourceIcon(source.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {source.filename}
                      </p>
                      {source.url && (
                        <p className="text-xs text-slate-600 truncate mt-1">
                          {new URL(source.url).hostname}
                        </p>
                      )}
                      <div className="flex items-center mt-1">
                        <span className={`text-xs font-medium ${getRelevanceColor(source.relevance)}`}>
                          {source.relevance}% relevance
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Progress */}
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
            Search Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Vector search</span>
              <span className="text-xs text-emerald-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Knowledge retrieval</span>
              <span className="text-xs text-emerald-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Response generation</span>
              <span className="text-xs text-emerald-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
            Session Stats
          </h4>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-lg font-semibold text-slate-900" data-testid="text-queries-count">
                {sessionQueries}
              </div>
              <div className="text-xs text-slate-600">Queries</div>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-lg font-semibold text-slate-900" data-testid="text-sources-used">
                {sources.length}
              </div>
              <div className="text-xs text-slate-600">Sources</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        {stats && (
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
              System Info
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Documents</span>
                <span className="text-slate-900 font-medium">{stats?.documentsCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Processed</span>
                <span className="text-slate-900 font-medium">{stats?.processedCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Storage</span>
                <span className="text-slate-900 font-medium">{stats?.totalSizeMB || '0.0'} MB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
