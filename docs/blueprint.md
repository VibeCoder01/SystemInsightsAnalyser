# **App Name**: System Insights Analyzer

## Core Features:

- Data Import: Import multiple text files from various computer management systems (Active Directory, SCCM, MDE, Sophos, FreshDesk, etc.).
- Data Parsing & Normalization: Parse imported data to extract computer names and last seen dates. Normalize data for consistent comparison.
- Cross-System Comparison: Compare computer lists across different systems to identify missing or inconsistent entries, such as machines present in one system but absent in another.
- Disappeared Machine Identification: Identify machines that have ceased reporting to the various systems, providing names and last seen dates.
- Configurable Heuristics: Allow users to configure comparison parameters and thresholds for identifying missing or disappeared machines. Allow the heuristic settings to be modified.
- Insight Reporting: Generate informative reports summarizing the comparison results, highlighting discrepancies, and listing disappeared machines.
- UI Configuration: Configuration page to tweak UI/UX, and overall system behaviour.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to represent system depth and reliability.
- Background color: Light grey (#F0F2F5) for a clean and modern interface.
- Accent color: Orange (#FF9800) to highlight critical information and alerts.
- Body and headline font: 'Inter' (sans-serif) for clear readability and a modern look.
- Code font: 'Source Code Pro' for displaying file paths or computer names in the UI
- Use simple, clear icons to represent different systems and data categories.
- Subtle transitions for data loading and report generation.