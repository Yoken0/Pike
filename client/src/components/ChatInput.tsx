import React, { useState, useRef, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Search, Brain, Paperclip, Upload } from "lucide-react";

interface ChatInputProps {
  sessionId: string;
}

const ChatInput = React.memo(({ sessionId }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/messages`, {
        content,
        role: 'user',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'messages'] });
      setMessage("");
    },
    onError: (error) => {
      // Extract the full error message from the response
      let errorMessage = error.message;
      
      // If it's a JSON error response, try to parse it
      if (errorMessage.includes('{')) {
        try {
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const errorObj = JSON.parse(jsonMatch[0]);
            if (errorObj.error) {
              errorMessage = errorObj.error;
            }
          }
        } catch (e) {
          // If parsing fails, use the original message
        }
      }
      
      toast({
        title: "Failed to send message",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds instead of default
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Uploading file:', file.name, file.size, file.type);
      const formData = new FormData();
      formData.append('file', file);
      
      // Debug: Check if FormData has the file
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "File uploaded successfully",
        description: "Document is being processed...",
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = useCallback((files: FileList | null) => {
    console.log('File upload handler called with files:', files);
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    const file = files[0];
    console.log('Selected file:', file.name, file.size, file.type);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting file upload mutation');
    uploadFileMutation.mutate(file);
  }, [toast, uploadFileMutation]);

  const handleAttachFile = useCallback(() => {
    console.log('File attach button clicked');
    if (fileInputRef.current) {
      console.log('File input found, triggering click');
      fileInputRef.current.click();
    } else {
      console.error('File input ref not found');
    }
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !sessionId) return;

    sendMessageMutation.mutate(trimmedMessage);
  }, [message, sessionId, sendMessageMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('File dropped:', files[0].name);
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  return (
    <div className="bg-card border-t border-border p-4">
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <div 
            className={`relative ${dragOver ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your documents or request new information... (or drag & drop a file)"
              className="w-full px-4 py-3 pr-12 border border-border rounded-lg resize-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm min-h-[44px] max-h-[120px] bg-background text-foreground"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 bottom-2 p-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent z-10 rounded-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAttachFile();
              }}
              disabled={uploadFileMutation.isPending}
              data-testid="button-attach"
              title="Attach file"
              type="button"
            >
              {uploadFileMutation.isPending ? (
                <Upload className="h-4 w-4 animate-pulse" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.docx,.md,.doc"
              onChange={(e) => {
                console.log('File input onChange triggered');
                const files = e.target.files;
                handleFileUpload(files);
                // Reset the input to allow selecting the same file again
                e.target.value = '';
              }}
              data-testid="input-file-attach"
            />
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-web-search"
              >
                <Search className="w-3 h-3 mr-1" />
                Auto-search web
              </Button>
              <span>•</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-knowledge-search"
              >
                <Brain className="w-3 h-3 mr-1" />
                Search knowledge
              </Button>
              <span>•</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleAttachFile}
                disabled={uploadFileMutation.isPending}
                data-testid="button-attach-file"
              >
                <Paperclip className="w-3 h-3 mr-1" />
                {uploadFileMutation.isPending ? "Uploading..." : "Attach File"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  console.log('Testing file upload with test file');
                  const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
                  handleFileUpload([testFile] as any);
                }}
                disabled={uploadFileMutation.isPending}
                data-testid="button-test-upload"
              >
                <Upload className="w-3 h-3 mr-1" />
                Test Upload
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || sendMessageMutation.isPending || !sessionId}
          className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default ChatInput;
