import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ROOT,absolute} from './util.js';

// GitHub Actions checks out the private repository, including prior data/state.json.
// Checkpoint by pushing each state transition BEFORE external submission clicks.
// This is deliberately disabled in local runs; local state remains on disk.
export function githubSyncEnabled(){return process.env.GITHUB_STATE_SYNC === 'true';}

function git(args, cwd){
  return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:25000}).trim();
}

export function checkpointGithubState({repoRoot=ROOT, branch=process.env.GITHUB_TARGET_BRANCH}={}){
  if(!githubSyncEnabled()) return;
  if(process.env.GITHUB_ACTIONS!=='true') throw new Error('GITHUB_STATE_SYNC is only allowed within GitHub Actions');
  if(!branch || !/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('-') || branch.includes('..'))
    throw new Error('Invalid GitHub target branch');
  if(!fs.existsSync(absolute('data/state.json')) && repoRoot===ROOT) return;
  const stateFile='data/state.json';
  if(!fs.existsSync(`${repoRoot}/${stateFile}`)) return;
  try {
    git(['config','user.name','internship-agent[bot]'],repoRoot);
    git(['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],repoRoot);
    git(['add','-f','--',stateFile],repoRoot);
    const changes=git(['diff','--cached','--name-only','--',stateFile],repoRoot);
    if(!changes) return;
    git(['commit','-m','chore(agent): checkpoint application status','--',stateFile],repoRoot);
    git(['push','origin',`HEAD:refs/heads/${branch}`],repoRoot);
    console.log('Saved application state to private GitHub repository.');
  } catch(error) {
    const detail=String(error.stderr||error.message||'').slice(0,450);
    throw new Error('State checkpoint failed; will not proceed with an untracked submission: '+detail);
  }
}
