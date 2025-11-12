"use client"

import React, { useState, useEffect } from 'react';
import type { ParsedFile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FileConfigDialogProps {
  file: ParsedFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: ParsedFile) => void;
}

export function FileConfigDialog({ file, isOpen, onClose, onSave }: FileConfigDialogProps) {
  const [computerNameCol, setComputerNameCol] = useState<string | null>(null);
  const [lastSeenCol, setLastSeenCol] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setComputerNameCol(file.mappings.computerName);
      setLastSeenCol(file.mappings.lastSeen);
    }
  }, [file]);

  const handleSave = () => {
    if (file && computerNameCol) {
      const updatedFile: ParsedFile = {
        ...file,
        mappings: {
          computerName: computerNameCol,
          lastSeen: lastSeenCol,
        },
        isConfigured: true,
      };
      onSave(updatedFile);
      onClose();
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configure "{file.fileName}"</DialogTitle>
          <DialogDescription>
            Select the columns that correspond to the computer name and last seen date. A computer name is required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="computer-name-col">Computer Name Column (Required)</Label>
              <Select value={computerNameCol || undefined} onValueChange={setComputerNameCol}>
                <SelectTrigger id="computer-name-col">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {file.headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="last-seen-col">Last Seen Column (Optional)</Label>
              <Select value={lastSeenCol || undefined} onValueChange={setLastSeenCol}>
                <SelectTrigger id="last-seen-col">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {file.headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground mt-1">Select 'None' if this file does not contain a 'last seen' date.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>File Preview</Label>
            <ScrollArea className="h-64 rounded-md border">
              <div className="min-w-max">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      {file.headers.map(header => (
                        <TableHead key={header} className="font-code text-xs whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {file.data.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {file.headers.map(header => (
                          <TableCell
                            key={header}
                            className="font-code text-xs truncate max-w-[150px] whitespace-nowrap"
                          >
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!computerNameCol}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
