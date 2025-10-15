import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Upload, Search, FileText, Globe, File, Clock, CheckCircle, MoreVertical, Circle } from "lucide-react";
import type { Document } from "@shared/schema";

interface DocumentSidebarProps {
  onClose: () => void;
  stats?: {
    documentsCount: number;
    processedCount: number;
    totalSizeMB: string;
    status: string;
  };
}

export default function DocumentSidebar({ onClose, stats }: DocumentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    refetchInterval: 5000, // Refetch every 5 seconds to show processing status
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Upload successful",
        description: "Document is being processed...",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoAcquireMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/documents/auto-acquire', { query });
      return response.json();
    },
    onSuccess: (data: Document[]) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Auto-acquisition started",
        description: `Found ${data.length} relevant documents. Processing...`,
      });
    },
    onError: (error) => {
      toast({
        title: "Auto-acquisition failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleAutoSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search topic",
        variant: "destructive",
      });
      return;
    }
    
    autoAcquireMutation.mutate(searchQuery.trim());
    setSearchQuery("");
  };

  const getStatusIcon = (status: string, fileType: string) => {
    const typeIcon = fileType === 'pdf' ? File : fileType === 'web' ? Globe : FileText;
    const TypeIcon = typeIcon;
    
    return <TypeIcon className={`text-sm ${
      fileType === 'pdf' ? 'text-red-500' : 
      fileType === 'web' ? 'text-blue-500' : 
      'text-green-500'
    }`} />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'processed') {
      return (
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Processed
        </Badge>
      );
    } else if (status === 'processing') {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Processing
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          Failed
        </Badge>
      );
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Knowledge Base</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden" data-testid="button-close-sidebar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Upload Section */}
      <div className="p-4 border-b border-border">
        <div className="space-y-3">
          <div 
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            data-testid="upload-area"
          >
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">PDF, TXT, DOCX supported</p>
            <input 
              id="file-input"
              type="file" 
              className="hidden" 
              multiple 
              accept=".pdf,.txt,.docx,.md"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              data-testid="input-file"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-query" className="text-sm font-medium text-foreground">
              Auto-acquire documents
            </Label>
            <div className="flex space-x-2">
              <Input
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search topic..."
                className="flex-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAutoSearch()}
                data-testid="input-search"
              />
              <Button 
                size="sm" 
                onClick={handleAutoSearch}
                disabled={autoAcquireMutation.isPending}
                data-testid="button-auto-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent Documents</h3>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs text-muted-foreground/70">Upload files or search to get started</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="group p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                  data-testid={`document-${doc.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(doc.status, doc.fileType)}
                        <span className="text-sm font-medium text-foreground truncate">
                          {doc.filename}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.source === 'upload' ? 'Uploaded' : 'Auto-acquired'} • {(doc.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="flex items-center mt-2">
                        {getStatusBadge(doc.status)}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-all p-1 h-6 w-6"
                      data-testid={`button-options-${doc.id}`}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vector Database</span>
              <span className="flex items-center text-emerald-600">
                <Circle className="w-1.5 h-1.5 fill-current mr-1" />
                {stats?.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Documents Indexed</span>
              <span className="text-foreground font-medium" data-testid="text-documents-count">
                {stats?.documentsCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="text-foreground font-medium">
                {stats?.totalSizeMB || '0.0'} MB
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
