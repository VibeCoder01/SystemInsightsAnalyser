import type { ParsedFile, ComputerRecord, AnalysisResults, Settings, CrossComparisonResult, DisappearedMachineResult } from './types';

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
        const computerNameRaw = row[file.mappings.computerName!] || 'unknown';
        const computerName = settings.caseSensitive ? computerNameRaw : computerNameRaw.toLowerCase();

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
        return { computerName, lastSeen, ...row };
    });
}


export function runAnalysis(files: ParsedFile[], settings: Settings): AnalysisResults {
  const configuredFiles = files.filter(f => f.isConfigured);
  if (configuredFiles.length < 1) {
    return { crossComparisons: [], disappearedMachines: [] };
  }
  
  // Ensure records are created with latest mappings and settings
  configuredFiles.forEach(file => {
      file.records = createComputerRecords(file, settings);
  });

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

  const disappearedMachines: DisappearedMachineResult[] = [];
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - settings.disappearanceThresholdDays);

  configuredFiles.forEach(file => {
    if (file.mappings.lastSeen) {
      const disappeared = file.records.filter(r => r.lastSeen && r.lastSeen < thresholdDate);
      if (disappeared.length > 0) {
        disappearedMachines.push({
          fileName: file.fileName,
          machines: disappeared,
        });
      }
    }
  });

  return { crossComparisons, disappearedMachines };
}
