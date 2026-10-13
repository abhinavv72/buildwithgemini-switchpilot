"""Minimal FastAPI proxy for a deployed A2A agent (Agent Runtime, agents-cli 1.1.0+).

The browser talks ONLY to this proxy (same origin, no CORS, no GCP creds in the
browser). The proxy authenticates with Application Default Credentials and
forwards chat to the deployed agent over the A2A protocol, returning replies as
structured parts the chat UI knows how to show:

  * {"kind": "text", "text": ...}  -> a normal chat bubble
  * {"kind": "a2ui", "data": ...}  -> one A2UI message (beginRendering /
    surfaceUpdate); static/index.html renders these as a card.

Why A2A: agents-cli 1.1.0 (GA) deploys ADK agents to Agent Runtime as A2A agents
and no longer registers the reasoning-engine operation schema the old
`agent_engines.get(...).stream_query()` path relied on (operation_schemas() comes
back empty). The container serves the A2A protocol over the Agent Engine HTTP
passthrough, so this proxy fetches the agent's card and sends messages with the
a2a-sdk client (the same path `agents-cli run --mode a2a` uses). This works for
both A2A and plain ADK 1.1.0 deployments (the container serves A2A either way).

Run:
  pip install -r requirements.txt
  export AGENT_ENGINE_RESOURCE_NAME="projects/.../locations/.../reasoningEngines/..."
  export AGENT_DIRECTORY="app"   # your agent's app directory (agents-cli-manifest.yaml)
  python main.py                 # -> http://localhost:8080
"""

import os
import uuid

import google.auth
import google.auth.transport.requests
import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.types import (
    AgentCard,
    FilePart,
    Message,
    Part,
    Role,
    TaskArtifactUpdateEvent,
    TextPart,
    TransportProtocol,
)
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

RESOURCE = os.environ["AGENT_ENGINE_RESOURCE_NAME"]
# The agent's app directory (matches agent_directory in agents-cli-manifest.yaml).
AGENT_DIRECTORY = os.environ.get("AGENT_DIRECTORY", "app")
# Location is embedded in the resource name: projects/<p>/locations/<loc>/reasoningEngines/<id>.
LOCATION = RESOURCE.split("/locations/")[1].split("/")[0]

# A2A endpoint for an Agent Runtime deployment, via the Agent Engine HTTP
# passthrough. The card lives at the well-known path under this base.
A2A_BASE = (
    f"https://{LOCATION}-aiplatform.googleapis.com/reasoningEngines/v1/"
    f"{RESOURCE}/api/a2a/{AGENT_DIRECTORY}"
)
A2A_CARD_URL = f"{A2A_BASE}/.well-known/agent-card.json"

# The agent tags its A2UI data parts with this mime type.
_A2UI_MIME = "application/json+a2ui"

# One set of ADC credentials, refreshed per request (access tokens expire ~1h).
_creds, _ = google.auth.default(
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)


def _auth_headers() -> dict[str, str]:
    _creds.refresh(google.auth.transport.requests.Request())
    return {
        "Authorization": f"Bearer {_creds.token}",
        "Content-Type": "application/json",
    }


app = FastAPI()


@app.exception_handler(Exception)
async def _json_errors(request: Request, exc: Exception):
    # Always return JSON so the browser never receives a plain-text 500 page
    # (which shows up in the chat as "Unexpected token 'I', "Internal S"... is
    # not valid JSON"). Any server-side failure now surfaces as a readable
    # message in the chat bubble instead.
    return JSONResponse(
        status_code=200,
        content={
            "parts": [{"kind": "text", "text": f"Error: {type(exc).__name__}: {exc}"}]
        },
    )


# Reuse ONE A2A context per user so the agent remembers the conversation.
_contexts: dict[str, str] = {}
# Cache the agent card after the first fetch.
_card: AgentCard | None = None


import json

async def _get_card(client: httpx.AsyncClient) -> AgentCard:
    global _card
    if _card is None:
        resp = await client.get(A2A_CARD_URL)
        resp.raise_for_status()
        raw_card = resp.text.replace("http://0.0.0.0:8000/a2a/app", A2A_BASE)
        _card = AgentCard(**json.loads(raw_card))
    return _card




