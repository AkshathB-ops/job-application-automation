const internPattern=/\b(intern|internship|apprentice|apprenticeship)\b/i;
const techTitle=/\b(software|developer|engineer|engineering|full.?stack|front.?end|back.?end|machine learning|\bml\b|\bai\b|artificial intelligence|data scien|deep learning|computer vision|research)\b/i;
const aiTitle=/\b(ml|ai|machine learning|artificial intelligence|data scien|deep learning|computer vision|pytorch|research scientist)\b/i;
const normalized = s=>String(s||'').toLowerCase();
export function assess(job,profile,config) {
  const title=normalized(job.title), location=normalized(job.location), body=normalized(job.description);
  const combined=`${title} ${body}`;
  const flags=[];
  const reasons=[];
  if (!internPattern.test(title)) flags.push('not_an_internship_title');
  if (!techTitle.test(title)) flags.push('not_software_or_aiml_role');
  if (/\b(senior|staff|principal|lead|manager|director)\b/i.test(title)) flags.push('senior_role');
  const graduateYears=[2026,2027,2028].filter(y=>y<profile.graduationYear);
  if (graduateYears.some(year=> new RegExp(`(?:graduat(?:ing|ion|es)|class of|batch|pass.?out)[^\\n.]{0,40}\\b${year}\\b|\\b${year}\\b[^\\n.]{0,40}(?:graduat(?:es|ion)|batch)`, 'i').test(combined))) flags.push('graduation_year_mismatch');
  if (/\b(final.year students? only|only final.year|pre.final.year students? only|only pre.final.year)\b/i.test(body)) flags.push('year_of_study_mismatch');
  if (/(?:iit\s*\/\s*nit\s*\/\s*iiit|from iit.{0,15}nit.{0,15}iiit).{0,30}only|only.{0,25}(?:iit|nit|iiit)/i.test(body)) flags.push('institution_restriction');
  if (/\b(?:prior|previous|at least one) internship (?:is )?(?:required|mandatory)\b|at least one prior internship/i.test(body)) flags.push('prior_internship_required');
  if (/\b(?:minimum|at least|requires?)\s*[2-9]\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:professional|industry|work)?\s*experience\b/i.test(body)) flags.push('experience_required');
  const remote=job.workplaceType==='remote'||/\b(remote|work from home|wfh)\b/i.test(location);
  const hybrid=job.workplaceType==='hybrid'||/\bhybrid\b/i.test(location);
  const onsite=job.workplaceType==='on-site'||job.workplaceType==='onsite'||/\b(on.?site|in.office)\b/i.test(location);
  if (onsite && !remote && !hybrid) flags.push('onsite_excluded');
  if (!remote && !hybrid) flags.push('remote_or_hybrid_not_confirmed');
  const inIndia=/\b(india|bengaluru|bangalore|karnataka)\b/i.test(location);
  if (hybrid && !/\b(bengaluru|bangalore)\b/i.test(location)) flags.push('hybrid_not_bengaluru');
  if (remote && !inIndia) flags.push('remote_india_eligibility_unconfirmed');
  if (/\b(?:us|usa|united states|canada|europe|eu)\s*(?:only|based candidates only)|must be (?:based|located) in (?:the )?(?:us|usa|united states|canada|eu)\b/i.test(body)) flags.push('geography_restriction');
  let score=0;
  if (internPattern.test(title)) {score+=30;reasons.push('internship');}
  if (techTitle.test(title)) {score+=25;reasons.push('relevant engineering/AI title');}
  if (hybrid&&/\b(bengaluru|bangalore)\b/i.test(location)) {score+=20; reasons.push('Bengaluru hybrid');}
  if (remote&&inIndia) {score+=20;reasons.push('India remote');}
  const skillTerms=Object.values(profile.skills).flat().map(normalized).filter(s=>s.length>2);
  const hits=[...new Set(skillTerms.filter(skill=>combined.includes(skill)))];
  score+=Math.min(25,hits.length*4);
  if(hits.length) reasons.push(`matching skills: ${hits.slice(0,6).join(', ')}`);
  if(aiTitle.test(title)) {score+=5;reasons.push('AI/ML track');}
  // Hard rejection is safer than submitting where user is clearly ineligible.
  // Uncertain geography or qualifications should be reviewed, not auto-submitted.
  const reject=flags.filter(f=>!['remote_india_eligibility_unconfirmed','remote_or_hybrid_not_confirmed'].includes(f));
  const caution=flags.filter(f=>['remote_india_eligibility_unconfirmed','remote_or_hybrid_not_confirmed'].includes(f));
  const decision=reject.length?'ineligible':caution.length?'needs_eligibility_review':score<(config.minimumScore||62)?'low_match':'eligible';
  return {score:Math.min(100,score),decision,flags,reasons,track:aiTitle.test(title)?'aiml':'software'};
}
