import fs from 'node:fs';
import {absolute,indiaDate} from './util.js';
function csv(v){return '"'+String(v??'').replaceAll('"','""').replaceAll(/\r?\n/g,' ')+'"';}
export function report(state){
  const jobs=Object.values(state.jobs).sort((a,b)=>(b.ranking?.score||0)-(a.ranking?.score||0));
  const rows=[['Company','Title','Location','Work type','Score','Eligibility','Status','URL','Submitted at','Flags'].map(csv).join(',')];
  for(const j of jobs) rows.push([j.company,j.title,j.location,j.workplaceType,j.ranking?.score,j.ranking?.decision,j.status,j.url,j.submittedAt,(j.ranking?.flags||[]).join('; ')].map(csv).join(','));
  fs.mkdirSync(absolute('output'),{recursive:true});
  fs.writeFileSync(absolute('output/application_tracker.csv'),rows.join('\n'),'utf8');
  const statuses={};for(const j of jobs)statuses[j.status]=(statuses[j.status]||0)+1;
  const today=jobs.filter(j=>j.status==='submitted'&&j.submittedAt&&indiaDate(new Date(j.submittedAt))===indiaDate()).length;
  console.log(`\nReport: ${jobs.length} discovered | ${today} successfully submitted today | ${JSON.stringify(statuses)}`);
  console.log('Tracker: output/application_tracker.csv');
  return {statuses,today};
}