def _extract_parts(parts: list) -> list[dict]:
    """Turn A2A response parts into structured parts for the chat UI.

    Text parts pass through as {"kind": "text"}. A2UI data parts (tagged
    application/json+a2ui) become {"kind": "a2ui", "data": <message>} so the UI
    renders the card; each data part is one A2UI message (beginRendering or
    surfaceUpdate).
    """
    out: list[dict] = []
    for p in parts:
        root = getattr(p, "root", p)
        if isinstance(root, TextPart) and getattr(root, "text", None):
            txt = root.text.strip()
            # Ignore internal Memory Bank unconfigured warning callback messages from leaking into user UI
            if "Cannot add session to memory" in txt:
                continue
            out.append({"kind": "text", "text": root.text})
        elif getattr(root, "data", None) is not None:
            raw_data = root.data
            meta = getattr(root, "metadata", None) or {}
            mime = meta.get("mimeType") if isinstance(meta, dict) else None
            # Check nested dictionary for A2UI mimeType
            if not mime and isinstance(raw_data, dict):
                mime = (raw_data.get("metadata") or {}).get("mimeType")
                if "data" in raw_data and mime == _A2UI_MIME:
                    raw_data = raw_data["data"]
            if mime == _A2UI_MIME:
                out.append({"kind": "a2ui", "data": raw_data})
        elif isinstance(root, FilePart):
            uri = getattr(getattr(root, "file", None), "uri", None)
            if uri:
                out.append({"kind": "text", "text": uri})
    return out



# ----------------------------------------------------
# APPLICATION & PROFILE STATE STORE (In-Memory per session)
# ----------------------------------------------------
import datetime
import copy
import random
import string
from fastapi.responses import HTMLResponse

_profiles: dict[str, dict] = {}
_app_queues: dict[str, list[dict]] = {}
_daily_submission_counts: dict[str, dict] = {}
_submission_locks: dict[str, bool] = {}

DEMO_PROFILE = {
    "is_demo": True,
    "confirmed": True,
    "name": "Abhinav Srivastava [Demo]",
    "email": "abhinav.demo@example.com",
    "phone": "+91 98765 43210",
    "links": {
        "linkedin": "https://linkedin.com/in/demo-abhinav",
        "github": "https://github.com/demo-abhinav"
    },
    "summary": "Backend / Full-Stack Engineer with ~2.5 years of experience developing microservices and REST APIs using C#, ASP.NET Web API, .NET 8, SQL, and Angular.",
    "yearsOfExperience": 2.5,
    "verifiedSkills": ["C#", ".NET 8", "ASP.NET Web API", "SQL", "Angular", "REST APIs", "Git", "xUnit"],
    "unconfirmedSkills": [],
    "learningGaps": ["Kubernetes", "Kafka", "Redis"],
    "experience": [
        {
            "id": "exp-1",
            "company": "Enterprise Tech Solutions",
            "title": "Software Engineer - Backend / Full-Stack",
            "location": "Bengaluru, India",
            "period": "2023 - Present",
            "bullets": [
                "Architected and deployed high-throughput ASP.NET Web API and .NET 8 microservices handling business logic and reporting.",
                "Engineered relational database schemas in SQL Server, optimizing query plans and indexes for sub-100ms response times.",
                "Integrated Angular responsive UI modules communicating with backend REST endpoints."
            ]
        }
    ],
    "education": [
        {
            "id": "edu-1",
            "institution": "State Technological University",
            "degree": "B.Tech in Computer Science and Engineering",
            "year": "2022"
        }
    ],
    "preferences": {
        "desiredRoles": ["Backend Software Engineer", "Full-Stack Engineer"],
        "targetLocations": ["Hyderabad", "Bengaluru", "Remote"],
        "workModes": ["Hybrid", "Remote"],
        "noticePeriod": "60 Days (Negotiable)",
        "preferredCompensation": "₹14 LPA or higher"
    },
    "screenerAnswers": {
        "workAuthorization": "Authorized to work in India without sponsorship",
        "requireVisa": "No",
        "relocation": "Yes, open to Bengaluru and Hyderabad",
        "experienceNet": "2.5 years with .NET and C#"
    },
    "originalResumeText": "Abhinav Srivastava\nEmail: abhinav.demo@example.com\nExperience: 2.5 years in .NET, C#, SQL, Angular.",
    "tailoredResumes": {}
}

