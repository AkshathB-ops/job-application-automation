import fs from 'node:fs';
import path from 'node:path';
import {absolute,esc,safeFileName} from './util.js';
import {updateJob} from './state.js';

function selectedProjects(profile,track) {
  const priority=track==='aiml'?'sih-cyclone':'final-override';
  return [...profile.projects].sort((a,b)=>Number(b.id===priority)-Number(a.id===priority));
}
function orderedSkills(profile,track) {
  const labels={languages:'Languages',frontend:'Frontend',backend:'Backend',databases:'Databases',ml:'AI/ML',tools:'Tools'};
  const order=track==='aiml'?['languages','ml','backend','databases','frontend','tools']:['languages','frontend','backend','databases','tools','ml'];
  return order.map(key=>`<div><strong>${labels[key]}:</strong> ${esc(profile.skills[key].join(', '))}</div>`).join('');
}
export function resumeHTML(job,profile,ranking) {
  const projectMarkup=selectedProjects(profile,ranking.track).map(p=>`<section><div class="project"><b>${esc(p.name)}</b><span>${esc(p.subtitle)}</span></div><p class="tech">${esc(p.technologies.join(' · '))}</p><ul>${p.bullets.slice(0,3).map(b=>`<li>${esc(b)}</li>`).join('')}</ul></section>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"/><style>
    @page{size:A4;margin:12mm 13mm}*{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#151c25;font-size:9.3pt;line-height:1.33;margin:0}
    h1{font-size:19pt;letter-spacing:.5px;margin:0 0 1mm 0}h2{font-size:10pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #5d6774;margin:4.8mm 0 1.7mm;padding-bottom:.8mm}
    .contact{font-size:8pt;color:#324050}.project{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.project span{font-size:7.7pt;color:#46505a}
    p{margin:0 0 2mm}.tech{font-size:8.3pt;color:#374151;margin-top:.8mm}ul{margin:1mm 0 3mm;padding-left:4.5mm}li{margin-bottom:.8mm}section{break-inside:avoid}
    .skills>div{margin:.6mm 0}
  </style></head><body><h1>${esc(profile.name)}</h1>
  <div class="contact">${esc(profile.city)}, ${esc(profile.country)} · ${esc(profile.phone)} · ${esc(profile.email)}<br>${esc(profile.linkedin)} · ${esc(profile.github)}</div>
  <h2>Education</h2><div><b>${esc(profile.university)}</b> — ${esc(profile.degree)}<br><span>Expected graduation: ${esc(profile.graduationMonth)} ${esc(profile.graduationYear)}</span></div>
  <h2>Technical skills</h2><div class="skills">${orderedSkills(profile,ranking.track)}</div>
  <h2>Project experience</h2>${projectMarkup}
  <h2>Activities</h2>${esc(profile.activities.join(' · '))}
  </body></html>`;
}
export function coverLetter(job,profile,ranking) {
  const intro=`I am a B.Tech Computer Science and Engineering (AI/ML) student at Christ University in Bengaluru, graduating in April ${profile.graduationYear}. I am applying for the ${job.title} role at ${job.company}.`;
  const ml='For Smart India Hackathon 2026, I researched and designed a multi-source satellite pipeline for cyclone detection and prediction, including ConvNeXt-Tiny/GRU architecture, temporal preprocessing, and a planned FastAPI-based serving workflow. This was a research and architecture project, not a completed deployed ML model.';
  const software='On Final Override, a live college competition platform used by 15 teams, I owned the PostgreSQL data layer, maintained Phases 2–3, worked on authorization and WebSockets, and supported Docker-based deployment.';
  const first=ranking.track==='aiml'?ml:software;
  const second=ranking.track==='aiml'?software:ml;
  return `Dear Hiring Team,\n\n${intro}\n\n${first}\n\n${second}\n\nI would welcome the opportunity to contribute and learn with your engineering team. Thank you for considering my application.\n\nSincerely,\n${profile.name}\n${profile.email}\n${profile.github}\n`;
}
export async function prepare(state,config,profile) {
  const jobs=Object.values(state.jobs).filter(j=>j.ranking?.decision==='eligible'&&['eligible','prepared','prepare_failed'].includes(j.status)).sort((a,b)=>b.ranking.score-a.ranking.score).slice(0,config.maxJobsToPreparePerRun||40);
  if (!jobs.length){console.log('No eligible jobs to prepare. Run npm run discover first.');return;}
  const out=absolute('output');fs.mkdirSync(out,{recursive:true});
  let browser;
  try { const {chromium}=await import('playwright'); browser=await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})}); }
  catch(error){console.warn(`PDF generation unavailable: ${error.message.split('\n')[0]}. Original resume will be used.`);}
  for (const job of jobs) {
    try {
      const name=safeFileName(job.id);
      const htmlPath=path.join(out,`${name}_resume.html`);
      const letterPath=path.join(out,`${name}_cover_letter.txt`);
      const pdfPath=path.join(out,`${name}_resume.pdf`);
      fs.writeFileSync(htmlPath,resumeHTML(job,profile,job.ranking),'utf8');
      fs.writeFileSync(letterPath,coverLetter(job,profile,job.ranking),'utf8');
      let resumePath=absolute(profile.resumeSourceFile);
      if(browser){
        const page=await browser.newPage();
        try { await page.setContent(fs.readFileSync(htmlPath,'utf8'),{waitUntil:'load'});await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true});resumePath=pdfPath; }
        finally {await page.close();}
      }
      updateJob(state,job.id,{status:'prepared',artifacts:{resume:resumePath,coverLetter:letterPath,html:htmlPath}});
      console.log(`Prepared ${job.company}: ${job.title} (${job.ranking.score})`);
    } catch(error) {updateJob(state,job.id,{status:'prepare_failed',lastError:error.message});console.error(`${job.id}: ${error.message}`);}
  }
  if(browser) await browser.close();
}
