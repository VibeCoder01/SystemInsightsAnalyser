
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PerFileStats as PerFileStatsType } from "@/lib/types";
import { Check, HelpCircle, X, History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";


export function PerFileStats({ stats }: { stats: PerFileStatsType }) {
    const fileNames = Object.keys(stats);
    if (fileNames.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Per-File Statistics</CardTitle>
                <CardDescription>
                    Breakdown of machine statuses within each file compared against the consolidated list of all machines.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-code">File Name</TableHead>
                            <TableHead className="text-center">Total Entries</TableHead>
                            <TableHead className="text-center">Unique Machines</TableHead>
                            <TableHead className="text-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center justify-center gap-2 cursor-help">
                                                <Check className="size-4 text-green-600"/> Present
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Machine is present and its 'last seen' date is within the threshold.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center justify-center gap-2 cursor-help">
                                                 <History className="size-4 text-amber-600"/> Stale
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Machine is present, but its 'last seen' date is older than the threshold.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-center border-r">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center justify-center gap-2 cursor-help">
                                                <HelpCircle className="size-4 text-slate-500"/> No Date
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Machine is present in the file, but no 'last seen' date was provided.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center justify-center gap-2 cursor-help">
                                                <X className="size-4 text-red-600"/> Missing
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Machine exists in other files but is not present in this one.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                             <TableHead className="text-center">Total In View</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fileNames.map(fileName => {
                            const fileStats = stats[fileName];
                            return (
                                <TableRow key={fileName}>
                                    <TableCell className="font-code font-medium">{fileName}</TableCell>
                                    <TableCell className="text-center">{fileStats.sourceRecordCount}</TableCell>
                                    <TableCell className="text-center">{fileStats.uniqueSourceRecordCount}</TableCell>
                                    <TableCell className="text-center">{fileStats.present}</TableCell>
                                    <TableCell className="text-center">{fileStats.stale}</TableCell>
                                    <TableCell className="text-center border-r">{fileStats.noDate}</TableCell>
                                    <TableCell className="text-center">{fileStats.missing}</TableCell>
                                    <TableCell className="text-center">{fileStats.totalInView}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