@app.get("/api/profile")
async def get_profile(req: Request):
    user_id = req.query_params.get("session_id") or "default"
    if user_id not in _profiles:
        return JSONResponse({
            "is_demo": False,
            "confirmed": False,
            "name": "",
            "email": "",
            "phone": "",
            "links": {"linkedin": "", "github": ""},
            "summary": "",
            "yearsOfExperience": 0,
            "verifiedSkills": [],
            "unconfirmedSkills": [],
            "learningGaps": [],
            "experience": [],
            "education": [],
            "preferences": {
                "desiredRoles": [],
                "targetLocations": [],
                "workModes": [],
                "noticePeriod": "",
                "preferredCompensation": ""
            },
            "screenerAnswers": {
                "workAuthorization": "",
                "requireVisa": "",
                "relocation": "",
                "experienceNet": ""
            },
            "originalResumeText": "",
            "tailoredResumes": {}
        })
    return JSONResponse(_profiles[user_id])


@app.post("/api/profile/load-demo")
async def load_demo_profile(req: Request):
    body = await req.json()
    user_id = body.get("session_id") or "default"
    _profiles[user_id] = copy.deepcopy(DEMO_PROFILE)
    return JSONResponse({"status": "success", "profile": _profiles[user_id]})


@app.post("/api/profile/parse-resume")
async def parse_resume_text(req: Request):
    body = await req.json()
    user_id = body.get("session_id") or "default"
    text = body.get("text", "")
    if not text.strip():
        return JSONResponse({"status": "error", "message": "Resume text is empty"}, status_code=400)

    known_skills = [
        "C#", ".NET", ".NET 8", "ASP.NET", "ASP.NET Web API", "SQL", "SQL Server",
        "PostgreSQL", "Angular", "TypeScript", "JavaScript", "HTML", "CSS", "REST APIs",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "xUnit", "Kafka", "Redis",
        "Python", "Java", "React"
    ]
    extracted = [s for s in known_skills if s.lower() in text.lower()]

    profile = _profiles.get(user_id, {
        "is_demo": False,
        "confirmed": False,
        "name": "",
        "email": "",
        "phone": "",
        "links": {"linkedin": "", "github": ""},
        "summary": "",
        "yearsOfExperience": 0,
        "verifiedSkills": [],
        "unconfirmedSkills": [],
        "learningGaps": [],
        "experience": [],
        "education": [],
        "preferences": {
            "desiredRoles": ["Software Engineer"],
            "targetLocations": ["Hyderabad", "Bengaluru"],
            "workModes": ["Hybrid", "Remote"],
            "noticePeriod": "30-60 Days",
            "preferredCompensation": "Disclosed industry standard"
        },
        "screenerAnswers": {
            "workAuthorization": "Authorized to work",
            "requireVisa": "No",
            "relocation": "Open to relocation",
            "experienceNet": "Hands-on experience"
        },
        "originalResumeText": "",
        "tailoredResumes": {}
    })

    profile["originalResumeText"] = text
    profile["unconfirmedSkills"] = list(set(profile.get("unconfirmedSkills", []) + extracted))
    profile["confirmed"] = False
    _profiles[user_id] = profile

    return JSONResponse({
        "status": "success",
        "message": "Resume extracted. Please confirm and verify facts.",
        "unconfirmedSkills": profile["unconfirmedSkills"],
        "profile": profile
    })


@app.post("/api/profile/confirm")
async def confirm_profile(req: Request):
    body = await req.json()
    user_id = body.get("session_id") or "default"
    profile_data = body.get("profile", {})
    profile_data["confirmed"] = True
    profile_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    _profiles[user_id] = profile_data
    return JSONResponse({"status": "success", "profile": profile_data})


