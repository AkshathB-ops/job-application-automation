import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeHTML,coverLetter} from '../src/prepare.js';
import {getJSON} from '../src/util.js';
const profile=getJSON('profile.json');
const job={title:'Machine Learning Intern',company:'test-company'};
test('ML role prioritizes research architecture and truthful claims',()=>{
  const html=resumeHTML(job,profile,{track:'aiml'});
  const sih=html.indexOf('SIH 2026');const final=html.indexOf('Final Override');
  assert.ok(sih>=0&&sih<final);
  assert.match(html,/not a deployed ML prototype/i);
  assert.match(html,/2029/);
});
test('software role prioritizes deployed software project',()=>{
  const html=resumeHTML(job,profile,{track:'software'});
  assert.ok(html.indexOf('Final Override')<html.indexOf('SIH 2026'));
  assert.match(html,/15 teams/i);
});
test('cover letter avoids claiming deployed ML model',()=>{
  const letter=coverLetter(job,profile,{track:'aiml'});
  assert.match(letter,/not a completed deployed ML model/);
  assert.match(letter,/applying for the Machine Learning Intern role/);
});
