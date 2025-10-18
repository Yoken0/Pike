import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText, Globe, File, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface ChatMessagesProps {
  sessionId: string;
}

interface Source {
  documentId: string;
  filename: string;
  relevance: number;
  fileType: string;
  url?: string;
}

const ChatMessages = React.memo(({ sessionId }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/sessions', sessionId, 'messages'],
    enabled: !!sessionId,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Only auto-scroll if we're at or near the bottom
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      if (isNearBottom || messages.length <= 1) {
        scrollToBottom();
      }
    }
  }, [messages.length, scrollToBottom]); // Only trigger on message count change, not on every message update

  const formatTime = useCallback((date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const renderMathContent = useCallback((content: string): React.ReactNode => {
    // Split content by block math expressions ($$ ... $$)
    const parts = content.split(/(\$\$.*?\$\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const mathExpression = part.slice(2, -2).trim();
        try {
          return (
            <BlockMath key={index} math={mathExpression} />
          );
        } catch (error) {
          return <span key={index} className="text-red-500">{part}</span>;
        }
      } else if (part.includes('$') && !part.startsWith('$')) {
        // Handle inline math ($ ... $)
        const inlineParts = part.split(/(\$[^$]*\$)/g);
        return inlineParts.map((inlinePart, inlineIndex) => {
          if (inlinePart.startsWith('$') && inlinePart.endsWith('$') && inlinePart.length > 2) {
            const mathExpression = inlinePart.slice(1, -1).trim();
            try {
              return <InlineMath key={`${index}-${inlineIndex}`} math={mathExpression} />;
            } catch (error) {
              return <span key={`${index}-${inlineIndex}`} className="text-red-500">{inlinePart}</span>;
            }
          }
          return <span key={`${index}-${inlineIndex}`}>{inlinePart}</span>;
        });
      }
      return <span key={index}>{part}</span>;
    });
  }, []);

  const getSourceIcon = useCallback((fileType: string): React.ReactNode => {
    switch (fileType) {
      case 'pdf':
        return <File className="w-3 h-3 text-red-500" />;
      case 'web':
        return <Globe className="w-3 h-3 text-blue-500" />;
      case 'docx':
        return <FileText className="w-3 h-3 text-blue-600" />;
      default:
        return <FileText className="w-3 h-3 text-green-500" />;
    }
  }, []);

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Starting new conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
      {messages.length === 0 ? (
        <div className="flex justify-center">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Pike</h3>
            <p className="text-muted-foreground">
              I can help you find information from your documents, search the web for new content, 
              and answer questions using your knowledge base.
            </p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'user' ? (
              <div className="max-w-lg">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap" data-testid={`message-user-${message.id}`}>
                    {message.content}
                  </p>
                </div>
                <div className="flex items-center justify-end mt-1 space-x-2 text-xs text-muted-foreground">
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="text-sm text-foreground whitespace-pre-wrap" data-testid={`message-assistant-${message.id}`}>
                        {renderMathContent(String(message.content)) as React.ReactNode}
                      </div>

                      {/* Sources Section */}
                      {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                          <div className="space-y-2">
                            {(message.sources as Source[]).map((source: Source, index: number) => (
                              <div key={index} className="flex items-center space-x-2 text-xs">
                                {getSourceIcon(source.fileType)}
                                <span className="text-muted-foreground truncate">{source.filename}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {source.relevance}% match
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center mt-1 space-x-2 text-xs text-muted-foreground">
                      <span>{formatTime(message.createdAt)}</span>
                      {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <Info className="w-3 h-3 mr-1" />
                            Used {Array.isArray(message.sources) ? message.sources.length : 0} source{Array.isArray(message.sources) && message.sources.length > 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
});

export default ChatMessages;
