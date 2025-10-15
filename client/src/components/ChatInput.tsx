import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Search, Brain, Paperclip } from "lucide-react";

interface ChatInputProps {
  sessionId: string;
}

export default function ChatInput({ sessionId }: ChatInputProps) {
  const [message, setMessage] = useState("");
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

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !sessionId) return;

    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="bg-card border-t border-border p-4">
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your documents or request new information..."
              className="w-full px-4 py-3 pr-12 border border-border rounded-lg resize-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm min-h-[44px] max-h-[120px] bg-background text-foreground"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 bottom-2 p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
              data-testid="button-attach"
            >
              <Paperclip className="h-3 w-3" />
            </Button>
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
}
