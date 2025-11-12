
"use client"

import React, { useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  className?: string;
}

export function FileUpload({ onFilesAdded, className }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesAdded(Array.from(event.target.files));
    }
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        onFilesAdded(Array.from(event.dataTransfer.files));
        event.dataTransfer.clearData();
      }
    },
    [onFilesAdded]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col md:flex-row items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border bg-card p-6 text-center transition-colors duration-200",
        isDragOver && "border-primary bg-primary/10",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <UploadCloud className="size-8 text-muted-foreground" />
      <div className="flex flex-col md:flex-row items-center gap-2">
        <h3 className="text-base font-semibold text-card-foreground">Drag & Drop files here</h3>
        <p className="text-sm text-muted-foreground">or</p>
      </div>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        Browse Files
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".txt,.csv"
      />
    </div>
  );
}
