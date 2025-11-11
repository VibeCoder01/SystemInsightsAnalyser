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
        "relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 text-center transition-colors duration-200",
        isDragOver && "border-primary bg-primary/10",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-card-foreground">Drag & Drop files here</h3>
      <p className="mt-1 text-sm text-muted-foreground">or</p>
      <Button
        variant="outline"
        className="mt-4"
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
