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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '../ui/input';
import Link from 'next/link';

interface FileConfigDialogProps {
  file: ParsedFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: ParsedFile) => void;
}

export function FileConfigDialog({ file, isOpen, onClose, onSave }: FileConfigDialogProps) {
  const [computerNameCol, setComputerNameCol] = useState<string | null>(null);
  const [lastSeenCol, setLastSeenCol] = useState<string | null>(null);
  const [lastSeenFormat, setLastSeenFormat] = useState<string | null>('');


  useEffect(() => {
    if (file) {
      setComputerNameCol(file.mappings.computerName);
      setLastSeenCol(file.mappings.lastSeen);
      setLastSeenFormat(file.mappings.lastSeenFormat || '');
    }
  }, [file]);

  const handleSave = () => {
    if (file && computerNameCol) {
      const updatedFile: ParsedFile = {
        ...file,
        mappings: {
          computerName: computerNameCol,
          lastSeen: lastSeenCol,
          lastSeenFormat: lastSeenFormat,
        },
        isConfigured: true,
      };
      onSave(updatedFile);
      onClose();
    }
  };
  
  const showDateFormatInput = lastSeenCol && lastSeenCol !== 'none';

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
              <Select value={lastSeenCol || 'none'} onValueChange={setLastSeenCol}>
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
             {showDateFormatInput && (
              <div>
                <Label htmlFor="date-format-str">Date Format</Label>
                <Input
                  id="date-format-str"
                  value={lastSeenFormat || ''}
                  onChange={(e) => setLastSeenFormat(e.target.value)}
                  placeholder="e.g., dd/MM/yyyy HH:mm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Specify how to read the date. Note `MM` is month, `mm` is minutes.{' '}
                  <Link href="https://date-fns.org/v2.16.1/docs/format" target="_blank" rel="noopener noreferrer" className="underline">
                    View format tokens
                  </Link>.
                </p>
                 <p className="text-xs text-muted-foreground mt-1">
                    If left blank, it will try standard ISO format like `YYYY-MM-DDTHH:mm:ssZ`. For a literal 'T', use single quotes: `yyyy-MM-dd'T'HH:mm:ss`.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>File Preview</Label>
            <ScrollArea className="h-64 rounded-md border">
               <div className="relative w-full overflow-auto">
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
                            className="font-code text-xs whitespace-nowrap"
                          >
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
