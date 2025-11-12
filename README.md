# System Insights Analyzer

The System Insights Analyzer is a powerful tool designed to help you consolidate and analyze computer management data from various sources. By uploading and comparing data from systems like Active Directory (AD), SCCM, or antivirus logs, you can identify discrepancies, find machines that have truly disappeared from your network, and get a unified view of your entire device landscape.

## Key Features

- **Multi-Source Data Ingestion**: Upload data from multiple systems in simple `.csv` or `.txt` format.
- **Consolidated Machine View**: Get a single, unified list of all unique machines found across all your files. This view shows the most recent timestamp a machine was seen by *any* system, preventing false positives from a single stale data source.
- **"Truly Disappeared" Machine Detection**: By looking at the last seen date across all sources, the app intelligently flags machines that haven't been seen anywhere for a configurable period, helping you identify devices that are genuinely offline or decommissioned.
- **Cross-System Discrepancy Analysis**: See detailed reports showing which machines are present in one data source but missing in another, helping you to synchronize your management systems.
- **Flexible Data Configuration**: For each uploaded file, you can map which columns correspond to the `Computer Name` and the `Last Seen Date`.
- **Advanced Date Parsing**: Specify the exact date format for each file (e.g., `MM/dd/yyyy`, `dd-MM-yy HH:mm`) to handle ambiguous date strings correctly.
- **Configurable Heuristics**:
  - **Disappearance Threshold**: Easily set the number of days a machine must be inactive across all systems to be flagged as "disappeared".
  - **Case-Sensitive Analysis**: Choose whether machine name comparisons should be case-sensitive or case-insensitive.
- **Intelligent Name Parsing**: Automatically handles various computer name formats, including:
  - `computer-name`
  - `computer.domain.com` (FQDN)
  - `domain\computer`

## How to Use the Application

### 1. Prepare Your Data

For each management system (e.g., AD, SCCM), export a report containing at least a list of computer names. For best results, also include a "last seen" or "last logon" timestamp.

- **Format**: The file should be a comma-separated value (`.csv`) or plain text (`.txt`) file.
- **Header**: The first line of the file must be a header row containing the column names (e.g., `ComputerName,LastLogonDate`).

**Example `ad_export.csv`:**
```csv
Name,LastSeen
CORP-PC-01,10/15/2023 10:30
SALES-LAPTOP-05,11/01/2023
DEV-MACHINE,2023-11-02T08:00:00Z
```

### 2. Step 1: Upload Files

Drag and drop your prepared data files onto the upload area, or use the "Browse Files" button to select them. You can add multiple files from different sources.

### 3. Step 2: Configure Files

For each file you've uploaded, you need to tell the analyzer how to interpret it.

- Click the **"Configure"** button on a file card.
- In the dialog, select the column from your file that contains the **Computer Name**. This is required.
- Select the column that contains the **Last Seen Date**. This is optional. If no date column is available, select "None".
- A preview of your data is shown to help you make the correct selections.
- Click **"Save Configuration"**.

A green background on the file card indicates it's configured and ready.

#### **Important: Configuring Date Formats**

If you've selected a "Last Seen" column, a **Date Format** input will appear. You must specify the format of your date string here to ensure it's read correctly.

- **Match the Format Exactly**: The format string must account for all parts of the date and time in your data.
  - For a date like `10/15/2023 10:30`, the format is `MM/dd/yyyy HH:mm`. Note `MM` (uppercase) is for month and `mm` (lowercase) is for minutes.
  - For `15-Oct-23`, the format is `dd-MMM-yy`.
- **Handling Literal Characters**: If your date string contains letters that are not part of a format code (like the `T` in `2023-10-15T10:30:00`), you must wrap them in single quotes.
  - For `2023-10-15T10:30:00`, the correct format is `yyyy-MM-dd'T'HH:mm:ss`.
- **Leaving it Blank**: If you leave the format field blank, the analyzer will attempt to parse standard formats like `2023-11-15T10:00:00Z`. It is **highly recommended** to provide the format to avoid ambiguity and ensure accuracy.

### 4. Step 3: Run Analysis

Once you have at least one file configured, the "Run Analysis" button will become active. Click it to process the data.

### 5. Interpret the Results

After the analysis is complete, you will see a detailed breakdown:

- **Analysis Summary**: A high-level card showing the total count of "Truly Disappeared Machines" based on your configured settings.
- **Consolidated Machine View**: This is the primary result. It shows a master list of every unique machine across all files.
  - **Machine Name**: The name of the computer.
  - **Last Seen (Any)**: The absolute latest timestamp this machine was seen in *any* of the files.
  - **Last Seen Source**: The name of the file where the latest sighting occurred.
  - **Per-File Status**: Each subsequent column represents one of your uploaded files. An icon indicates if the machine is present in that file and whether the record is "stale" (older than the disappearance threshold), up-to-date, or present without date info. Hover over the icons for a precise last-seen date from that source.
- **Cross-System Discrepancies**: This is a collapsed section that you can expand. It shows a pairwise comparison between your files, highlighting machines that exist in one file but are missing in the other.

### 6. Adjust Settings

Navigate to the **Settings** page from the sidebar to fine-tune the analysis heuristics:

- **Disappeared Machine Threshold (Days)**: Change the number of days of inactivity before a machine is flagged as "disappeared".
- **Case-Sensitive Analysis**: Toggle whether machine names like "PC-01" and "pc-01" are treated as the same device.
