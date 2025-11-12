"use client"

import type { AnalysisResults, ComputerRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';

interface ResultTableProps {
  records: ComputerRecord[];
}

function ResultTable({ records }: ResultTableProps) {
    if (!records || records.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">No discrepancies found.</p>;
    }
    
    const hasDomain = records.some(r => r.domain);
    const headers = ['computerName'];
    if (hasDomain) headers.push('domain');
    headers.push('lastSeen');

    return (
        <ScrollArea className="h-72">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map(h => <TableHead key={h} className="font-code">{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((record, index) => (
                        <TableRow key={`${record.computerName}-${index}`}>
                            {headers.map(h => (
                                <TableCell key={h} className="font-code text-xs">
                                    {h === 'lastSeen' && record.lastSeen ? format(new Date(record.lastSeen), 'd LLLL yyyy') : String(record[h] ?? '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

export function AnalysisResults({ results, fileCount }: { results: AnalysisResults; fileCount: number; }) {
  const totalDiscrepancies = results.crossComparisons.reduce((acc, curr) => acc + curr.missingInSource.length + curr.missingInTarget.length, 0);

  if (totalDiscrepancies === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="cross-comparison">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Cross-System Discrepancies</h3>
               <Badge variant={totalDiscrepancies > 0 ? "secondary" : "default"}>{totalDiscrepancies}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="size-5"/> Inconsistent Records</CardTitle>
                    <CardDescription>
                        This report shows machines that appear in one file but are missing in another. This can help identify systems that are out of sync.
                    </CardDescription>
                </CardHeader>
              </Card>
            {results.crossComparisons.length > 0 ? results.crossComparisons.map(result => (
              <Card key={`${result.sourceFile}-${result.targetFile}`}>
                <CardHeader>
                   <CardTitle className="text-base">Comparing <span className="font-code text-primary">{result.sourceFile}</span> and <span className="font-code text-primary">{result.targetFile}</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Missing from <span className="font-code">{result.targetFile}</span> ({result.missingInTarget.length})</h4>
                        <ResultTable records={result.missingInTarget} />
                    </div>
                     <div>
                        <h4 className="font-medium mb-2">Missing from <span className="font-code">{result.sourceFile}</span> ({result.missingInSource.length})</h4>
                        <ResultTable records={result.missingInSource} />
                    </div>
                </CardContent>
              </Card>
            )) : (
                 <div className="flex items-center gap-2 p-4 text-sm text-green-600"><CheckCircle className="size-4"/> All systems are in sync.</div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
