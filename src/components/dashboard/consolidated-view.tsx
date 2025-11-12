
"use client";

import type { AnalysisResults, Settings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

function isStale(date: Date | undefined, thresholdDays: number): boolean {
    if (!date) return false; // Not stale if we don't have a date
    if (date.getTime() === 0) return false; // Not stale if it's our placeholder epoch date
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - thresholdDays);
    return date < threshold;
}

function isTrulyDisappeared(date: Date | null, thresholdDays: number): boolean {
    if (!date) return true; // Disappeared if never seen
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - thresholdDays);
    return date < threshold;
}


export function ConsolidatedView({ results, fileNames, settings }: { results: AnalysisResults; fileNames: string[], settings: Settings }) {
  
  if (!results.consolidatedView || results.consolidatedView.length === 0) {
    return null;
  }
  
  const thresholdDays = settings.disappearanceThresholdDays;

  const getTooltipContent = (date: Date | undefined, fileName: string) => {
    if (!date) {
      return `Not present in ${fileName}`;
    }
    // Check for our placeholder date
    if (date.getTime() === 0) {
      return `Present in ${fileName} (No date info)`;
    }
    let content = `Last seen in ${fileName} on ${date.toLocaleDateString()}`;
    if (isStale(date, thresholdDays)) {
      content += '\n(This record is stale)';
    }
    return content;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidated Machine View</CardTitle>
        <CardDescription>
          A unified list of all unique machines found across all files, showing the most recent time each machine was seen by any system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="bg-card [&>th]:bg-card">
                <TableHead className="w-[200px] font-code">Machine Name</TableHead>
                <TableHead className="text-center">Last Seen (Any)</TableHead>
                <TableHead>Last Seen Source</TableHead>
                {fileNames.map(name => (
                  <TableHead
                    key={name}
                    className="sticky top-0 z-20 bg-card font-code text-center"
                  >
                    {name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {results.consolidatedView.map(record => {
                    const isDisappeared = isTrulyDisappeared(record.lastSeen, thresholdDays);
                    return (
                        <TableRow key={record.computerName} className={cn(isDisappeared && 'bg-accent/50')}>
                            <TableCell className="font-code font-medium">
                                <div className="flex items-center gap-2">
                                   {isDisappeared && <Badge variant="destructive">Disappeared</Badge>}
                                   <span>{record.computerName}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                {record.lastSeen ? new Date(record.lastSeen).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell className="font-code text-xs">{record.lastSeenSource}</TableCell>
                            {fileNames.map(name => {
                                const sourceDate = record.sources[name];
                                return (
                                <TableCell key={name} className="text-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                             <div className="flex justify-center">
                                                {sourceDate ? (
                                                     <div className={cn("flex items-center justify-center size-5 rounded-full", isStale(sourceDate, thresholdDays) ? "bg-amber-500" : "bg-green-500")}>
                                                        <Check className="size-3 text-white"/>
                                                     </div>
                                                ) : (
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-red-500">
                                                        <X className="size-3 text-white"/>
                                                    </div>
                                                )}
                                             </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="whitespace-pre-wrap">
                                            <p>{getTooltipContent(sourceDate, name)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            )})
                           }
                        </TableRow>
                    )}
                )}
              </TooltipProvider>
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