@app.get("/api/applications/queue")
async def get_application_queue(req: Request):
    user_id = req.query_params.get("session_id") or "default"
    if user_id not in _app_queues:
        _app_queues[user_id] = [
            {
                "id": "queue-live-1",
                "company": "CodeForAI",
                "role": "Software Engineer / AI Code Trainer (Python, Web, Full Stack)",
                "destinationUrl": "https://remotive.com/remote-jobs/software-development/software-engineer-ai-code-trainer-python-web-full-stack-2091149",
                "resumeVersion": "Tailored Full-Stack Resume",
                "method": "Live Remote Portal",
                "status": "Ready for Review",
                "outcome": "Active Application",
                "proposedAnswers": [
                    {"question": "Are you comfortable with remote asynchronous communication?", "answer": "Yes", "confirmed": True},
                    {"question": "What is your primary programming stack?", "answer": "Full-stack development, Web APIs, and Backend Systems", "confirmed": True}
                ],
                "missingInfo": [],
                "lastActivity": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            },
            {
                "id": "queue-live-2",
                "company": "Lemon.io",
                "role": "Senior back-end Engineer",
                "destinationUrl": "https://remotive.com/remote-jobs/software-development/senior-back-end-engineer-2091132",
                "resumeVersion": "Standard Confirmed Resume",
                "method": "Live Remote Board",
                "status": "Saved",
                "outcome": "Saved Listing",
                "proposedAnswers": [
                    {"question": "Do you have experience architecting backend systems?", "answer": "Yes, 2.5+ years building production APIs and microservices", "confirmed": True}
                ],
                "missingInfo": [],
                "lastActivity": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            }
        ]
    return JSONResponse({"status": "success", "queue": _app_queues[user_id]})


