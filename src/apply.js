import fs from 'node:fs';
import {absolute,indiaDate,sleep} from './util.js';
import {appendEvent,updateJob} from './state.js';
import {checkpointGithubState} from './github-state.js';

const DISALLOWED_HOSTS=['linkedin.com','www.linkedin.com','internshala.com','www.internshala.com'];
export function isSubmissionAllowed(job,config) {
  let url;try {url=new URL(job.applyUrl);}catch{return false;}
  const h=url.hostname.toLowerCase();
  return config.autoSubmitEnabled===true && url.protocol==='https:' &&
    !DISALLOWED_HOSTS.includes(h) &&
    (config.approvedSubmissionHosts||[]).includes(h) &&
    (config.approvedCompanies||[]).includes(job.company);
}
function summaryFromState(state) {
  return Object.values(state.jobs).filter(job=>job.status==='submitted'&&job.submittedAt&&indiaDate(new Date(job.submittedAt))===indiaDate()).length;
}
async function fillCandidate(page,profile) {
  const fields=[
    {labels:/^first.?name\s*\*?$/i,selectors:['input[name="first_name"]','input[name="firstName"]'],value:profile.firstName},
    {labels:/^last.?name\s*\*?$/i,selectors:['input[name="last_name"]','input[name="lastName"]'],value:profile.lastName},
    {labels:/^(full )?name\s*\*?$/i,selectors:['input[name="name"]'],value:profile.name},
    {labels:/^email( address)?\s*\*?$/i,selectors:['input[type="email"]','input[name="email"]'],value:profile.email},
    {labels:/^(phone|phone number|mobile|mobile number)\s*\*?$/i,selectors:['input[type="tel"]','input[name="phone"]'],value:profile.phone},
    {labels:/(linkedin|linked in)( profile| url)?/i,selectors:['input[name*="linkedin" i]'],value:profile.linkedin},
    {labels:/(github)( profile| url)?/i,selectors:['input[name*="github" i]'],value:profile.github},
    {labels:/(portfolio|personal website)/i,selectors:[],value:profile.portfolio}
  ];
  const filled=[];
  for (const field of fields) {
    if(!field.value)continue;
    const candidates=[page.getByLabel(field.labels),...field.selectors.map(s=>page.locator(s))];
    for(const candidate of candidates){
      try {if(await candidate.count()===0)continue;const input=candidate.first();if(!await input.isVisible())continue; if(!await input.isEditable())continue;await input.fill(field.value,{timeout:1700});filled.push(field.value);break;}
      catch { /* another selector may match */ }
    }
  }
  return filled;
}
async function attachResume(page, resumePath) {
  if(!fs.existsSync(resumePath)) throw new Error('Resume PDF missing');
  const uploads=page.locator('input[type="file"]');
  const n=await uploads.count();
  if(n>1) throw new Error('Multiple attachment fields need review');
  if(n===1){ await uploads.first().setInputFiles(resumePath); return true; }
  return false;
}
async function inspect(page) {
  return await page.evaluate(()=>{
    const form=document.querySelector('form');
    if(!form)return {hasForm:false,issues:['No application form found']};
    const issues=[];
    const elements=[...form.querySelectorAll('input,select,textarea')];
    const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
    const basicName=/(first.?name|last.?name|full.?name|name|email|phone|mobile|linkedin|github|resume|cv|website|portfolio)/i;
    for(const el of elements){
      if(!visible(el) || el.disabled || ['hidden','submit','button','reset','file'].includes((el.type||'').toLowerCase())) continue;
      if(el.closest('[hidden],[aria-hidden="true"]'))continue;
      const inputType=(el.type||'').toLowerCase();
      const required=el.required||el.getAttribute('aria-required')==='true';
      const label=el.labels?.[0]?.innerText||el.getAttribute('aria-label')||el.placeholder||'';
      const tag=`${el.name||''} ${el.id||''} ${label}`.trim();
      if (['checkbox','radio'].includes(inputType)) {
        if(required && !el.checked)issues.push(`Consent/selection requires review: ${tag}`);
        else if(!required)issues.push(`Optional checkbox/radio requires review: ${tag}`);
        continue;
      }
      if (el.tagName==='SELECT') { issues.push(`Dropdown requires review: ${tag}`);continue; }
      if (el.tagName==='TEXTAREA') {issues.push(`Free-text question requires review: ${tag}`);continue;}
      if(!basicName.test(tag)) issues.push(`Unrecognized question: ${tag||'unnamed input'}`);
      if(required && !el.value)issues.push(`Missing required field: ${tag}`);
    }
    return {hasForm:true,issues:[...new Set(issues)].slice(0,12)};
  });
}
async function hasCaptcha(page) {
  return await page.locator('iframe[src*="recaptcha" i],iframe[src*="hcaptcha" i],[class*="captcha" i],div[data-sitekey]').count()>0;
}
async function maybeOpenForm(page) {
  if(await page.locator('form').count())return;
  const btn=page.getByRole('link',{name:/^(apply|apply for this job|apply now)$/i});
  if(await btn.count()===1) await btn.click({timeout:4000}).catch(()=>{});
}
async function applicationAttempt(browser,job,profile) {
  const page=await browser.newPage();
  try {
    await page.goto(job.applyUrl,{waitUntil:'domcontentloaded',timeout:30000});
    await maybeOpenForm(page);
    if(await hasCaptcha(page))return {status:'needs_review',reason:'CAPTCHA or anti-bot protection (not bypassed)'};
    const filled=await fillCandidate(page,profile);
    const attached=await attachResume(page,job.artifacts?.resume||absolute(profile.resumeSourceFile));
    const findings=await inspect(page);
    if(!findings.hasForm)return {status:'needs_review',reason:'No supported application form found'};
    if(findings.issues.length)return {status:'needs_review',reason:findings.issues.join(' | ')};
    if(!filled.includes(profile.email))return {status:'needs_review',reason:'Could not verify applicant email field'};
    if(!attached)return {status:'needs_review',reason:'No resume upload field detected'};
    const submit=page.getByRole('button',{name:/^(submit application|submit|send application|send my application)\s*$/i});
    if(await submit.count()!==1)return {status:'needs_review',reason:'No unique explicit Submit button'};
    await submit.click({timeout:8000});
    await page.waitForLoadState('domcontentloaded',{timeout:6000}).catch(()=>{});
    await page.waitForTimeout(1200);
    const after=(await page.locator('body').innerText({timeout:5000})).slice(0,3000);
    const url=page.url();
    if(/thank you for (applying|your application)|your application (has been )?(submitted|received)|application submitted|we (have )?received your application/i.test(after)||/\/(thank.?you|confirmation)(?:[/?#]|$)/i.test(url)) {
      return {status:'submitted',reason:`Confirmation detected at ${url}`};
    }
    return {status:'needs_verification',reason:`Submission clicked but no reliable confirmation at ${url}. DO NOT retry blindly.`};
  } finally {await page.close();}
}
export async function apply(state,config,profile) {
  if(!config.autoSubmitEnabled){console.log('Auto-submit disabled in config.json');return;}
  const candidates=Object.values(state.jobs).filter(j=>j.status==='prepared'&&j.ranking?.decision==='eligible').sort((a,b)=>b.ranking.score-a.ranking.score);
  const eligible=candidates.filter(j=>isSubmissionAllowed(j,config));
  console.log(`${candidates.length} prepared eligible; ${eligible.length} in approved host + company allowlists.`);
  if(!eligible.length){console.log('Add approvedSubmissionHosts AND approvedCompanies to config.json after checking platform permissions. No applications sent.');return;}
  let remaining=Math.max(0,Math.min(config.maxSubmissionsPerRun||30,config.dailyCap||30-summaryFromState(state)));
  remaining=Math.min(remaining,Math.max(0,(config.dailyCap||30)-summaryFromState(state)));
  if(!remaining){console.log('Daily successful submission cap reached');return;}
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:process.env.HEADLESS!=='false',slowMo:Number(process.env.SLOW_MO_MS)||0,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
  try {
    for(const job of eligible){
      if(remaining<=0)break;
      try {
        // Persist 'in progress' remotely before any external submission click.
        // Interrupted attempts are NOT automatically retried.
        updateJob(state,job.id,{status:'submission_in_progress',attemptStartedAt:new Date().toISOString()});
        checkpointGithubState();
        const result=await applicationAttempt(browser,job,profile);
        const fields={status:result.status,lastError:result.status==='submitted'?null:result.reason};
        if(result.status==='submitted'){fields.submittedAt=new Date().toISOString();remaining--;}
        updateJob(state,job.id,fields);
        appendEvent(state,job.id,result.status,result.reason);
        checkpointGithubState();
        console.log(`${result.status}: ${job.company} — ${job.title} (${result.reason})`);
      } catch(error){
        // Fail closed: if the checkpoint cannot be pushed, stop the whole run.
        if (String(error.message).includes('State checkpoint failed')) throw error;
        updateJob(state,job.id,{status:'needs_verification',lastError:error.message});
        appendEvent(state,job.id,'needs_verification',error.message);
        checkpointGithubState();
        console.warn(`needs_review ${job.id}: ${error.message}`);}
      await sleep(config.delayBetweenSubmissionsMs||6000);
    }
  } finally {await browser.close();}
}
