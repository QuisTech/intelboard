# 🕵️‍♂️ IntelBoard - Visual Intelligence Analysis Platform

**IntelBoard** is a professional-grade investigation storyboard and link analysis tool built with **React** and **React Flow**. Designed for intelligence analysts and law enforcement, it allows users to visually map complex cases, connect entities, and generate automated insights using a robust **Offline Logic Engine**.

<<<<<<< HEAD
![IntelBoard Dashboard](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop)
=======
<img width="1366" height="768" alt="Screenshot (172)" src="https://github.com/user-attachments/assets/3a5b7f86-974a-4923-9153-f4c1ad8f7e3c" />
>>>>>>> 09e64f1be13e96c901a7a53c5cd4d4e9a0dab8d6

## 🚀 Key Features

### 🧠 Core Capabilities
*   **Visual Investigation Canvas**: Drag-and-drop interface to map People, Events, Locations, Evidence, and Organizations.
*   **Offline Logic Engine**: A powerful client-side analysis engine (using `compromise`, `fuse.js`, `graphlib`) that detects:
    *   Network Clusters & Cells.
    *   Investigative Gaps (e.g., suspects with no evidence).
    *   Timeline Anomalies & Bursts.
    *   Red Flag Warnings.
*   **Narrative Visualization**: Paste a text report (police report, witness statement) and the AI automatically builds the board for you.

### 🛡️ Specialized Modes
*   **Kidnapping Response Dashboard**: Dedicated tools for ransom tracking, victim risk assessment, and tactical response suggestions (IRT, Roadblocks, etc.).
*   **Terrorism & Banditry Workflows**: Pre-configured templates for tracking cells, funding sources, and hierarchy.

### 🎬 Director Mode
*   **Automated Demo System**: A "self-driving" presentation mode that showcases the app's features automatically—perfect for stakeholder briefings.
*   **Screen Recording**: Built-in capability to record the investigation session to a video file.

### 📂 Case Management
*   **Browser Persistence**: Auto-saves your work locally.
*   **File System**: Import/Export cases as JSON files.
*   **Report Generation**: One-click PDF generation of the entire investigation, including executive summaries and geospatial logs.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Visualization**: React Flow (XYFlow)
*   **Icons**: Lucide React
*   **Offline NLP & Logic**: 
    *   `compromise` (Entity Extraction)
    *   `chrono-node` (Temporal Parsing)
    *   `fuse.js` (Fuzzy Search/Deduplication)
    *   `graphlib` (Network Analysis)
*   **Reporting**: `jspdf`

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/intelboard.git
    cd intelboard
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm start
    ```

## 📖 Usage Guide

### 1. The Canvas
*   **Sidebar**: Drag assets (Person, Event, Location, etc.) from the left sidebar onto the canvas.
*   **Connecting**: Drag from the handles (dots) on a node to connect it to another.
*   **Editing**: Click any node or edge to open the **Inspector Panel** on the right to edit details, upload photos, or add notes.

### 2. Investigation Modes
Use the dropdown in the top-right to switch modes:
*   **General**: Standard link analysis.
*   **Kidnapping**: Activates the "Kidnap Tools" palette (bottom left) and the "Response Dashboard" (top left) for specialized analytics.

### 3. Logic Engine Analysis
Click the **Logic Engine** button in the top toolbar to run a full analysis of your board. This will:
*   Identify disconnected entities.
*   Flag suspicious financial volumes.
*   Detect network clusters.
*   Generate a summary report.

### 4. Sample Cases
The project includes sample JSON files in the `samples/` directory:
1.  **Operation Sandstorm** (Terrorism/Borno)
2.  **The Gold Chain** (Banditry/Zamfara)
3.  **Highway Incident 409** (Kidnapping/Kaduna)

*To load a sample*: Click the **Import (Upload)** icon in the top right and select one of the generated JSON files.

## 🔒 Security Note
This application runs entirely client-side for the "Offline Logic Engine". No case data is sent to external servers unless you specifically configure an external API for the Generative AI features (optional).

## 📄 License
MIT License.
