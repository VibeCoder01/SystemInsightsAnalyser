
"use client"

import { useState, useMemo, useEffect } from 'react';
import type { ParsedFile, Mappings } from '@/lib/types';
import { useSettings } from '@/hooks/use-settings';
import { parseFileContent, runAnalysis } from '@/lib/analyzer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/dashboard/file-upload';
import { FileConfigDialog } from '@/components/dashboard/file-config-dialog';
import { AnalysisResults as AnalysisResultsDisplay } from '@/components/dashboard/analysis-results';
import { ConsolidatedView } from '@/components/dashboard/consolidated-view';
import { PerFileStats } from '@/components/dashboard/per-file-stats';
import { FileText, Settings, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CONFIG_STORAGE_PREFIX = 'file-config-';
const SESSION_FILES_KEY = 'system-insights-analyzer-files';

// A simple and fast string hashing function (djb2 algorithm)
function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
    }
    return hash;
}

// Creates a storage key based on the file name and a hash of its content.
function getFileStorageKey(fileName: string, content: string): string {
    const contentHash = hashString(content);
    return `${CONFIG_STORAGE_PREFIX}${fileName}::${contentHash}`;
}

function getStoredConfig(key: string): Mappings | null {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error("Failed to read config from localStorage", e);
        return null;
    }
}

function setStoredConfig(key: string, mappings: Mappings) {
    try {
        localStorage.setItem(key, JSON.stringify(mappings));
    } catch (e) {
        console.error("Failed to save config to localStorage", e);
    }
}

type StoredFile = {
    fileName: string;
    content: string;
};

// Function to process a raw file object or a stored file object
function processAndAddFile(file: File | StoredFile, existingFiles: ParsedFile[], setFiles: React.Dispatch<React.SetStateAction<ParsedFile[]>>) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const content = e.target?.result as string;
        const fileName = 'name' in file ? file.name : file.fileName;

        if (existingFiles.some(f => f.fileName === fileName)) {
          return;
        }

        const { headers, data } = parseFileContent(content);
        const storageKey = getFileStorageKey(fileName, content);
        const storedMappings = getStoredConfig(storageKey);

        setFiles(prev => [
            ...prev,
            {
                fileName: fileName,
                content,
                headers,
                data,
                mappings: storedMappings || { computerName: null, lastSeen: null, lastSeenFormat: null },
                isConfigured: !!storedMappings,
                records: [],
            },
        ]);
    };
    
    if ('size' in file) { // It's a File object
      reader.readAsText(file);
    } else { // It's a StoredFile object
      const blob = new Blob([file.content], { type: 'text/plain' });
      reader.readAsText(blob);
    }
}


