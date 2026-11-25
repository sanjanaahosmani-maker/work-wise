# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tech and engineering job candidates (Software Engineers, Frontend, Backend, Full Stack, Data Scientists/Analysts, DevOps, Cloud Architects, ML Engineers, Product Managers, UI/UX Designers, QA, and Security Engineers) preparing end-to-end for technical, behavioral, and HR interviews while refining their resumes.

## Product Purpose

IntervYou ("Interview Prep") unifies resume creation and AI correction, ATS alignment scoring, exam-mode interview Q&A, structured study roadmaps, timed mock interviews (text and voice), fake job scam detection, and session progress tracking in a single workspace.

## Positioning

Closed-loop preparation across resume intake, exam-style practice, and targeted concept remediation: candidates can upload any resume format or import LinkedIn details for AI correction, practice Q&A in single-question exam mode, and jump directly from any evaluated answer into a tailored Study Concepts deep dive.

## Operating Context

Browser-based preparation workspace used during focused study and job-application sessions across desktop and mobile viewports, supporting both Light and Dark themes. Backed by Express API endpoints and Groq (`openai/gpt-oss-120b`) for AI generation and evaluation.

## Capabilities and Constraints

- Preserve all existing modules: Overview, Resume Builder (manual form, multi-format file upload & AI correction, LinkedIn profile import, export to PDF/DOCX/MD/TXT), ATS Checker, Interview Q&A (exam mode with evaluation & Know More redirect), Study Concepts (3-tier roadmap + topic deep dives), Mock Interview (text + voice assistant mode & report dashboard), Fake Job Detection, Login/Create Profile page, and Profile & Session Progress (avatar upload + metrics).
- Preserve Light and Dark theme toggling (`workwise_theme_v1`) and local persistence of profile details and session stats.
- Code-first Operate web application built with React 19, Vite, Tailwind CSS v4, Lucide icons, Motion (`motion/react`), and Recharts.

## Brand Commitments

- Keep the **IntervYou** brand name and **Interview Prep** identity.
- UI copy may be refined for clarity and conciseness while preserving functional terminology.

## Evidence on Hand

- Full working React + Express + TypeScript codebase in `src/` and `server/`.
- Curated role catalogs, scoring heuristics, and live Groq AI workflows already wired to `/api/*`.

## Product Principles

- Keep every workflow step actionable within a single focused workspace without modal clutter where inline flow works better.
- Connect practice, evaluation, and learning directly (e.g., exam feedback leading straight to concept mastery).
- Maintain high legibility, keyboard accessibility, and smooth responsive behavior across Light and Dark modes.
