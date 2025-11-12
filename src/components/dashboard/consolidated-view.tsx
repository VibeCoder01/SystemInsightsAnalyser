
"use client";

import { useState, useMemo } from 'react';
import type { AnalysisResults, Settings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Check, HelpCircle, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

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

function isPresentWithoutDate(date: Date | undefined): boolean {
    return !!date && date.getTime() === 0;
}


export function ConsolidatedView({ results, fileNames, settings }: { results: AnalysisResults; fileNames: string[], settings: Settings }) {
  const [filterText, setFilterText] = useState('');
  const [filterMode, setFilterMode] = useState<'simple' | 'regex'>('simple');
  const [regexError, setRegexError] = useState<string | null>(null);
  
  if (!results.consolidatedView || results.consolidatedView.length === 0) {
    return null;
  }
  
  const thresholdDays = settings.disappearanceThresholdDays;

  const filteredRecords = useMemo(() => {
    if (!filterText) {
      setRegexError(null);
      return results.consolidatedView;
    }

    let regex: RegExp;
    try {
      if (filterMode === 'simple') {
        const pattern =
          '^' +
          filterText
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
            .replace(/\\\*/g, '.*') // Convert * to .*
            .replace(/\\\?/g, '.') + // Convert ? to .
          '$';
        regex = new RegExp(pattern, 'i'); // Case-insensitive
      } else {
        regex = new RegExp(filterText, 'i');
      }
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
      return [];
    }
    
    return results.consolidatedView.filter(record => regex.test(record.computerName));

  }, [results.consolidatedView, filterText, filterMode]);


  const getTooltipContent = (date: Date | undefined, fileName: string) => {
    if (!date) {
      return `Not present in ${fileName}`;
    }
    // Check for our placeholder date
    if (date.getTime() === 0) {
      return `Present in ${fileName} (No date info)`;
    }
    let content = `Last seen in ${fileName} on ${format(date, 'd LLLL yyyy')}`;
    if (isStale(date, thresholdDays)) {
      content += '\n(This record is stale)';
    }
    return content;
  };

  const handleExport = () => {
    const csvHeaders = ['"Machine Name"', '"Last Seen (Any)"', '"Last Seen Source"', ...fileNames.map(name => `"${name} Last Seen"`)];
    
    const csvRows = filteredRecords.map(record => {
      const machineName = `"${record.computerName.replace(/"/g, '""')}"`;
      const lastSeen = record.lastSeen ? `"${format(record.lastSeen, 'd LLLL yyyy')}"` : '""';
      const lastSeenSource = record.lastSeenSource ? `"${record.lastSeenSource}"` : '""';
      
      const sourceDates = fileNames.map(name => {
        const date = record.sources[name];
        if (date && date.getTime() > 0) {
            return `"${format(date, 'd LLLL yyyy')}"`;
        } else if (date) { // Present but no date
            return '"Present"';
        }
        return '""'; // Not present
      });

      return [machineName, lastSeen, lastSeenSource, ...sourceDates].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "consolidated-view.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle>Consolidated Machine View</CardTitle>
                    <CardDescription>
                    A unified list of all unique machines found across all files. Showing {filteredRecords.length} of {results.consolidatedView.length} machines.
                    </CardDescription>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to CSV
                </Button>
            </div>
             <div className="flex items-end gap-4">
                <div className="flex-grow">
                    <Label htmlFor="filter-input">Filter by Machine Name</Label>
                    <Input
                        id="filter-input"
                        placeholder="Enter filter... (e.g., CORP-PC-* or /pc-\\d+/i)"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className={cn(regexError && "border-destructive focus-visible:ring-destructive")}
                    />
                     {regexError && (
                        <p className="mt-1 text-xs text-destructive">{regexError}</p>
                    )}
                </div>
                <div className="flex items-center space-x-2 pb-2">
                    <Label htmlFor="filter-mode-switch" className="text-sm font-normal">Simple</Label>
                    <Switch
                        id="filter-mode-switch"
                        checked={filterMode === 'regex'}
                        onCheckedChange={checked => setFilterMode(checked ? 'regex' : 'simple')}
                    />
                    <Label htmlFor="filter-mode-switch" className="text-sm font-normal">Regex</Label>
                </div>
            </div>
        </div>
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
                {filteredRecords.map(record => {
                    const isDisappeared = isTrulyDisappeared(record.lastSeen, thresholdDays);
                    return (
                        <TableRow key={record.computerName} className={cn(isDisappeared && 'bg-accent/10')}>
                            <TableCell className="font-code font-medium">
                                <div className="flex items-center gap-2">
                                   {isDisappeared && <Badge variant="destructive">Disappeared</Badge>}
                                   <span>{record.computerName}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                {record.lastSeen ? format(new Date(record.lastSeen), 'd LLLL yyyy') : 'Never'}
                            </TableCell>
                            <TableCell className="font-code text-xs">{record.lastSeenSource}</TableCell>
                            {fileNames.map(name => {
                                const sourceDate = record.sources[name];
                                const presentNoDate = isPresentWithoutDate(sourceDate);
                                return (
                                <TableCell key={name} className="text-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                             <div className="flex justify-center">
                                                {!sourceDate ? (
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-red-500">
                                                        <X className="size-3 text-white"/>
                                                    </div>
                                                ) : presentNoDate ? (
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-slate-400">
                                                        <HelpCircle className="size-3 text-white"/>
                                                    </div>
                                                ) : (
                                                     <div className={cn("flex items-center justify-center size-5 rounded-full", isStale(sourceDate, thresholdDays) ? "bg-amber-500" : "bg-green-500")}>
                                                        <Check className="size-3 text-white"/>
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
