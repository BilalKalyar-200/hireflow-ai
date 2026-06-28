# HireFlow AI

**Autonomous AI agents that screen, score, and schedule so hiring runs itself.**

[![Global AI Hackathon by Qwen Cloud](https://img.shields.io/badge/Hackathon-Global%20AI%20Hackathon%20by%20Qwen%20Cloud-blue)](https://devpost.com)
[![Track 4 — Autopilot Agent](https://img.shields.io/badge/Track-4%20Autopilot%20Agent-purple)](https://devpost.com)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## About

HireFlow AI is a production-ready autonomous recruitment agent that automates the entire hiring pipeline from job posting to interview scheduling. A recruiter inputs a job description, and the agent parses requirements, accepts resume uploads, and extracts structured candidate data from PDFs. Each candidate is scored and ranked against the job description using Qwen LLM reasoning combined with semantic vector matching. Top candidates receive shortlisting emails and interview slots are booked automatically via calendar integration, while borderline cases are flagged for human review before any action is taken. Every decision is logged in a full audit trail, and a real-time dashboard shows pipeline status as the agent works.

## Key Features

1. **Multi-step autonomous reasoning** — not just one API call; the agent plans and executes a full hiring workflow end-to-end
2. **Tool use** — the agent autonomously calls a PDF parser, email sender, calendar API, and database as needed
3. **Human-in-the-loop** — borderline candidates are flagged for manual review before any email or calendar action is taken
4. **Audit trail** — every agent decision is logged with Qwen reasoning for full transparency
5. **Semantic matching** — vector embeddings power resume-to-job-description similarity scoring via Qdrant
6. **Scalable architecture** — designed to handle hundreds of resumes simultaneously with parallel processing
7. **Error handling** — graceful fallback and retry logic when external tools or APIs fail
8. **Clean modular code** — each tool (parser, scorer, email, calendar, logger) is a separate, testable module

## Tech Stack

| Category | Technology |
|----------|------------|
| AI Model | Qwen (Qwen Cloud API) |
| Backend | Python, FastAPI |
| PDF Parsing | PyMuPDF / pdfplumber |
| Database | MongoDB Atlas |
| Vector DB | Qdrant |
| Email | Gmail SMTP (App Password) |
| Calendar | Google Calendar (Service Account) |
| Frontend | React.js |
| Deployment | Alibaba Cloud ECS + OSS |
| Containerization | Docker |
| Version Control | GitHub (MIT License) |

## Architecture Overview

| Layer | Technology | Role |
|-------|------------|------|
| **Presentation** | React dashboard | Recruiter UI — upload JD/resumes, view pipeline, approve/reject flagged candidates |
| **Orchestration** | FastAPI + Agent Engine | Runs the multi-step hiring workflow, calls tools, logs every decision |
| **Intelligence & Tools** | Qwen Cloud API, Qdrant, MongoDB, Gmail SMTP, Google Calendar SA | Parse, score, match, notify, schedule |

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.