export default function DashboardPage() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedFileForConfig, setSelectedFileForConfig] = useState<ParsedFile | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredDisappearedCount, setFilteredDisappearedCount] = useState<{count: number, isFiltering: boolean} | null>(null);
  const { settings } = useSettings();
  const { toast } = useToast();

  // Effect to load files from localStorage on initial mount
  useEffect(() => {
    try {
      const storedFilesRaw = localStorage.getItem(SESSION_FILES_KEY);
      if (storedFilesRaw) {
        const storedFiles: StoredFile[] = JSON.parse(storedFilesRaw);
        if (Array.isArray(storedFiles)) {
          // Use a temporary array to batch state updates if needed, though React 18 batches automatically
          const initialFiles: ParsedFile[] = [];
          storedFiles.forEach(storedFile => {
            const { headers, data } = parseFileContent(storedFile.content);
            const storageKey = getFileStorageKey(storedFile.fileName, storedFile.content);
            const storedMappings = getStoredConfig(storageKey);
            initialFiles.push({
              fileName: storedFile.fileName,
              content: storedFile.content,
              headers,
              data,
              mappings: storedMappings || { computerName: null, lastSeen: null, lastSeenFormat: null },
              isConfigured: !!storedMappings,
              records: [],
            });
          });
          setFiles(initialFiles);
        }
      }
    } catch (error) {
      console.error("Failed to load files from session storage:", error);
    }
  }, []);

  // Effect to save files to localStorage whenever they change
  useEffect(() => {
    try {
      if (files.length > 0) {
        const filesToStore: StoredFile[] = files.map(({ fileName, content }) => ({ fileName, content }));
        localStorage.setItem(SESSION_FILES_KEY, JSON.stringify(filesToStore));
      } else {
        localStorage.removeItem(SESSION_FILES_KEY);
      }
    } catch (error) {
      console.error("Failed to save files to session storage:", error);
    }
  }, [files]);


  const handleFilesAdded = (newFiles: File[]) => {
    const existingFileNames = new Set(files.map(f => f.fileName));
    
    newFiles.forEach(file => {
      if (existingFileNames.has(file.name)) {
        toast({
          variant: 'destructive',
          title: 'File already exists',
          description: `A file named "${file.name}" has already been uploaded.`,
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const { headers, data } = parseFileContent(content);
        const storageKey = getFileStorageKey(file.name, content);
        const storedMappings = getStoredConfig(storageKey);

        setFiles(prev => {
          // Double check for race conditions.
          if (prev.some(f => f.fileName === file.name)) return prev;
          return [
            ...prev,
            {
              fileName: file.name,
              content,
              headers,
              data,
              mappings: storedMappings || { computerName: null, lastSeen: null, lastSeenFormat: null },
              isConfigured: !!storedMappings,
              records: [],
            },
          ]
        });
      };
      reader.readAsText(file);
    });
  };


  const handleSaveConfig = (updatedFile: ParsedFile) => {
    // Save the configuration to localStorage
    if (updatedFile.content) {
        const storageKey = getFileStorageKey(updatedFile.fileName, updatedFile.content);
        setStoredConfig(storageKey, updatedFile.mappings);
    }
    
    setFiles(prev => prev.map(f => f.fileName === updatedFile.fileName ? updatedFile : f));
  };
  
  const handleRemoveFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.fileName !== fileName));
    if (analysisResults) {
        setAnalysisResults(null);
        setFilteredDisappearedCount(null);
    }
  };

  const handleRunAnalysis = () => {
    setIsLoading(true);
    setAnalysisResults(null);
    setFilteredDisappearedCount(null);
    // Use a short timeout to allow the UI to update to the loading state
    setTimeout(() => {
        const results = runAnalysis(files, settings);
        setAnalysisResults(results);
        setIsLoading(false);
    }, 500);
  };
  
  const configuredFileCount = useMemo(() => files.filter(f => f.isConfigured).length, [files]);

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">System Insights Analyzer</h1>
        <p className="mt-2 text-muted-foreground">
          Upload, configure, and analyze your computer management data to find discrepancies.
        </p>
      </header>

      <motion.div layout>
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Files</CardTitle>
            <CardDescription>Add text or CSV files from your management systems.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFilesAdded={handleFilesAdded} />
          </CardContent>
        </Card>
      </motion.div>

      {files.length > 0 && (
        <motion.div layout>
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Configure Files</CardTitle>
              <CardDescription>Map the columns for each file to start the analysis.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {files.map(file => (
                  <motion.div
                    key={file.fileName}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Card className={cn(
                        "flex h-full flex-col",
                        file.isConfigured && "bg-green-100 dark:bg-green-900/20"
                      )}>
                      <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                              <FileText className="size-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium font-code break-words">{file.fileName}</CardTitle>
                            <CardDescription>{file.isConfigured ? 'Ready for analysis' : 'Needs configuration'}</CardDescription>
                          </div>
                      </CardHeader>
                      <CardContent className="flex-grow justify-end flex flex-col pt-0">
                        {file.data.length > 0 && (
                          <div className="text-sm text-muted-foreground mb-4">
                            <p>
                              <span className="font-semibold text-foreground">{file.data.length}</span> records found
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-auto">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                setSelectedFileForConfig(file);
                                setIsConfiguring(true);
                              }}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              {file.isConfigured ? 'Edit' : 'Configure'}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(file.fileName)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {configuredFileCount > 0 && (
        <motion.div layout>
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Run Analysis</CardTitle>
              <CardDescription>
                Once your files are configured, start the analysis to find insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRunAnalysis} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : 'Run Analysis'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary"/>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Generating insights...</p>
        </div>
      )}

      {analysisResults && (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>A high-level overview of the findings from {files.length} files.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert className="border-accent bg-accent/5">
                        <AlertTriangle className="h-4 w-4 text-accent" />
                        <AlertTitle>Truly Disappeared Machines</AlertTitle>
                        <AlertDescription>
                            <span className="text-2xl font-bold">{analysisResults.trulyDisappearedCount}</span>
                            {filteredDisappearedCount && filteredDisappearedCount.isFiltering && (
                                <span className="text-lg font-semibold text-muted-foreground"> ({filteredDisappearedCount.count} in filter)</span>
                            )}
                             {' '}machines have not been seen in any system within the configured threshold of {settings.disappearanceThresholdDays} days.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <PerFileStats stats={analysisResults.perFileStats} />

            <ConsolidatedView 
                results={analysisResults} 
                fileNames={files.map(f => f.fileName)} 
                settings={settings}
                onFilteredDisappearedCountChange={setFilteredDisappearedCount}
            />

            <AnalysisResultsDisplay results={analysisResults} fileCount={files.length} />
        </motion.div>
      )}

      <FileConfigDialog
        file={selectedFileForConfig}
        isOpen={isConfiguring}
        onClose={() => setIsConfiguring(false)}
        onSave={handleSaveConfig}
      />
    </main>
  );
}

    