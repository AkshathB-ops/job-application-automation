try { await import('dotenv/config'); } catch { /* .env support becomes available after npm install */ }
import {getJSON} from './util.js';
import {loadState,updateJob} from './state.js';
import {discover} from './discover.js';
import {assess} from './rank.js';
import {prepare} from './prepare.js';
import {apply} from './apply.js';
import {report} from './report.js';

const cmd=process.argv[2]||'run';
const config=getJSON('config.json');
const profile=getJSON('profile.json');
const state=loadState();
if(!config || !profile) throw new Error('config.json and profile.json are required');

async function rankDiscovered(){
  let counts={};
  for(const job of Object.values(state.jobs)) {
    if(['submitted','needs_verification','submission_in_progress'].includes(job.status))continue;
    const ranking=assess(job,profile,config);
    const status=['prepared','needs_review'].includes(job.status)&&ranking.decision==='eligible'?job.status:ranking.decision;
    updateJob(state,job.id,{ranking,status});
    counts[ranking.decision]=(counts[ranking.decision]||0)+1;
  }
  console.log('Ranked:',counts);
}
try{
  if(cmd==='discover'||cmd==='run'){await discover(config,state);await rankDiscovered();}
  if(cmd==='prepare'||cmd==='run'){if(cmd==='prepare')await rankDiscovered();await prepare(state,config,profile);}
  if(cmd==='apply'||cmd==='run')await apply(state,config,profile);
  if(!['discover','prepare','apply','run','report'].includes(cmd))throw new Error(`Invalid command: ${cmd}`);
  report(state);
}catch(error){console.error('Fatal:',error);process.exitCode=1;}
