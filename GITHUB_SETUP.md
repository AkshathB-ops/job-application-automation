# GitHub Actions — zero-cost starter setup

1. Create a **private** empty GitHub repository, e.g. `internship-auto-agent`.
2. Extract the ZIP to your Windows PC, open PowerShell in that directory.
3. Copy `profile.json` into an Actions secret instead of Git: 

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\profile.json))) | Set-Clipboard
   ```

   Go to repository **Settings > Secrets and variables > Actions > New repository secret**; name `PROFILE_JSON_B64`, paste the copied value, and save. Don't share the Base64 string.
4. Upload the project using Git (make sure the account and repo URL match):

   ```powershell
   git clone https://github.com/YOUR-USERNAME/internship-auto-agent.git
   ```

   Copy extracted project contents, **including the hidden `.github` folder**, into that cloned repo folder. From the cloned repo directory run:

   ```powershell
   git add .
   git commit -m "Add internship automation agent"
   git push
   ```

   **Do not force-add `profile.json` or private PDF files.** They are gitignored.
5. Repository **Settings > Actions > General > Workflow permissions**: choose **Read and write permissions** and save. This lets the agent persist its private `data/state.json` between runs.
6. Repository **Actions > Daily internship agent > Run workflow > Branch: main > mode: discover > Run workflow**. Check the log and download the tracker artifact from that workflow's run page.
7. Once your first run works, use **mode: run**. The configured allowlists are empty, so this still only discovers and prepares postings, not submits. Scheduled runs are set to `30 3 * * *` in UTC, approximately 9:00 AM IST (GitHub may start later).
8. To authorize any form submissions, verify employer and ATS rules and then configure both `approvedSubmissionHosts` and `approvedCompanies` for that employer in `config.json`. Never bypass CAPTCHAs or fabricate application answers.

### Notes
- Browser install happens only for mode `run`; discovery-only does not install Chromium.
- `npm install` is used because no npm lockfile is bundled; npm may resolve newer compatible dependency versions. Once installed locally, commit a generated `package-lock.json` and change the workflow to `npm ci` for fully reproducible builds.
- Do not store passwords or access tokens in tracked files. The profile secret contains personal data, so keep repository access restricted.
- GitHub runner pushes state after relevant updates. For a private repository this is convenient, but run permissions/branch protection may block state writes; troubleshoot those before enabling submissions.
- The daily maximum is 30, not a guaranteed number of eligible postings or applications.
