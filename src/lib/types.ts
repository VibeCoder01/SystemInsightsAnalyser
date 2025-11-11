export type ComputerRecord = {
  computerName: string;
  lastSeen?: Date;
  domain?: string;
  source: string; // The file name it came from
  [key: string]: any;
};

export type ConsolidatedRecord = {
  computerName: string;
  lastSeen: Date | null;
  lastSeenSource: string | null;
  sources: {
    [fileName: string]: Date | undefined;
  };
};

export type ParsedFile = {
  fileName: string;
  data: Record<string, string>[];
  headers: string[];
  mappings: {
    computerName: string | null;
    lastSeen: string | null;
  };
  isConfigured: boolean;
  records: ComputerRecord[];
};

export type CrossComparisonResult = {
  sourceFile: string;
  targetFile: string;
  missingInTarget: ComputerRecord[];
  missingInSource: ComputerRecord[];
};

export type DisappearedMachineResult = {
  fileName: string;
  machines: ComputerRecord[];
};

export type AnalysisResults = {
  crossComparisons: CrossComparisonResult[];
  disappearedMachines: DisappearedMachineResult[];
  consolidatedView: ConsolidatedRecord[];
  trulyDisappearedCount: number;
};

export type Settings = {
  disappearanceThresholdDays: number;
  caseSensitive: boolean;
};
