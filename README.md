# Internship Application Agent — Bengaluru + India Remote

A local, self-controlled job search and application preparation tool for a second-year B.Tech CSE (AI/ML) student graduating in April 2029. Designed around **30 as the daily ceiling, not a promise of 30 available or completed applications**. Its default inputs include six Lever companies and two Greenhouse companies as examples; add more public board slugs to increase coverage.

**Important limits**: This tool does not automate LinkedIn or Internshala, bypass CAPTCHAs, fabricate qualifications, or submit unknown screening answers. Public job-discovery APIs are not candidate-application APIs. Greenhouse and Lever direct submission endpoints generally require employer-owned keys, not personal applicant keys. Browser submission is supported *only* where the employer and platform permit it, the host AND company are explicitly approved, and the form passes a conservative safety gate. Forms that need consent or unknown questions are parked for manual review. Do not enable it on a site whose rules disallow automation.

## 1. Install on Windows 11

Install Node.js 20+ and run in PowerShell from this extracted folder:

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Verify `profile.json` carefully, particularly name, email, phone, graduation, work authorization, actual skill proficiency, and projects. `assets/Akshath_Resume_Improved_One_Page.pdf` is your prior one-page resume; do not upload the project folder publicly.

## 2. Discover and score internships

```powershell
npm run discover
npm run report
```

This gathers public Lever/Greenhouse job listings from configured company boards, deduplicates by posting ID, and ranks them. It screens for software/AI internships and excludes known mismatches:
- Onsite-only opportunities, non-Bengaluru hybrid jobs, and remote jobs with unconfirmed India eligibility
- Job titles not explicitly describing internships, and senior roles
- Graduation-year, final-year-only, institution-specific, and prior-internship restrictions detected in descriptions

The ranker uses deterministic, inspectable keyword matching. It is not a magical classifier and may miss complex or implied exclusions. Check decisions and eligibility before permitting a domain/company to submit.

**Why might there be zero matches?** This is a curated feed-based design, not all jobs in India. Employers vary in availability and eligibility, and the public feeds might have no suitable internships today. A target of 30 per day cannot create 30 real openings. Add more relevant companies or use `output/application_tracker.csv` to locate listings for manual applications.

## 3. Prepare truthful resumes and cover letters

```powershell
npm run prepare
```

This prioritizes Final Override for software roles and the SIH cyclone **research & architecture** work for AI/ML roles. PDFs are generated in `output/` using Chromium. If Chromium is unavailable, the copied original resume PDF is the fallback. Cover letters are tailored deterministic drafts; re-read them before enabling submissions. No LLM API key is needed. You can later connect an LLM to rerank jobs, but do not let it invent credentials.

## 4. Enable automatic submissions selectively

The user requested auto mode. `config.json` sets `autoSubmitEnabled: true` and `dailyCap: 30`, but intentionally starts with **empty approval lists**, so no real submissions can occur before you approve allowed sites and employers:

```json
{
  "autoSubmitEnabled": true,
  "approvedSubmissionHosts": ["jobs.example-company.com"],
  "approvedCompanies": ["example-company"]
}
```

**Replace example values with a real permitted form host and the exact company slug from a discovered job**. Shared ATS hosts such as `jobs.lever.co` or `job-boards.greenhouse.io` are broad; approve them only after reviewing the specific site rules and *keep the company allowlist narrow*. The actual target URL must be HTTPS. LinkedIn and Internshala are explicitly blocked in code; nothing here overrides their rules.

```powershell
npm run apply
```

The Playwright adapter attempts first name, last name, full name, email, phone, LinkedIn, GitHub, and PDF attachment. It refuses to submit if the page has a CAPTCHA, unknown question, checkbox, select, extra textarea, missing mandatory input, ambiguous submit button, or missing resume/email. Only explicit **Submit Application** buttons are used. Successful applications count toward the cap only after a confirmation signal. Ambiguous post-click responses are `needs_verification` and never retried automatically. This avoids accidental duplicate submissions.

**Real-world limitation**: Greenhouse, Lever, and custom employer forms often contain screening questions, privacy checkboxes, email verification, or logged-in flows. Their controls change. Those forms will be moved to `needs_review` instead of pretending they were submitted. To make more forms work, add a per-employer **approved** adapter and truthful fixed answers; do not add generic click-through logic or bypass protections.

## 5. Run all stages daily

```powershell
npm run run
```

- `discover` fetches postings + ranks
- `prepare` generates tailored PDF and cover letter
- `apply` attempts approved uncomplicated forms
- `report` saves `output/application_tracker.csv`

To schedule: update `scripts/run-daily.ps1` with the extracted project directory. Open **Task Scheduler → Create Basic Task → Daily** and set the program to `powershell.exe` with arguments `-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\job_application_agent\scripts\run-daily.ps1"` (replace with your local path). Your PC must be on and permitted to run the task. Use Task Scheduler history and `daily.log` to troubleshoot. This is local scheduling, not ChatGPT running in the background.

## 6. Output and privacy

`data/state.json`: discovered postings, decisions, statuses, and audit events.

`output/application_tracker.csv`: open in Excel or Google Sheets.

`output/*_resume.pdf`: one job-specific résumé per eligible posting, with truthful reorderings of original project facts.

`output/*_cover_letter.txt`: personalized, fact-based cover letters.

The `profile.json`, original resume, and `data`/`output` directories contain personal information. They are ignored by Git and should not be uploaded to public repositories. Never store passwords in config or share them with the agent. Review any platform consent and screening disclosures yourself.

The `assets/Akshath_Software_Resume.html` and `assets/Akshath_AIML_Resume.html` files are prebuilt, editable previews of the two fact-based resume orders. Browser-generated job-specific PDFs are created during `npm run prepare`.

## 7. Test without applying anywhere

```powershell
npm test
npm run demo
```

Open `http://127.0.0.1:4242` in your browser to see a fake demo job form. The demo intentionally has no real employer or ATS integration and does not send any data to employers. Full browser automation integration testing requires Chromium; by default, the regular `apply` command will not submit anything to the demo because the URL is HTTP and the approval checks require HTTPS.

## Design / extension points

- `src/discover.js`: add authorized public job sources, company board slugs, and pagination.
- `src/rank.js`: customize title filters, degree-year checks, location policy, and thresholds.
- `src/prepare.js`: improve formatting, templates, and role-specific bullet ordering.
- `src/apply.js`: create host-specific, documented adapters with explicit terms approval.
- `src/report.js`: add follow-up dates, interview steps, and optional Gmail parsing.

**Not included:** a LinkedIn automation bypass, unauthorized scraping, universal auto-apply support, Gmail response parsing, cloud hosting, automatic employer login, or claim that 30 postings are submitted per day. All would require separate supported integrations, permissions, or engineering.
