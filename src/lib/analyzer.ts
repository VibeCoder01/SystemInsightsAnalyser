
import { parse } from 'date-fns';
import type { ParsedFile, ComputerRecord, AnalysisResults, Settings, CrossComparisonResult, ConsolidatedRecord, PerFileStats, PreviousFileSummary } from './types';

const LAST_USED_FILES_KEY = 'system-insights-analyzer-last-files';

export function parseFileContent(content: string): { headers: string[]; data: Record<string, string>[] } {
  if (!content) {
    return { headers: [], data: [] };
  }
  const rows = content.trim().split('\n');
  if (rows.length === 0) {
    return { headers: [], data: [] };
  }

  const headers = rows.shift()?.split(',').map(h => h.trim()) || [];
  const data = rows.map(row => {
    const values = row.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]?.trim() || '';
      return obj;
    }, {} as Record<string, string>);
  });

  return { headers, data };
}

function createComputerRecords(file: ParsedFile, settings: Settings): ComputerRecord[] {
    if (!file.mappings.computerName) return [];

    return file.data.map(row => {
        let computerNameRaw = row[file.mappings.computerName!] || 'unknown';
        
        let computerName = computerNameRaw;
        let domain: string | undefined = undefined;

        if (computerNameRaw.includes('\\')) {
            const parts = computerNameRaw.split('\\');
            if (parts.length > 1) {
                domain = parts.shift()!;
                computerName = parts.join('\\');
            }
        } 
        else if (computerNameRaw.includes('.')) {
            const domainParts = computerNameRaw.split('.');
            if (domainParts.length > 1) {
                computerName = domainParts.shift()!;
                domain = domainParts.join('.');
            }
        }

        computerName = computerName.replace(/^\/|\/$/g, '');
        
        computerName = settings.caseSensitive ? computerName : computerName.toLowerCase();
        if (domain) {
            domain = settings.caseSensitive ? domain : domain.toLowerCase();
        }

        let lastSeen: Date | undefined = undefined;
        if (file.mappings.lastSeen && file.mappings.lastSeen !== 'none') {
            const dateStr = row[file.mappings.lastSeen];
            if (dateStr) {
                let parsedDate;
                if (file.mappings.lastSeenFormat) {
                    try {
                        // Use date-fns/parse with the user-provided format
                        parsedDate = parse(dateStr, file.mappings.lastSeenFormat, new Date());
                    } catch (e) {
                        console.error(`Error parsing date "${dateStr}" with format "${file.mappings.lastSeenFormat}" in file "${file.fileName}".`, e);
                        parsedDate = new Date('invalid'); // Ensure it's an invalid date
                    }
                } else {
                    // Fallback for ISO or other standard formats that new Date() can handle
                    parsedDate = new Date(dateStr);
                }

                if (parsedDate && !isNaN(parsedDate.getTime())) {
                    lastSeen = parsedDate;
                }
            }
        }
        return { computerName, lastSeen, domain, source: file.fileName, ...row };
    });
}

function createConsolidatedView(allRecords: ComputerRecord[], fileNames: string[]): ConsolidatedRecord[] {
    const machineMap = new Map<string, { lastSeen: Date | null, lastSeenSource: string | null, sources: { [fileName: string]: Date | undefined } }>();

    allRecords.forEach(record => {
        if (!machineMap.has(record.computerName)) {
            machineMap.set(record.computerName, {
                lastSeen: null,
                lastSeenSource: null,
                sources: Object.fromEntries(fileNames.map(name => [name, undefined]))
            });
        }

        const machine = machineMap.get(record.computerName)!;
        
        // Mark as present in the source file, using a placeholder if no date is available
        if (machine.sources[record.source] === undefined) {
             machine.sources[record.source] = record.lastSeen || new Date(0);
        }

        // Update latest overall sighting
        if (record.lastSeen && (!machine.lastSeen || record.lastSeen > machine.lastSeen)) {
            machine.lastSeen = record.lastSeen;
            machine.lastSeenSource = record.source;
        }

        // Update latest sighting for this specific source.
        const existingDate = machine.sources[record.source];
        if (record.lastSeen) {
             if (!existingDate || existingDate.getTime() === 0 || record.lastSeen > existingDate) {
                machine.sources[record.source] = record.lastSeen;
            }
        }
    });

    const consolidatedRecords: ConsolidatedRecord[] = [];
    machineMap.forEach((value, key) => {
        consolidatedRecords.push({
            computerName: key,
            ...value
        });
    });
    
    consolidatedRecords.sort((a, b) => {
        if (a.lastSeen && b.lastSeen) return b.lastSeen.getTime() - a.lastSeen.getTime();
        if (a.lastSeen) return -1;
        if (b.lastSeen) return 1;
        return a.computerName.localeCompare(b.computerName);
    });

    return consolidatedRecords;
}

