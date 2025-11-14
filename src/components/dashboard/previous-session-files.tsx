
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PreviousFileSummary } from "@/lib/types";
import { History } from "lucide-react";

interface PreviousSessionFilesProps {
  files: PreviousFileSummary[];
}

export function PreviousSessionFiles({ files }: PreviousSessionFilesProps) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Previous Session
        </CardTitle>
        <CardDescription>
          Here's a summary of the files from your last analysis. Upload files to begin a new session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-code">File Name</TableHead>
              <TableHead className="text-center">Total Lines</TableHead>
              <TableHead className="text-center">Unique Machines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.fileName}>
                <TableCell className="font-code font-medium">{file.fileName}</TableCell>
                <TableCell className="text-center">{file.totalLines}</TableCell>
                <TableCell className="text-center">{file.uniqueMachines}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
