import test from 'node:test';
import assert from 'node:assert/strict';
import {isSubmissionAllowed} from '../src/apply.js';
const job={applyUrl:'https://jobs.example-company.com/careers/apply',company:'example-company'};
const config={autoSubmitEnabled:true,approvedSubmissionHosts:['jobs.example-company.com'],approvedCompanies:['example-company']};
test('requires both host and company approval',()=>{
  assert.equal(isSubmissionAllowed(job,config),true);
  assert.equal(isSubmissionAllowed(job,{...config,approvedCompanies:[]}),false);
  assert.equal(isSubmissionAllowed(job,{...config,approvedSubmissionHosts:[]}),false);
});
test('denies LinkedIn even if manually allowlisted',()=>{
  assert.equal(isSubmissionAllowed({...job,applyUrl:'https://www.linkedin.com/jobs/view/123'}, {...config,approvedSubmissionHosts:['www.linkedin.com']}),false);
});
test('denies insecure http endpoints',()=>{
  assert.equal(isSubmissionAllowed({...job,applyUrl:'http://jobs.example-company.com/apply'},config),false);
});
