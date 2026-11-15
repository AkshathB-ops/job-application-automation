import {getJson, plain, sleep} from './util.js';
import {updateJob, appendEvent} from './state.js';

const normalizeLever = (post, site) => ({
  id:`lever:${site}:${post.id}`,
  provider:'lever',company:site,
  title:post.text || '',location:post.categories?.location || '',
  workplaceType:String(post.workplaceType||'').toLowerCase(),
  commitment:post.categories?.commitment || '',
  team:post.categories?.team || '',
  description:plain([post.descriptionPlain||post.description, ...(post.lists||[]).map(x=>x.content)].join(' ')),
  url:post.hostedUrl || `https://jobs.lever.co/${site}/${post.id}`,
  applyUrl:post.applyUrl || `${post.hostedUrl || `https://jobs.lever.co/${site}/${post.id}`}/apply`,
  postedAt: post.createdAt ? new Date(post.createdAt).toISOString() : null
});
const normalizeGreenhouse = (post, site) => ({
  id:`greenhouse:${site}:${post.id}`,provider:'greenhouse',company:site,
  title:post.title||'',location:post.location?.name||'',workplaceType:'',commitment:'',
  team:(post.departments||[]).map(x=>x.name).join(', '),description:plain(post.content),
  url:post.absolute_url || `https://job-boards.greenhouse.io/${site}/jobs/${post.id}`,
  applyUrl:post.absolute_url || `https://job-boards.greenhouse.io/${site}/jobs/${post.id}`,
  postedAt:post.updated_at||null
});
export async function discover(config,state) {
  const jobs=[];
  for (const [provider,sites] of Object.entries(config.sources)) {
    for (const site of sites) {
      try {
        const url=provider==='lever'
          ? `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json&limit=100`
          : `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(site)}/jobs?content=true`;
        const data=await getJson(url);
        const posts=provider==='lever' ? data : data.jobs;
        if (!Array.isArray(posts)) throw new Error('Unexpected API payload');
        for (const raw of posts) {
          const job=provider==='lever'? normalizeLever(raw,site):normalizeGreenhouse(raw,site);
          if (!state.jobs[job.id]) { updateJob(state,job.id,{...job,status:'discovered',firstSeen:new Date().toISOString()}); }
          else if (!['submitted','needs_verification','submission_in_progress'].includes(state.jobs[job.id].status)) {
            updateJob(state,job.id,{...job, status:state.jobs[job.id].status});
          }
          jobs.push(job);
        }
        console.log(`✓ ${provider}/${site}: ${posts.length} listings`);
      } catch(error) {console.warn(`! ${provider}/${site}: ${error.message}`);appendEvent(state,site,'source_error',error.message);}
      await sleep(config.sourceDelayMs??500);
    }
  }
  console.log(`Discovery: ${jobs.length} listings; ${Object.keys(state.jobs).length} unique in database.`);
  return jobs;
}
