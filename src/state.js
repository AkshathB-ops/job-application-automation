import {getJSON, saveJSON} from './util.js';
const FILE = 'data/state.json';
export function loadState() { return getJSON(FILE, {jobs:{}, events:[]}); }
export function persist(state) { saveJSON(FILE, state); }
export function updateJob(state, id, change) { state.jobs[id]={...state.jobs[id],...change,updatedAt:new Date().toISOString()}; persist(state); }
export function appendEvent(state, id, kind, details='') { state.events.push({at:new Date().toISOString(),id,kind,details:String(details).slice(0,350)}); persist(state); }
