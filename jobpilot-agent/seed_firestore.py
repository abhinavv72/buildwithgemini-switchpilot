#!/usr/bin/env python3
"""
Seed Firestore with sensible JobPilot job postings and candidate application records.
Hardcodes project ID 'qwiklabs-gcp-04-5de1df139dd5' as requested.
"""
from google.cloud import firestore
import datetime

PROJECT_ID = "qwiklabs-gcp-04-5de1df139dd5"

def seed():
    print(f"Connecting to Firestore for project: {PROJECT_ID}...")
    db = firestore.Client(project=PROJECT_ID)

    # 1. Seed job listings in 'jobpilot_jobs'
    jobs = [
        {
            "id": "job-net-blr",
            "company": "Acme Cloud Platform",
            "title": "Backend Engineer (.NET / C#)",
            "location": "Bengaluru, Karnataka, India",
            "remote_eligibility": "Hybrid",
            "primary_skills": ["C#", ".NET 8", "ASP.NET Web API", "SQL", "REST APIs"],
            "experience_required_years": 2.5,
            "salary": "₹14 LPA - ₹18 LPA",
            "url": "https://example.com/careers/acme/backend-net",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
        {
            "id": "job-fs-hyd",
            "company": "FinTech Orbit Global",
            "title": "Full-Stack Software Engineer (C# / Angular)",
            "location": "Hyderabad, Telangana, India",
            "remote_eligibility": "Hybrid",
            "primary_skills": ["C#", ".NET 8", "SQL", "Angular", "TypeScript"],
            "experience_required_years": 3.0,
            "salary": "₹15 LPA - ₹20 LPA",
            "url": "https://example.com/careers/fintech-orbit/fullstack",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
        {
            "id": "job-sre-remote",
            "company": "Nexus Infrastructure",
            "title": "Platform & Site Reliability Engineer",
            "location": "Remote (India Eligible)",
            "remote_eligibility": "Remote",
            "primary_skills": ["Kubernetes", "Docker", "Go", "GCP", "CI/CD"],
            "experience_required_years": 4.0,
            "salary": "₹18 LPA - ₹24 LPA",
            "url": "https://example.com/careers/nexus/sre",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    ]

    print("Seeding 'jobpilot_jobs' collection...")
    for j in jobs:
        doc_ref = db.collection("jobpilot_jobs").document(j["id"])
        doc_ref.set(j)
        print(f"  ✓ Seeded job: {j['title']} at {j['company']}")

    # 2. Seed application tracker records in 'jobpilot_applications'
    applications = [
        {
            "id": "app-acme-1",
            "job_id": "job-net-blr",
            "candidate_name": "Abhinav Srivastava",
            "status": "Ready for Review",
            "user_reported_status": True,
            "notes": "Truthful tailored resume prepared emphasizing .NET 8, C#, and SQL Server performance tuning.",
            "target_role": "Backend Engineer (.NET / C#)",
            "company": "Acme Cloud Platform",
            "applied_url": "https://example.com/careers/acme/backend-net",
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    ]

    print("Seeding 'jobpilot_applications' collection...")
    for a in applications:
        doc_ref = db.collection("jobpilot_applications").document(a["id"])
        doc_ref.set(a)
        print(f"  ✓ Seeded application: {a['target_role']} at {a['company']}")

    print("Firestore seeding completed successfully!")

if __name__ == "__main__":
    seed()
