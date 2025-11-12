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
            <TableHeader>
              <TableRow className="bg-card [&>th]:bg-card">
                <TableHead className="sticky top-0 z-20 w-[200px] bg-card font-code">
                  Machine Name
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-center">
                  Last Seen (Any)
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">
                  Last Seen Source
                </TableHead>
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
                            {fileNames.map(name => (
                                <TableCell key={name} className="text-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                             <div className="flex justify-center">
                                                {record.sources[name] ? (
                                                     <div className={cn("flex items-center justify-center size-5 rounded-full", isStale(record.sources[name], thresholdDays) ? "bg-amber-500" : "bg-green-500")}>
                                                        <Check className="size-3 text-white"/>
                                                     </div>
                                                ) : (
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-red-500">
                                                        <X className="size-3 text-white"/>
                                                    </div>
                                                )}
                                             </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>
                                                {record.sources[name] 
                                                    ? `Last seen on ${new Date(record.sources[name]!).toLocaleDateString()}` 
                                                    : 'Not present in this file'
                                                }
                                            </p>
                                            {record.sources[name] && isStale(record.sources[name], thresholdDays) && (
                                                <p className="text-amber-500">This record is stale.</p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            ))}
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
