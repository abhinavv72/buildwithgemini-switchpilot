# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app import firestore_service

MODEL = "gemini-3.8-flash"


def list_saved_jobs(limit: int = 5) -> str:
    """Retrieves discovered job openings from the Firestore backend database.

    Args:
        limit: Maximum number of jobs to fetch. Defaults to 5.

    Returns:
        A formatted string describing the available jobs in Firestore.
    """
    jobs = firestore_service.list_jobs(limit=limit)
    if not jobs:
        return "No job listings found in the database."
    
    lines = ["Here are the jobs found in Firestore:"]
    for j in jobs:
        skills = ", ".join(j.get("primary_skills", []))
        lines.append(
            f"- [{j.get('id')}] {j.get('title')} at {j.get('company')} ({j.get('location')}, {j.get('remote_eligibility')})\n"
            f"  Salary: {j.get('salary')} | Skills: {skills}\n"
            f"  URL: {j.get('url')}"
        )
    return "\n".join(lines)


def add_job_listing(
    job_id: str,
    company: str,
    title: str,
    location: str,
    remote_eligibility: str,
    primary_skills: List[str],
    salary: str = "Not disclosed",
    url: str = ""
) -> str:
    """Saves a new job listing into the Firestore backend.

    Args:
        job_id: Unique identifier for the job (e.g. 'job-net-blr').
        company: Company hiring for the role.
        title: Job title.
        location: Work location.
        remote_eligibility: 'Remote', 'Hybrid', or 'On-site'.
        primary_skills: List of required or primary skills (e.g. ['C#', '.NET 8', 'SQL']).
        salary: Disclosed compensation or 'Not disclosed'. Never invent numbers.
        url: Official application or career link.

    Returns:
        Status message confirming the job was saved.
    """
    res = firestore_service.save_job(
        job_id=job_id,
        company=company,
        title=title,
        location=location,
        remote_eligibility=remote_eligibility,
        primary_skills=primary_skills,
        salary=salary,
        url=url
    )
    return f"Successfully saved job '{title}' at '{company}' with ID '{job_id}' in Firestore."


def list_candidate_applications() -> str:
    """Retrieves the candidate's active tracked applications and pipeline statuses from Firestore.

    Returns:
        Formatted summary of candidate applications.
    """
    apps = firestore_service.list_applications()
    if not apps:
        return "No tracked applications in the database."

    lines = ["Candidate Tracked Applications:"]
    for a in apps:
        lines.append(
            f"- Application ID: {a.get('id')} | Role: {a.get('target_role')} at {a.get('company')}\n"
            f"  Status: {a.get('status')} | Notes: {a.get('notes', 'None')}\n"
            f"  Link: {a.get('applied_url', 'N/A')}"
        )
    return "\n".join(lines)


def update_application(app_id: str, status: str, notes: Optional[str] = None) -> str:
    """Updates the status and optional notes for a candidate application in Firestore.

    Args:
        app_id: The ID of the application record (e.g. 'app-acme-1').
        status: The new status ('Saved', 'Preparing', 'Ready for Review', 'Applied', 'Interview', 'Rejected', 'Withdrawn').
        notes: Optional updated notes regarding the application.

    Returns:
        Confirmation of update.
    """
    res = firestore_service.update_application_status(app_id=app_id, status=status, notes=notes)
    if res.get("status") == "error":
        return f"Error: {res.get('message')}"
    return f"Updated application '{app_id}' status to '{status}'."


def fetch_live_greenhouse_jobs(board_token: str, query: str = "", limit: int = 5) -> str:
    """Fetches real live job openings from Greenhouse public board API and can filter by title or keyword.

    Args:
        board_token: The Greenhouse company board token or slug (e.g. 'gitlab', 'elastic', 'stripe').
        query: Optional search keyword to filter jobs (e.g. 'Backend', 'Software Engineer', 'Platform').
        limit: Maximum number of jobs to return. Defaults to 5.

    Returns:
        A formatted string listing the discovered live jobs from Greenhouse.
    """
    import json
    import urllib.request

    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "JobPilot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        return f"Failed to fetch jobs from Greenhouse for board '{board_token}': {e}"

    jobs = data.get("jobs", [])
    if query:
        q_lower = query.lower()
        jobs = [j for j in jobs if q_lower in (j.get("title") or "").lower()]

    if not jobs:
        return f"No active jobs found on '{board_token}' matching '{query}'."

    results = [f"Found {len(jobs)} active jobs on Greenhouse board '{board_token}' (showing top {min(limit, len(jobs))}):"]
    for j in jobs[:limit]:
        job_id = str(j.get("id"))
        title = j.get("title", "Untitled")
        location = j.get("location", {}).get("name", "Unspecified")
        job_url = j.get("absolute_url") or f"https://boards.greenhouse.io/{board_token}/jobs/{job_id}"
        results.append(f"- [{job_id}] {title} | Location: {location}\n  Apply URL: {job_url}")

    return "\n".join(results)


