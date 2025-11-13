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

export type Mappings = {
  computerName: string | null;
  lastSeen: string | null;
  lastSeenFormat: string | null;
};

export type ParsedFile = {
  fileName: string;
  content: string; // Full content for fingerprinting
  data: Record<string, string>[];
  headers: string[];
  mappings: Mappings;
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

export type PerFileStats = {
  [fileName: string]: {
    present: number;
    stale: number;
    missing: number;
    noDate: number;
    totalInConsolidated: number;
    sourceRecordCount: number;
  };
};

export type AnalysisResults = {
  crossComparisons: CrossComparisonResult[];
  disappearedMachines: DisappearedMachineResult[];
  consolidatedView: ConsolidatedRecord[];
  trulyDisappearedCount: number;
  perFileStats: PerFileStats;
};

export type Settings = {
  disappearanceThresholdDays: number;
  caseSensitive: boolean;
};
