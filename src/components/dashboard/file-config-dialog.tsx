
"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
import { guessDateFormat } from '@/lib/date-guesser';

interface FileConfigDialogProps {
  file: ParsedFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: ParsedFile) => void;
}

const SAMPLE_SIZE = 20; // Number of rows to use for date guessing

export function FileConfigDialog({ file, isOpen, onClose, onSave }: FileConfigDialogProps) {
  const [computerNameCol, setComputerNameCol] = useState<string | null>(null);
  const [lastSeenCol, setLastSeenCol] = useState<string | null>(null);
  const [lastSeenFormat, setLastSeenFormat] = useState<string | null>('');

  // Auto-guess date format when lastSeenCol changes
  const guessedFormat = useMemo(() => {
    if (!file || !lastSeenCol || lastSeenCol === 'none') {
      return null;
    }
    const samples = file.data
      .map(row => row[lastSeenCol])
      .filter(Boolean) // Filter out empty/null/undefined values
      .slice(0, SAMPLE_SIZE);
    
    if (samples.length === 0) {
      return null;
    }

    const result = guessDateFormat(samples);
    return result.format;
  }, [file, lastSeenCol]);


  useEffect(() => {
    if (file) {
      setComputerNameCol(file.mappings.computerName);
      setLastSeenCol(file.mappings.lastSeen);
      setLastSeenFormat(file.mappings.lastSeenFormat || '');
    }
  }, [file]);

  // When the guessed format is available, update the state, but only if user hasn't typed
  useEffect(() => {
    if (guessedFormat) {
      setLastSeenFormat(guessedFormat);
    }
  }, [guessedFormat]);
  
  // When user selects a new date column, reset the format and let the guesser run
  const handleLastSeenChange = (value: string) => {
    setLastSeenCol(value);
    setLastSeenFormat(''); // Reset format to allow new guess to populate
  }

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
              <Select value={lastSeenCol || 'none'} onValueChange={handleLastSeenChange}>
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
                <Label htmlFor="date-format-str">Date Format (Auto-detected)</Label>
                <Input
                  id="date-format-str"
                  value={lastSeenFormat || ''}
                  onChange={(e) => setLastSeenFormat(e.target.value)}
                  placeholder="e.g., dd/MM/yyyy HH:mm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The app tried to guess the format. Please verify it is correct. Note: `MM` is month, `mm` is minutes.{' '}
                  <Link href="https://date-fns.org/v2.16.1/docs/format" target="_blank" rel="noopener noreferrer" className="underline">
                    View format tokens
                  </Link>.
                </p>
                 <p className="text-xs text-muted-foreground mt-1">
                    For literal characters like 'T', use single quotes: `yyyy-MM-dd'T'HH:mm:ss`. Standard ISO formats are often detected automatically if left blank.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>File Preview</Label>
            <ScrollArea className="h-64 rounded-md border">
              <div className="relative min-w-max">
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