def search_remote_jobs_api(search_term: str = "", limit: int = 5) -> str:
    """Fetches real live remote software developer job listings from the free Remotive Public API (from public-apis directory).
    No API key required.

    Args:
        search_term: Optional keyword to search within job titles/descriptions (e.g. 'c#', 'backend', 'full stack', 'python').
        limit: Maximum number of remote jobs to return (default 5).

    Returns:
        A formatted list of current live remote jobs with company, location eligibility, salary, and application URL.
    """
    import json
    import os
    import urllib.parse
    import urllib.request

    base_url = "https://remotive.com/api/remote-jobs?category=software-dev"
    if search_term:
        base_url += f"&search={urllib.parse.quote(search_term)}"

    # If an optional custom API endpoint or key is configured via environment variable
    api_key = os.environ.get("REMOTIVE_API_KEY")
    headers = {"User-Agent": "JobPilot-Agent/1.0"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        req = urllib.request.Request(base_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        return f"Failed to fetch live remote jobs from Remotive API: {e}"

    jobs = data.get("jobs", [])
    if not jobs:
        return f"No remote software developer jobs found matching '{search_term}'."

    results = [f"Found {len(jobs)} live remote developer jobs (showing top {min(limit, len(jobs))}):"]
    for j in jobs[:limit]:
        title = j.get("title", "Untitled")
        company = j.get("company_name", "Unknown")
        loc = j.get("candidate_required_location") or "Worldwide"
        salary = j.get("salary") or "Not disclosed"
        url = j.get("url") or ""
        results.append(
            f"- [{j.get('id')}] {title} at {company}\n"
            f"  Location Eligibility: {loc} | Salary: {salary}\n"
            f"  Apply URL: {url}"
        )

    return "\n".join(results)


from google.adk.agents.callback_context import CallbackContext
from google.adk.memory import VertexAiMemoryBankService
from google.adk.tools.preload_memory_tool import PreloadMemoryTool
from a2ui.schema.manager import A2uiSchemaManager
from a2ui.basic_catalog.provider import BasicCatalog
from app.a2ui_utils import a2ui_callback

PROJECT_ID = "qwiklabs-gcp-04-5de1df139dd5"
LOCATION = "us-east1"
MEMORY_BANK_ID = "1204480903368146944"


# Memory service builder for deployment on Agent Runtime
def memory_bank_service_builder():
    return VertexAiMemoryBankService(
        project=PROJECT_ID,
        location=LOCATION,
        agent_engine_id=MEMORY_BANK_ID,
    )


# Memory extraction callback: sends conversation turns to Memory Bank
async def generate_memories_callback(callback_context: CallbackContext):
    await callback_context.add_session_to_memory()
    return None


# Build A2UI 0.8 system prompt
schema_manager = A2uiSchemaManager(
    version="0.8",
    catalogs=[BasicCatalog.get_config("0.8")],
)

a2ui_instruction = schema_manager.generate_system_prompt(
    role_description=(
        "You are JobPilot Agent, an AI job switch copilot powered by Gemini, Google Cloud Firestore, "
        "and Vertex AI Memory Bank. You help candidate Abhinav Srivastava (~2.5 years experience with "
        "C#, ASP.NET Web API, .NET 8, SQL, and Angular) discover jobs, inspect saved listings, and track application statuses. "
        "You remember user preferences across sessions, including critical personal details such as all user allergies "
        "(e.g. food, drug, environmental allergies) and dietary restrictions."
    ),
    workflow_description="Analyze the request, call tools as needed, and return structured UI when appropriate.",
    ui_description=(
        "Keep every surface tiny and flat: ONE Card > ONE Column > a few Text rows. "
        "Never nest a Card inside a Card. "
        "Use ONLY these components: Card, Column, Row, Text, and Image. Do not use "
        "Table or Heading (unsupported), or Buttons, actions, or forms (they do "
        "nothing in adk web). "
        "You may include one Image component, but only when you have a public https "
        "URL for the image. Set the Image url to that exact https link, for example "
        "{\"Image\": {\"url\": {\"literalString\": \"https://...\"}}}. Never point an "
        "Image at a bare filename, an artifact name, or a non-http(s) path. If you do "
        "not have a public URL, add a short Text line noting the image instead. "
        "No markdown in text; use the usageHint property ('h1', 'h2', 'body') for "
        "headings and emphasis. "
        "Output ONLY the raw A2UI JSON array — no prose, and never wrap it in "
        "<a2a_datapart_json> tags or 'kind'/'data'/'metadata' objects."
    ),
    include_schema=True,
    include_examples=True,
)

root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=a2ui_instruction,
    tools=[
        PreloadMemoryTool(),
        search_remote_jobs_api,
        fetch_live_greenhouse_jobs,
        list_saved_jobs,
        add_job_listing,
        list_candidate_applications,
        update_application,
    ],
    after_model_callback=a2ui_callback,
    after_agent_callback=generate_memories_callback,
)

app = App(
    root_agent=root_agent,
    name="app",
)




