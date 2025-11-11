export type ComputerRecord = {
  computerName: string;
  lastSeen?: Date;
  [key: string]: any;
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
};

export type Settings = {
  disappearanceThresholdDays: number;
  caseSensitive: boolean;
};