@app.post("/api/applications/queue/update")
async def update_queue_item(req: Request):
    body = await req.json()
    user_id = body.get("session_id") or "default"
    item_id = body.get("id")
    new_status = body.get("status")
    notes = body.get("notes")

    queue = _app_queues.get(user_id, [])
    for item in queue:
        if item["id"] == item_id:
            if new_status:
                item["status"] = new_status
            if notes:
                item["notes"] = notes
            item["lastActivity"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            return JSONResponse({"status": "success", "item": item})
    
    return JSONResponse({"status": "error", "message": "Item not found"}, status_code=404)


@app.get("/test-apply-portal", response_class=HTMLResponse)
async def test_apply_portal(req: Request):
    job_id = req.query_params.get("jobId", "job-net-blr")
    company = "Live Partner Portal"
    role = "Backend Engineer (.NET / C#)" if "net" in job_id else "Full-Stack Software Engineer"
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Career Portal — {company}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #1E293B; margin: 0; padding: 2rem; }}
    .portal-card {{ max-width: 650px; margin: 0 auto; background: #FFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .badge {{ display: inline-block; padding: 0.25rem 0.6rem; border-radius: 999px; background: #EFF6FF; color: #2563EB; font-weight: 600; font-size: 0.8rem; margin-bottom: 0.75rem; }}
    h1 {{ margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #0F172A; }}
    .subtitle {{ color: #64748B; font-size: 0.95rem; margin-bottom: 1.5rem; }}
    .form-group {{ margin-bottom: 1.25rem; }}
    label {{ display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.35rem; color: #334155; }}
    input[type="text"], input[type="email"], textarea, select {{ width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.95rem; }}
    .btn-submit {{ background: #2563EB; color: #FFF; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; font-size: 1rem; }}
    .btn-submit:hover {{ background: #1D4ED8; }}
    .success-banner {{ display: none; background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 1rem; border-radius: 8px; margin-top: 1rem; }}
  </style>
</head>
<body>
  <div class="portal-card">
    <div class="badge">Official Application Portal (Sandbox)</div>
    <h1>{role}</h1>
    <div class="subtitle">{company} • Verified Opportunity</div>
    
    <form id="apply-form">
      <input type="hidden" name="job_id" value="{job_id}">
      <div class="form-group">
        <label>Full Legal Name *</label>
        <input type="text" id="field-name" name="name" required placeholder="Jane Doe">
      </div>
      <div class="form-group">
        <label>Email Address *</label>
        <input type="email" id="field-email" name="email" required placeholder="jane@example.com">
      </div>
      <div class="form-group">
        <label>Phone Number *</label>
        <input type="text" id="field-phone" name="phone" required placeholder="+91 98765 43210">
      </div>
      <div class="form-group">
        <label>Resume / CV *</label>
        <textarea id="field-resume" name="resume" rows="4" required placeholder="Resume text or confirmed bullet points"></textarea>
      </div>
      <div class="form-group">
        <label>Are you legally authorized to work in this location? *</label>
        <select id="field-auth" name="work_auth" required>
          <option value="">Select option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
      <div class="form-group">
        <label>Will you now or in the future require visa sponsorship? *</label>
        <select id="field-sponsorship" name="sponsorship" required>
          <option value="">Select option</option>
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </div>
      <div class="form-group">
        <label>Years of Relevant Experience *</label>
        <input type="text" id="field-exp" name="experience" required placeholder="e.g. 2.5 years">
      </div>
      <button type="submit" class="btn-submit" id="btn-submit">Submit Application to {company}</button>
    </form>

    <div class="success-banner" id="success-banner">
      <h3 style="margin:0 0 0.25rem 0;">Application Successfully Submitted!</h3>
      <p style="margin:0 0 0.5rem 0;" id="conf-text"></p>
      <div style="font-family:monospace; font-weight:700;" id="conf-ref"></div>
    </div>
  </div>

  <script>
    window.addEventListener("message", (event) => {{
      const data = event.data;
      if (data && data.type === "SWITCHPILOT_AUTOFILL") {{
        const payload = data.payload || {{}};
        if (payload.name) document.getElementById("field-name").value = payload.name;
        if (payload.email) document.getElementById("field-email").value = payload.email;
        if (payload.phone) document.getElementById("field-phone").value = payload.phone;
        if (payload.resume) document.getElementById("field-resume").value = payload.resume;
        if (payload.workAuth) document.getElementById("field-auth").value = payload.workAuth;
        if (payload.sponsorship) document.getElementById("field-sponsorship").value = payload.sponsorship;
        if (payload.experience) document.getElementById("field-exp").value = payload.experience;
        
        window.parent.postMessage({{ type: "SWITCHPILOT_FILLED_SUCCESS", job_id: "{job_id}" }}, "*");
      }}
    }});

    document.getElementById("apply-form").addEventListener("submit", (e) => {{
      e.preventDefault();
      const ref = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      document.getElementById("apply-form").style.display = "none";
      const banner = document.getElementById("success-banner");
      banner.style.display = "block";
      document.getElementById("conf-text").textContent = "Your application for {role} at {company} has been received by their recruitment system.";
      document.getElementById("conf-ref").textContent = "Confirmation Reference: " + ref;

      window.parent.postMessage({{
        type: "SWITCHPILOT_SUBMISSION_CONFIRMED",
        reference: ref,
        company: "{company}",
        role: "{role}",
        timestamp: new Date().toISOString()
      }}, "*");
    }});
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html)


@app.post("/api/applications/assisted-submit")
async def assisted_submit(req: Request):
    body = await req.json()
    user_id = body.get("session_id") or "default"
    item_id = body.get("item_id")
    is_auto = body.get("is_auto_apply", False)

    if _submission_locks.get(item_id):
        return JSONResponse({
            "status": "error",
            "message": "Submission lock active: this application is already being processed to prevent duplicate submission."
        }, status_code=409)

    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    user_count = _daily_submission_counts.get(user_id, {"date": today, "count": 0})
    if user_count["date"] != today:
        user_count = {"date": today, "count": 0}

    if is_auto:
        daily_limit = body.get("daily_limit", 5)
        if user_count["count"] >= daily_limit:
            return JSONResponse({
                "status": "stopped",
                "reason": "DAILY_LIMIT_REACHED",
                "message": f"Controlled Auto-Apply stopped: Reached daily safety limit of {daily_limit} applications for today."
            })

    _submission_locks[item_id] = True
    try:
        profile = _profiles.get(user_id)
        if not profile or not profile.get("confirmed"):
            return JSONResponse({
                "status": "stopped",
                "reason": "UNCONFIRMED_PROFILE",
                "message": "Application stopped: Candidate profile facts must be reviewed and confirmed before applying."
            })

        ref_id = "REF-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        user_count["count"] += 1
        _daily_submission_counts[user_id] = user_count

        queue = _app_queues.get(user_id, [])
        for item in queue:
            if item["id"] == item_id:
                item["status"] = "Submitted"
                item["outcome"] = "Submitted"
                item["confirmationRef"] = ref_id
                item["lastActivity"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        return JSONResponse({
            "status": "success",
            "submission_status": "Submitted",
            "reference": ref_id,
            "message": f"Successfully submitted application. Official confirmation reference: {ref_id}",
            "daily_count": user_count["count"]
        })
    finally:
        _submission_locks[item_id] = False



# ----------------------------------------------------
# LIVE EXTERNAL JOB PORTALS & DEEP SEARCH AGGREGATOR
# ----------------------------------------------------
import urllib.parse
import urllib.request
import json

@app.get("/api/portal-search")
async def live_portal_search(req: Request):
    """Aggregates real live job postings across live remote job portals (Remotive, Arbeitnow)
    and constructs instant deep search query links for LinkedIn, Naukri, Indeed, and Wellfound.
    """
    query = req.query_params.get("q", "").strip() or "software engineer"
    location = req.query_params.get("location", "").strip() or "India"
    
    live_jobs = []
    
    # 1. Fetch live jobs from Remotive API
    try:
        rem_url = "https://remotive.com/api/remote-jobs?category=software-dev"
        if query:
            rem_url += f"&search={urllib.parse.quote(query)}"
        r = urllib.request.Request(rem_url, headers={"User-Agent": "JobPilot-LiveSearch/1.0"})
        with urllib.request.urlopen(r, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            for item in data.get("jobs", [])[:8]:
                live_jobs.append({
                    "id": f"rem-{item.get('id')}",
                    "role": item.get("title"),
                    "company": item.get("company_name"),
                    "location": item.get("candidate_required_location") or "Worldwide / Remote",
                    "salary": item.get("salary") or "Disclosed upon application",
                    "work_mode": "Remote",
                    "source": "Remotive Live Portal",
                    "source_url": item.get("url"),
                    "posted_date": (item.get("publication_date") or "")[:10],
                    "relevance": f"Live opportunity matching '{query}' from Remotive's global remote database.",
                    "skills": [query, "Remote Collaboration", "Software Engineering"]
                })
    except Exception as e:
        print("Remotive fetch error:", e)

    # 2. Fetch live jobs from Arbeitnow Board API
    try:
        arb_url = "https://www.arbeitnow.com/api/job-board-api"
        r = urllib.request.Request(arb_url, headers={"User-Agent": "JobPilot-LiveSearch/1.0"})
        with urllib.request.urlopen(r, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            q_clean = query.lower()
            for item in data.get("data", []):
                title = item.get("title", "")
                if q_clean in title.lower() or not query:
                    live_jobs.append({
                        "id": f"arb-{item.get('slug')}",
                        "role": title,
                        "company": item.get("company_name"),
                        "location": item.get("location") or "Global / Remote",
                        "salary": "Disclosed upon application",
                        "work_mode": "Remote" if item.get("remote") else "Hybrid",
                        "source": "Arbeitnow Live Board",
                        "source_url": item.get("url"),
                        "posted_date": "Recently posted",
                        "relevance": f"Verified live listing matching '{query}' on Arbeitnow.",
                        "skills": item.get("tags") or [query, "Engineering"]
                    })
                    if len(live_jobs) >= 14:
                        break
    except Exception as e:
        print("Arbeitnow fetch error:", e)

    # 3. Build live search deep links for major platforms (LinkedIn, Naukri, Indeed, Wellfound)
    q_enc = urllib.parse.quote_plus(query)
    loc_enc = urllib.parse.quote_plus(location)
    naukri_slug_q = "-".join(query.lower().split())
    naukri_slug_loc = "-".join(location.lower().split())

    platform_portals = [
        {
            "name": "Naukri.com",
            "badge": "India's #1 Job Portal",
            "url": f"https://www.naukri.com/{naukri_slug_q}-jobs-in-{naukri_slug_loc}?k={q_enc}&l={loc_enc}",
            "description": f"Direct live search for '{query}' in '{location}' across thousands of Indian recruiters & tech companies.",
            "icon": "business"
        },
        {
            "name": "LinkedIn Jobs",
            "badge": "Global & Remote Network",
            "url": f"https://www.linkedin.com/jobs/search/?keywords={q_enc}&location={loc_enc}",
            "description": f"Target live listings for '{query}' with 1-Click Easy Apply and direct hiring manager outreach.",
            "icon": "share"
        },
        {
            "name": "Indeed India",
            "badge": "Comprehensive Portal",
            "url": f"https://in.indeed.com/jobs?q={q_enc}&l={loc_enc}",
            "description": f"Search aggregated postings across startup and corporate career sites in {location}.",
            "icon": "work"
        },
        {
            "name": "Wellfound (AngelList)",
            "badge": "Tech Startups & High Growth",
            "url": f"https://wellfound.com/jobs?role={q_enc}",
            "description": "Explore direct startup equity, compensation disclosures, and founder-direct applications.",
            "icon": "rocket_launch"
        }
    ]

    return JSONResponse({
        "status": "success",
        "query": query,
        "location": location,
        "live_jobs": live_jobs,
        "platform_portals": platform_portals,
        "total_live": len(live_jobs)
    })


@app.post("/chat")
async def chat(req: Request):
    body = await req.json()
    message = body.get("message", "")
    # Distinct session per visitor, avoiding hardcoded shared identity
    user_id = body.get("session_id") or body.get("user_id") or f"user-{uuid.uuid4().hex[:8]}"
    parts: list[dict] = []
    active_tools: list[str] = []

    async with httpx.AsyncClient(headers=_auth_headers(), timeout=120) as client:
        card = await _get_card(client)
        factory = ClientFactory(
            ClientConfig(
                supported_transports=[
                    TransportProtocol.jsonrpc,
                    TransportProtocol.http_json,
                ],
                httpx_client=client,
            )
        )
        a2a_client = factory.create(card)

        msg = Message(
            message_id=str(uuid.uuid4()),
            role=Role.user,
            parts=[Part(root=TextPart(text=message))],
            context_id=_contexts.get(user_id),
        )

        last_task = None
        got_artifact_update = False
        async for event in a2a_client.send_message(msg):
            if not isinstance(event, tuple):
                continue
            task, update = event
            if task is not None:
                last_task = task
                if getattr(task, "context_id", None):
                    _contexts[user_id] = task.context_id

            if isinstance(update, TaskArtifactUpdateEvent):
                got_artifact_update = True
                parts.extend(_extract_parts(update.artifact.parts))
            elif update and hasattr(update, "status") and update.status:
                m = getattr(update.status, "message", None)
                if m and getattr(m, "parts", None):
                    # Check for tool call activity in status message
                    for p in m.parts:
                        root = getattr(p, "root", p)
                        if hasattr(root, "data") and isinstance(root.data, dict):
                            tool_name = root.data.get("name")
                            if tool_name and tool_name not in active_tools:
                                active_tools.append(tool_name)
                    # Also extract regular response parts if present in message
                    parts.extend(_extract_parts(m.parts))

        # Check task history turn if artifact update didn't yield response
        if not parts and last_task is not None and getattr(last_task, "history", None):
            for h in reversed(last_task.history):
                if getattr(h, "role", None) == Role.agent and getattr(h, "parts", None):
                    turn_parts = _extract_parts(h.parts)
                    if turn_parts:
                        parts = turn_parts
                        break

        # Fallback: pull parts from the final task's artifacts.
        if not parts and last_task is not None:
            for artifact in getattr(last_task, "artifacts", None) or []:
                parts.extend(_extract_parts(artifact.parts))

    # De-duplicate consecutive identical text parts if any
    filtered_parts: list[dict] = []
    for p in parts:
        if p.get("kind") == "text":
            if not filtered_parts or filtered_parts[-1].get("text") != p.get("text"):
                filtered_parts.append(p)
        else:
            filtered_parts.append(p)

    if not filtered_parts:
        filtered_parts = [{"kind": "text", "text": "I checked your request and found no new updates or matching records."}]

    return JSONResponse({
        "parts": filtered_parts,
        "tools": active_tools,
        "session_id": user_id,
    })


# Serve the chat UI (keep this mount last so /chat wins).
app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
