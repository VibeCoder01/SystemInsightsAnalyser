"use client"

import type { AnalysisResults, ComputerRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface AnalysisResultsProps {
  results: AnalysisResults;
  fileCount: number;
}

function ResultTable({ records, fileHeaders }: { records: ComputerRecord[], fileHeaders?: string[] }) {
    if (!records || records.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">No discrepancies found.</p>;
    }

    const headers = fileHeaders || ['computerName', 'lastSeen'];

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
                                    {h === 'lastSeen' ? record.lastSeen?.toLocaleDateString() : String(record[h] ?? '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

export function AnalysisResults({ results, fileCount }: AnalysisResultsProps) {
  const totalDisappeared = results.disappearedMachines.reduce((acc, curr) => acc + curr.machines.length, 0);
  const totalDiscrepancies = results.crossComparisons.reduce((acc, curr) => acc + curr.missingInSource.length + curr.missingInTarget.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>A high-level overview of the findings from {fileCount} files.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <Alert className="border-accent bg-accent/5">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <AlertTitle>Disappeared Machines</AlertTitle>
                <AlertDescription>
                    <span className="text-2xl font-bold">{totalDisappeared}</span> machines have not been seen within the configured threshold.
                </AlertDescription>
            </Alert>
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Cross-System Discrepancies</AlertTitle>
                <AlertDescription>
                    <span className="text-2xl font-bold">{totalDiscrepancies}</span> total inconsistencies found between systems.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
        
      <Accordion type="multiple" defaultValue={['disappeared', 'cross-comparison']} className="w-full">
        <AccordionItem value="disappeared">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Disappeared Machines</h3>
                <Badge variant={totalDisappeared > 0 ? "destructive" : "default"}>{totalDisappeared}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {results.disappearedMachines.length > 0 ? results.disappearedMachines.map(result => (
              <Card key={result.fileName}>
                <CardHeader>
                  <CardTitle className="text-base">From: {result.fileName}</CardTitle>
                  <CardDescription>{result.machines.length} machines not seen recently.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResultTable records={result.machines} fileHeaders={['computerName', 'lastSeen']} />
                </CardContent>
              </Card>
            )) : (
                 <div className="flex items-center gap-2 p-4 text-sm text-green-600"><CheckCircle className="size-4"/> All machines are reporting as expected.</div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="cross-comparison">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Cross-System Comparison</h3>
               <Badge variant={totalDiscrepancies > 0 ? "secondary" : "default"}>{totalDiscrepancies}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {results.crossComparisons.length > 0 ? results.crossComparisons.map(result => (
              <Card key={`${result.sourceFile}-${result.targetFile}`}>
                <CardHeader>
                   <CardTitle className="text-base">Comparing <span className="font-code text-primary">{result.sourceFile}</span> and <span className="font-code text-primary">{result.targetFile}</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Missing from <span className="font-code">{result.targetFile}</span> ({result.missingInTarget.length})</h4>
                        <ResultTable records={result.missingInTarget} fileHeaders={['computerName', 'lastSeen']} />
                    </div>
                     <div>
                        <h4 className="font-medium mb-2">Missing from <span className="font-code">{result.sourceFile}</span> ({result.missingInSource.length})</h4>
                        <ResultTable records={result.missingInSource} fileHeaders={['computerName', 'lastSeen']} />
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
