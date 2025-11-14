
"use client"

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ParsedFile, Mappings, AnalysisResults, ConsolidatedRecord, PreviousFileSummary } from '@/lib/types';
import { useSettings } from '@/hooks/use-settings';
import { parseFileContent, runAnalysis, recalculateStatsFromView } from '@/lib/analyzer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/dashboard/file-upload';
import { FileConfigDialog } from '@/components/dashboard/file-config-dialog';
import { AnalysisResults as AnalysisResultsDisplay } from '@/components/dashboard/analysis-results';
import { ConsolidatedView } from '@/components/dashboard/consolidated-view';
import { PerFileStats } from '@/components/dashboard/per-file-stats';
import { PreviousSessionFiles } from '@/components/dashboard/previous-session-files';
import { FileText, Settings, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CONFIG_STORAGE_PREFIX = 'file-config-';
const LAST_USED_FILES_KEY = 'system-insights-analyzer-last-files';

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


function isTrulyDisappeared(date: Date | null, thresholdDays: number): boolean {
    if (!date) return true; // Disappeared if never seen
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - thresholdDays);
    return date < threshold;
}


export default function DashboardPage() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedFileForConfig, setSelectedFileForConfig] = useState<ParsedFile | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterMode, setFilterMode] = useState<'simple' | 'regex'>('simple');
  const [regexError, setRegexError] = useState<string | null>(null);
  const [previousFiles, setPreviousFiles] = useState<PreviousFileSummary[]>([]);

  const { settings } = useSettings();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_USED_FILES_KEY);
      if (stored) {
        setPreviousFiles(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load previous files summary", e);
    }
  }, []);

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
    // Save the configuration to localStorage against a hash of the content
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
    }
  };

  const handleRunAnalysis = () => {
    setIsLoading(true);
    setAnalysisResults(null);
    setFilterText(''); // Reset filter on new analysis
    // Use a short timeout to allow the UI to update to the loading state
    setTimeout(() => {
        try {
            const results = runAnalysis(files, settings);
            setAnalysisResults(results);
        } catch (e: any) {
            console.error("Analysis failed", e);
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: e.message || "An unexpected error occurred during analysis."
            });
        }
        setIsLoading(false);
    }, 500);
  };
  
  const configuredFileCount = useMemo(() => files.filter(f => f.isConfigured).length, [files]);

  const filteredRecords = useMemo(() => {
    if (!analysisResults) return [];
    if (!filterText) {
      setRegexError(null);
      return analysisResults.consolidatedView;
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
        regex = new RegExp(pattern, settings.caseSensitive ? '' : 'i');
      } else {
        regex = new RegExp(filterText, settings.caseSensitive ? '' : 'i');
      }
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
      return [];
    }
    
    return analysisResults.consolidatedView.filter(record => regex.test(record.computerName));

  }, [analysisResults, filterText, filterMode, settings.caseSensitive]);

  const isFiltering = useMemo(() => filterText.length > 0 && regexError === null, [filterText, regexError]);

  const filteredDisappearedCount = useMemo(() => {
     if (!analysisResults) return { count: 0, isFiltering: false };
     
     if (isFiltering) {
        const disappearedInFilter = filteredRecords.filter(record => isTrulyDisappeared(record.lastSeen, settings.disappearanceThresholdDays)).length;
        return { count: disappearedInFilter, isFiltering: true };
     }

     return { count: analysisResults.trulyDisappearedCount, isFiltering: false };
  }, [analysisResults, filteredRecords, isFiltering, settings.disappearanceThresholdDays]);

  const displayedStats = useMemo(() => {
    if (!analysisResults) return null;
    if (isFiltering) {
      return recalculateStatsFromView(filteredRecords, files.filter(f => f.isConfigured), settings);
    }
    return analysisResults.perFileStats;
  }, [analysisResults, filteredRecords, files, settings, isFiltering]);


  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">System Insights Analyzer</h1>
        <p className="mt-2 text-muted-foreground">
          Upload, configure, and analyze your computer management data to find discrepancies.
        </p>
      </header>

      {files.length === 0 && previousFiles.length > 0 && (
         <PreviousSessionFiles files={previousFiles} />
      )}

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
                            <span className="text-2xl font-bold">{filteredDisappearedCount.count}</span>
                            {filteredDisappearedCount.isFiltering ? (
                                <span className="text-lg font-semibold text-muted-foreground"> (in current filter)</span>
                            ) : (
                                <span className="text-lg font-semibold text-muted-foreground"> (total)</span>
                            )}
                             {' '}machines have not been seen in any system within the configured threshold of {settings.disappearanceThresholdDays} days.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {displayedStats && (
              <PerFileStats 
                stats={displayedStats} 
                totalStats={analysisResults.perFileStats}
                isFiltering={isFiltering} 
              />
            )}

            <ConsolidatedView 
                records={filteredRecords}
                totalRecordCount={analysisResults.consolidatedView.length}
                fileNames={files.map(f => f.fileName)} 
                settings={settings}
                filterText={filterText}
                setFilterText={setFilterText}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                regexError={regexError}
                isFiltering={isFiltering}
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

    

    
