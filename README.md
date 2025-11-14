# System Insights Analyzer

The System Insights Analyzer is a powerful tool designed to help you consolidate and analyze computer management data from various sources. By uploading and comparing data from systems like Active Directory (AD), SCCM, or antivirus logs, you can identify discrepancies, find machines that have truly disappeared from your network, and get a unified view of your entire device landscape.

## Getting Started

To run this application on your local machine, please follow these steps.

### Prerequisites

- You must have [Node.js](https://nodejs.org/) (version 18 or later recommended) installed.
- You must have a package manager like [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/) installed.

### Installation

1.  **Clone the repository** (or download the source code).
2.  **Navigate to the project directory** in your terminal.
3.  **Install the dependencies** by running the following command:

    ```bash
    npm install
    ```

### Running the Application

Once the dependencies are installed, you can start the local development server:

```bash
npm run dev
```

The application will now be running and accessible at `http://localhost:9002`.

## Privacy & Data Storage

This application is designed with your privacy in mind. All file processing and analysis happens **entirely within your web browser**.

-   **No Server Uploads**: The contents of your uploaded files are **never** sent to or stored on any server.
-   **Local Session Storage**: To provide the "Session Persistence" feature (which remembers your files when you reopen the app), the file content is stored in your browser's `localStorage`. This data remains on your own computer and is not transmitted over the network.

## Key Features

- **Session Persistence**: The application automatically saves your session. When you reopen the app, it pre-loads the files you were working with, allowing you to pick up right where you left off.
- **Intelligent Configuration Memory**: The app remembers the column mappings for files you've configured before. If you upload a file with the same content again, it will be automatically configured, saving you repetitive setup work.
- **Multi-Source Data Ingestion**: Upload data from multiple systems in simple `.csv` or `.txt` format. The app prevents uploading files with the same name to avoid confusion.
- **Consolidated Machine View**: Get a single, unified list of all unique machines found across all your files. This view shows the most recent timestamp a machine was seen by *any* system, preventing false positives from a single stale data source.
- **"Truly Disappeared" Machine Detection**: By looking at the last seen date across all sources, the app intelligently flags machines that haven't been seen anywhere for a configurable period, helping you identify devices that are genuinely offline or decommissioned.
- **Cross-System Discrepancy Analysis**: See detailed reports showing which unique machines are present in one data source but missing in another, helping you to synchronize your management systems. Duplicate entries within a file are ignored for this comparison.
- **Dynamic Per-File Statistics**: As you filter the main consolidated view, the per-file statistics table dynamically updates to reflect the counts and statuses of only the machines in your filtered results. This allows for interactive "what-if" analysis. When a filter is active, affected stats are shown in a `filtered / total` format, with a tooltip indicating how many machines were filtered out.
- **Intelligent Date Format Detection**: The application automatically analyzes your date columns and suggests the correct format, saving you time and preventing parsing errors. You can still manually adjust the format if needed.
- **Flexible Filtering (Wildcards & Regex)**: Filter the main results view with simple wildcards (`*` and `?`) or powerful regular expressions to quickly find specific machines.
- **Contextual Analysis Summary**: The "disappeared machines" count dynamically updates to show you how many machines in your filtered results match the criteria.
- **Configurable Heuristics**:
  - **Disappearance Threshold**: Easily set the number of days a machine must be inactive across all systems to be flagged as "disappeared".
  - **Case-Sensitive Analysis**: Choose whether machine name comparisons should be case-sensitive or case-insensitive.
- **Intelligent Name Parsing**: Automatically handles various computer name formats, including:
  - `computer-name`
  - `computer.domain.com` (FQDN)
  - `domain\computer`
- **Enhanced CSV Export**: Download the complete, filtered "Consolidated Machine View" as a CSV file. The export now includes a dedicated column indicating if a machine is considered "disappeared," making it perfect for offline analysis and reporting.

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

Drag and drop your prepared data files onto the upload area, or use the "Browse Files" button to select them. You can add multiple files from different sources. You cannot upload two files with the exact same name.

*(Note: The application will remember the files from your last session and automatically load them for you.)*

### 3. Step 2: Configure Files

For each file you've uploaded, you need to tell the analyzer how to interpret it.

- Click the **"Configure"** button on a file card.
- **Automatic Configuration**: If you've uploaded a file with the same content before, the app will automatically apply your previous settings. You can still click "Edit" to change them.
- In the dialog, select the column from your file that contains the **Computer Name**. This is required.
- Select the column that contains the **Last Seen Date**. This is optional. If no date column is available, select "None".
- A preview of your data is shown to help you make the correct selections.
- Click **"Save Configuration"**.

A green background on the file card indicates it's configured and ready.

#### **Important: Configuring Date Formats**

If you've selected a "Last Seen" column, a **Date Format** input will appear. The application will automatically analyze a sample of your data and suggest the most likely date format.

- **Verify the Auto-Detected Format**: Check that the suggested format correctly matches the dates in your file preview.
- **Manual Adjustment**: If the guess is incorrect, or for very unusual formats, you can manually edit the format string.
  - **Match the Format Exactly**: The format string must account for all parts of the date and time. For example, for a date like `10/15/2023 10:30`, the format is `MM/dd/yyyy HH:mm`. Note that `MM` (uppercase) is for month and `mm` (lowercase) is for minutes.
  - **Handling Literal Characters**: If your date string contains letters that are not part of a format code (like the `T` in `2023-10-15T10:30:00`), you must wrap them in single quotes. The correct format for `2023-10-15T10:30:00` is `yyyy-MM-dd'T'HH:mm:ss`.
- **Standard ISO Formats**: If your dates are in a standard ISO 8601 format (e.g., `2023-11-15T10:00:00Z`), you can often leave the format field blank, as the analyzer will parse them automatically.

### 4. Step 3: Run Analysis

Once you have at least one file configured, the "Run Analysis" button will become active. Click it to process the data.

### 5. Interpret the Results

After the analysis is complete, you will see a detailed breakdown:

- **Analysis Summary**: A high-level card showing the count of "Truly Disappeared Machines". If you are filtering the results below, this card will also show a count of disappeared machines *within your filtered view*.
- **Per-File Statistics**: A table showing a breakdown for each source file. **This table updates dynamically as you filter the Consolidated View**, showing statistics for just the machines in your filtered result set. It includes:
  - **Total Entries**: The raw number of rows in the original file.
  - **Unique Machines**: The number of distinct computer names found in that file.
  - **Present / Stale / No Date**: Counts of machines from this file based on their status in the consolidated view (up-to-date, older than the threshold, or present without a date).
  - **Missing**: The number of machines that exist in *other* files but are not present in this one.
  - **Total In View**: The number of machines currently visible in the filtered Consolidated View.
- **Consolidated Machine View**: This is the primary result. It shows a master list of every unique machine across all files.
  - **Filter**: Use the filter bar to search for machines. You can use simple wildcards (`*` for multiple characters, `?` for a single character) or switch to Regex mode for advanced filtering. As you filter, the Analysis Summary and Per-File Statistics will update in real-time.
  - **Export**: You can export the current (filtered) view to CSV using the button at the top of the card. The export includes a dedicated column indicating whether each machine is considered "disappeared".
  - **Machine Name**: The name of the computer. A row with a light orange background indicates the machine is "truly disappeared."
  - **Last Seen (Any)**: The absolute latest timestamp this machine was seen in *any* of the files, displayed in `dd MMM yyyy` format.
  - **Last Seen Source**: The name of the file where the latest sighting occurred.
  - **Per-File Status**: Each subsequent column represents one of your uploaded files. An icon indicates the machine's status in that file:
    - <span style="color:green;">✔</span> **Green Check**: Present and the record is not stale.
    - <span style="color:orange;">✔</span> **Amber Check**: Present, but the record is "stale" (older than the disappearance threshold).
    - <span style="color:grey;">?</span> **Grey Question Mark**: Present in the file, but no date information was provided.
    - <span style="color:red;">✖</span> **Red X**: Not present in the file.
- **Cross-System Discrepancies**: This is a collapsed section that you can expand. It shows a pairwise comparison between your files, highlighting the unique machines that exist in one file but are missing in the other.

### 6. Adjust Settings

Navigate to the **Settings** page from the sidebar to fine-tune the analysis heuristics:

- **Disappeared Machine Threshold (Days)**: Change the number of days of inactivity before a machine is flagged as "disappeared".
- **Case-Sensitive Analysis**: Toggle whether machine names like "PC-01" and "pc-01" are treated as the same device.