export function recalculateStatsFromView(view: ConsolidatedRecord[], configuredFiles: ParsedFile[], settings: Settings): PerFileStats {
    const stats: PerFileStats = {};
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - settings.disappearanceThresholdDays);

    configuredFiles.forEach(file => {
        const uniqueSourceNames = new Set(file.records.map(r => r.computerName));

        const fileStats = {
            present: 0,
            stale: 0,
            missing: 0,
            noDate: 0,
            totalInView: view.length,
            sourceRecordCount: file.data.length,
            uniqueSourceRecordCount: uniqueSourceNames.size
        };

        view.forEach(record => {
            const sourceDate = record.sources[file.fileName];
            if (sourceDate === undefined) {
                fileStats.missing++;
            } else if (sourceDate.getTime() === 0) {
                fileStats.noDate++;
            } else if (sourceDate < staleThreshold) {
                fileStats.stale++;
            } else {
                fileStats.present++;
            }
        });

        stats[file.fileName] = fileStats;
    });

    return stats;
}

function saveFileSummaries(files: ParsedFile[]) {
    try {
        const summaries: PreviousFileSummary[] = files.map(file => ({
            fileName: file.fileName,
            totalLines: file.data.length,
            uniqueMachines: new Set(file.records.map(r => r.computerName)).size
        }));
        localStorage.setItem(LAST_USED_FILES_KEY, JSON.stringify(summaries));
    } catch (error) {
        console.error("Could not save file summaries to local storage", error);
    }
}


export function runAnalysis(files: ParsedFile[], settings: Settings): AnalysisResults {
  const configuredFiles = files.filter(f => f.isConfigured);
  if (configuredFiles.length < 1) {
    return { crossComparisons: [], disappearedMachines: [], consolidatedView: [], trulyDisappearedCount: 0, perFileStats: {} };
  }
  
  configuredFiles.forEach(file => {
      try {
        file.records = createComputerRecords(file, settings);
      } catch (error) {
        console.error(`Failed to process records for file: ${file.fileName}`, error);
        file.records = []; 
      }
  });

  saveFileSummaries(configuredFiles);
  
  const allRecords: ComputerRecord[] = configuredFiles.flatMap(f => f.records);
  const fileNames = configuredFiles.map(f => f.fileName);
  
  const consolidatedView = createConsolidatedView(allRecords, fileNames);

  const crossComparisons: CrossComparisonResult[] = [];
  if (configuredFiles.length > 1) {
    for (let i = 0; i < configuredFiles.length; i++) {
      for (let j = i + 1; j < configuredFiles.length; j++) {
        const fileA = configuredFiles[i];
        const fileB = configuredFiles[j];

        const namesA = new Set(fileA.records.map(r => r.computerName));
        const namesB = new Set(fileB.records.map(r => r.computerName));
        
        const uniqueRecordsA = new Map<string, ComputerRecord>();
        fileA.records.forEach(r => {
            if (!uniqueRecordsA.has(r.computerName)) {
                uniqueRecordsA.set(r.computerName, r);
            }
        });

        const uniqueRecordsB = new Map<string, ComputerRecord>();
        fileB.records.forEach(r => {
            if (!uniqueRecordsB.has(r.computerName)) {
                uniqueRecordsB.set(r.computerName, r);
            }
        });

        const missingInTarget = Array.from(uniqueRecordsA.values()).filter(r => !namesB.has(r.computerName));
        const missingInSource = Array.from(uniqueRecordsB.values()).filter(r => !namesA.has(r.computerName));

        if (missingInSource.length > 0 || missingInTarget.length > 0) {
            crossComparisons.push({
              sourceFile: fileA.fileName,
              targetFile: fileB.fileName,
              missingInTarget,
              missingInSource,
            });
        }
      }
    }
  }

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - settings.disappearanceThresholdDays);
  
  const trulyDisappearedMachines = consolidatedView.filter(record => !record.lastSeen || record.lastSeen < thresholdDate);

  const perFileStats = recalculateStatsFromView(consolidatedView, configuredFiles, settings);


  return { crossComparisons, disappearedMachines: [], consolidatedView, trulyDisappearedCount: trulyDisappearedMachines.length, perFileStats };
}
