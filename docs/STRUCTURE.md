# HireFlow AI — Repository Structure

This document maps every folder and file in the `hireflow-ai` repository.
Files marked **(Step 3)** are implemented in the backend milestone.
Files marked **(Step 4)** are implemented in the frontend milestone.
Files marked **(Step 5)** are implemented in the deployment milestone.

```
hireflow-ai/
├── backend/                          # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # (Step 3) FastAPI app entry point
│   │   ├── config.py                 # (Step 3) Settings from environment variables
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── health.py         # (Step 3) Health check endpoint
│   │   │       ├── jobs.py           # (Step 3) Job CRUD + JD upload
│   │   │       ├── candidates.py     # (Step 3) Candidate CRUD + review actions
│   │   │       ├── pipeline.py       # (Step 3) Trigger and monitor pipeline runs
│   │   │       └── audit.py          # (Step 3) Audit log queries
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py       # (Step 3) Main agent workflow runner
│   │   │   ├── state_machine.py      # (Step 3) Pipeline state transitions
│   │   │   └── planner.py            # (Step 3) Qwen planning step before execution
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_parser.py         # (Step 3) Extract text from resume PDFs
│   │   │   ├── jd_parser.py          # (Step 3) Parse job description via Qwen
│   │   │   ├── resume_extractor.py   # (Step 3) Structure resume data via Qwen
│   │   │   ├── embedding_service.py  # (Step 3) Generate vector embeddings
│   │   │   ├── semantic_matcher.py   # (Step 3) Qdrant similarity scoring
│   │   │   ├── candidate_scorer.py   # (Step 3) Combined scoring via Qwen
│   │   │   ├── report_generator.py   # (Step 3) Evaluation report generation
│   │   │   ├── email_sender.py       # (Step 3) Gmail SMTP shortlist emails
│   │   │   ├── calendar_scheduler.py # (Step 3) Google Calendar via Service Account
│   │   │   ├── audit_logger.py       # (Step 3) Write decisions to MongoDB
│   │   │   └── feedback_learner.py   # (Step 3) Adjust weights from recruiter feedback
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── qwen_client.py        # (Step 3) Qwen Cloud API wrapper + token counter
│   │   │   ├── mongodb.py            # (Step 3) MongoDB Atlas connection
│   │   │   ├── qdrant_service.py     # (Step 3) Qdrant vector DB connection
│   │   │   └── oss_storage.py        # (Step 3) Alibaba Cloud OSS file storage
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── job.py                # (Step 3) Job Pydantic schemas
│   │   │   ├── candidate.py          # (Step 3) Candidate Pydantic schemas
│   │   │   ├── audit_log.py          # (Step 3) Audit log Pydantic schemas
│   │   │   └── pipeline.py           # (Step 3) Pipeline run Pydantic schemas
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── token_counter.py      # (Step 3) Real-time token usage tracking
│   │       └── exceptions.py         # (Step 3) Custom exception classes
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_health.py            # (Step 3) Health endpoint tests
│   │   └── fixtures/
│   │       └── .gitkeep              # Sample PDFs for local testing
│   ├── requirements.txt              # Python dependencies
│   └── .env.example                  # Environment variable template
│
├── frontend/                         # React dashboard (Vite)
│   ├── public/
│   │   └── .gitkeep
│   ├── src/
│   │   ├── components/
│   │   │   ├── JobIntakePanel.jsx    # (Step 4) JD paste/upload form
│   │   │   ├── ResumeUploadZone.jsx  # (Step 4) Drag-and-drop PDF upload
│   │   │   ├── PipelineView.jsx      # (Step 4) Kanban pipeline stages
│   │   │   ├── CandidateDetail.jsx   # (Step 4) Score breakdown + reasoning
│   │   │   ├── ReviewPanel.jsx       # (Step 4) Human-in-the-loop actions
│   │   │   ├── AuditLogViewer.jsx    # (Step 4) Searchable audit timeline
│   │   │   └── FeedbackForm.jsx      # (Step 4) Recruiter score feedback
│   │   ├── pages/
│   │   │   └── Dashboard.jsx         # (Step 4) Main dashboard page
│   │   ├── services/
│   │   │   └── api.js                # (Step 4) REST API client
│   │   ├── hooks/
│   │   │   └── useWebSocket.js       # (Step 4) Real-time pipeline updates
│   │   ├── styles/
│   │   │   └── global.css            # (Step 4) Global styles
│   │   ├── App.jsx                   # (Step 4) Root React component
│   │   └── main.jsx                  # (Step 4) React entry point
│   ├── index.html                    # Vite HTML shell
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite dev server + proxy config
│   └── .env.example                  # Frontend environment variables
│
├── deploy/                           # Alibaba Cloud deployment (Step 5)
│   ├── Dockerfile                    # (Step 5) Multi-stage Docker build
│   ├── docker-compose.yml            # (Step 5) Local + ECS compose config
│   └── alibaba-ecs-setup.md          # (Step 5) ECS deployment guide
│
├── docs/
│   └── STRUCTURE.md                  # This file
│
├── credentials/                      # Local secrets (never committed)
│   └── .gitkeep                      # Place google-service-account.json here
│
├── .gitignore
├── LICENSE                           # MIT License
├── README.md                         # Project overview
└── instructions.md                   # Private build guide (gitignored)
```

## Data Flow Through Modules

```
Upload (API routes) → Orchestrator → Tools → Services → External APIs
                         ↓
                    Audit Logger → MongoDB
                         ↓
                    WebSocket → Frontend Dashboard
```

## Environment Files

| File | Purpose |
|------|---------|
| `backend/.env.example` | All backend secrets and config keys |
| `frontend/.env.example` | API base URL for React app |
| `credentials/google-service-account.json` | Google Calendar Service Account (local only) |
