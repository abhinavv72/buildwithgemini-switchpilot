# SwitchPilot — Your AI Job Search Copilot

SwitchPilot is an intelligent job search and application copilot powered by the Google Agent Development Kit (ADK), Gemini, and Agent Engine. It discovers real opportunities across live remote developer platforms, assesses truthful skill fit without exaggerating candidate experience, and provides human-in-the-loop assisted application workflows.

![SwitchPilot Demo](demo.gif)

---

## What SwitchPilot Does

- **Live Multi-Portal Job Discovery**:
  - Connects to the **Remotive Public Developer API** to surface real live remote software engineering openings.
  - Queries the **Arbeitnow Board API** for active tech positions.
  - Queries public **Greenhouse Board APIs** (`fetch_live_greenhouse_jobs`) for companies with public job boards.
  - Connects to **Google Cloud Firestore** (`jobpilot_jobs`) to store and retrieve candidate-saved job listings.
  - Provides **1-Click Live Search Launchers** formatted for **Naukri.com**, **LinkedIn Jobs**, **Indeed**, and **Wellfound (AngelList)** based on candidate target preferences.

- **Truthful Fit Analysis & Transparent Matching**:
  - Compares verified candidate skills with specific job descriptions.
  - Explicitly highlights evidence-backed matches and surfaces missing skills or learning gaps.
  - Generates zero-hallucination evaluations without inventing qualifications.

- **Candidate Profile & Skill Confirmation**:
  - Extracts skills from raw candidate resumes into a **Needs Confirmation** state.
  - Human-in-the-loop control: facts are only marked verified after explicit candidate review.
  - Includes an isolated **[Load Demo Mode]** for safe testing without entering personal data.

- **Interactive Resume Studio**:
  - Side-by-side bullet diffing comparing original resume lines with job-tailored revisions.
  - Categorizes keywords into Supported Facts, Needs Confirmation, and Learning Gaps.
  - Provides printable resume formatting (`window.print()`).

- **Application Queue & Assisted Submission**:
  - Tracks application lifecycle states: *Saved*, *Preparing*, *Ready for Review*, *Approved*, *Filling*, *Needs Input*, *Submitted*, *Failed*, *Needs Verification*.
  - Hosted sandbox adapter (`/test-apply-portal`) demonstrating form autofill via secure `postMessage` and official confirmation reference capture.
  - Guardrails: daily application safety limits (5/day), duplicate submission locks, and unconfirmed profile halts.

- **A2UI Rich Card Rendering & Multi-Session Isolation**:
  - Natively renders Google A2UI v0.8 Basic Catalog UI cards (`Card`, `Column`, `Row`, `Text`, `Divider`, `Image`, `Icon`).
  - Cross-turn context retention via Vertex AI Reasoning Engine and Google Agent Development Kit.
  - Cross-session memory persistence powered by **Vertex AI Memory Bank** (`PreloadMemoryTool`).

---

## Capabilities Planned / Not Implemented

- **Unattended Auto-Submission**: SwitchPilot does not bypass CAPTCHAs, perform automated headful browser clicks on live employer ATS logins, or submit real third-party applications without candidate oversight. Assisted applications use confirmed human-in-the-loop review.
- **Automated Binary Document Generation**: Resume studio provides printable browser formatting rather than server-side binary DOCX/PDF compilation.

---

## Architecture Overview

```
Browser Client (SwitchPilot UI)
    │
    │  HTTP POST /chat (session-isolated)
    ▼
FastAPI Proxy (Cloud Run / Local Server)
    │
    │  A2A Protocol / HTTP Streaming (IAM Token Auth)
    ▼
Vertex AI Reasoning Engine (ADK Agent Platform)
    │
    ├── Vertex AI Memory Bank (Long-Term Fact Persistence)
    ├── Remotive Public Remote Jobs API
    ├── Arbeitnow Board API
    ├── Greenhouse Board API
    └── Google Cloud Firestore (jobpilot_jobs, jobpilot_applications)
```

---

## Local Setup & Run

### Prerequisites

- Python 3.10+
- Google Cloud SDK (`gcloud`) authenticated to your Google Cloud project:
  ```bash
  gcloud auth login
  gcloud auth application-default login
  gcloud config set project <YOUR_PROJECT_ID>
  ```

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/buildwithgemini-switchpilot.git
   cd buildwithgemini-switchpilot
   ```

2. **Set up the virtual environment**:
   ```bash
   cd jobpilot-agent/frontend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   export AGENT_ENGINE_RESOURCE_NAME="projects/<PROJECT_ID>/locations/<REGION>/reasoningEngines/<ENGINE_ID>"
   export AGENT_DIRECTORY="app"
   ```

4. **Start the application**:
   ```bash
   python main.py
   ```
   Open the displayed local server address in your browser.
