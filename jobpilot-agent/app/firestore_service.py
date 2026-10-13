"""
Firestore service for JobPilot Agent.
Hardcodes project ID 'qwiklabs-gcp-04-5de1df139dd5' as requested to prevent
Agent Platform google.auth.default() / GOOGLE_CLOUD_PROJECT returning project numbers.
"""
from typing import Dict, Any, List, Optional
import datetime
from google.cloud import firestore

PROJECT_ID = "qwiklabs-gcp-04-5de1df139dd5"

_client: Optional[firestore.Client] = None

def get_firestore_client() -> firestore.Client:
    global _client
    if _client is None:
        _client = firestore.Client(project=PROJECT_ID)
    return _client

def list_jobs(limit: int = 10) -> List[Dict[str, Any]]:
    """List job postings stored in the Firestore database."""
    db = get_firestore_client()
    docs = db.collection("jobpilot_jobs").limit(limit).stream()
    return [doc.to_dict() for doc in docs]

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific job posting by its ID."""
    db = get_firestore_client()
    doc = db.collection("jobpilot_jobs").document(job_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def save_job(
    job_id: str,
    company: str,
    title: str,
    location: str,
    remote_eligibility: str,
    primary_skills: List[str],
    salary: str = "Not disclosed",
    url: str = ""
) -> Dict[str, Any]:
    """Save or update a job posting in Firestore."""
    db = get_firestore_client()
    data = {
        "id": job_id,
        "company": company,
        "title": title,
        "location": location,
        "remote_eligibility": remote_eligibility,
        "primary_skills": primary_skills,
        "salary": salary,
        "url": url,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    db.collection("jobpilot_jobs").document(job_id).set(data, merge=True)
    return {"status": "success", "job": data}

def list_applications() -> List[Dict[str, Any]]:
    """List tracked job applications from Firestore."""
    db = get_firestore_client()
    docs = db.collection("jobpilot_applications").stream()
    return [doc.to_dict() for doc in docs]

def update_application_status(
    app_id: str,
    status: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Update status of a tracked job application (e.g. Preparing, Ready for Review, Applied, Interview, Rejected)."""
    db = get_firestore_client()
    doc_ref = db.collection("jobpilot_applications").document(app_id)
    doc = doc_ref.get()
    if not doc.exists:
        return {"status": "error", "message": f"Application {app_id} not found"}
    
    update_data: Dict[str, Any] = {
        "status": status,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "user_reported_status": True
    }
    if notes is not None:
        update_data["notes"] = notes
        
    doc_ref.set(update_data, merge=True)
    return {"status": "success", "app_id": app_id, "updated": update_data}
