import type { ParsedFile, ComputerRecord, AnalysisResults, Settings, CrossComparisonResult, ConsolidatedRecord } from './types';

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

        // Handle domain\computer format
        if (computerNameRaw.includes('\\')) {
            const parts = computerNameRaw.split('\\');
            if (parts.length > 1) {
                domain = parts.shift()!;
                computerName = parts.join('\\');
            }
        } 
        // Handle FQDN computer.domain.com format
        else if (computerNameRaw.includes('.')) {
            const domainParts = computerNameRaw.split('.');
            if (domainParts.length > 1) {
                computerName = domainParts.shift()!;
                domain = domainParts.join('.');
            }
        }

        // Remove leading/trailing slashes from computer name
        computerName = computerName.replace(/^\/|\/$/g, '');
        
        computerName = settings.caseSensitive ? computerName : computerName.toLowerCase();
        if (domain) {
            domain = settings.caseSensitive ? domain : domain.toLowerCase();
        }

        let lastSeen: Date | undefined = undefined;
        if (file.mappings.lastSeen) {
            const dateStr = row[file.mappings.lastSeen];
            if (dateStr) {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
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

        // Update latest overall sighting
        if (record.lastSeen && (!machine.lastSeen || record.lastSeen > machine.lastSeen)) {
            machine.lastSeen = record.lastSeen;
            machine.lastSeenSource = record.source;
        }

        // Update latest sighting for this specific source
        if (record.lastSeen && (!machine.sources[record.source] || record.lastSeen > machine.sources[record.source]!)) {
            machine.sources[record.source] = record.lastSeen;
        }
    });

    const consolidatedRecords: ConsolidatedRecord[] = [];
    machineMap.forEach((value, key) => {
        consolidatedRecords.push({
            computerName: key,
            ...value
        });
    });
    
    // Sort by last seen date, descending (most recent first)
    consolidatedRecords.sort((a, b) => {
        if (a.lastSeen && b.lastSeen) return b.lastSeen.getTime() - a.lastSeen.getTime();
        if (a.lastSeen) return -1;
        if (b.lastSeen) return 1;
        return 0;
    });

    return consolidatedRecords;
}


export function runAnalysis(files: ParsedFile[], settings: Settings): AnalysisResults {
  const configuredFiles = files.filter(f => f.isConfigured);
  if (configuredFiles.length < 1) {
    return { crossComparisons: [], disappearedMachines: [], consolidatedView: [], trulyDisappearedCount: 0 };
  }
  
  // Ensure records are created with latest mappings and settings
  configuredFiles.forEach(file => {
      file.records = createComputerRecords(file, settings);
  });
  
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

        const missingInTarget = fileA.records.filter(r => !namesB.has(r.computerName));
        const missingInSource = fileB.records.filter(r => !namesA.has(r.computerName));

        crossComparisons.push({
          sourceFile: fileA.fileName,
          targetFile: fileB.fileName,
          missingInTarget,
          missingInSource,
        });
      }
    }
  }

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - settings.disappearanceThresholdDays);
  
  const trulyDisappearedMachines = consolidatedView.filter(record => record.lastSeen && record.lastSeen < thresholdDate);


  return { crossComparisons, disappearedMachines: [], consolidatedView, trulyDisappearedCount: trulyDisappearedMachines.length };
}
