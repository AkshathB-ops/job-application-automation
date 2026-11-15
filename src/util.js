import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const absolute = p => path.resolve(ROOT, p);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const plain = html => String(html ?? '')
  .replace(/<br\s*\/?\s*>/gi, ' ')
  .replace(/<\/(p|li|div)>/gi, ' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ').trim();
export function getJSON(p, fallback) { try { return JSON.parse(fs.readFileSync(absolute(p), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } }
export function saveJSON(p, value) { const target = absolute(p); fs.mkdirSync(path.dirname(target), {recursive:true}); const tmp = target+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(value,null,2)); fs.renameSync(tmp,target); }
export function safeFileName(name) { return String(name).replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,70); }
export function indiaDate(d = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
export async function getJson(url) {
  const response = await fetch(url, {headers:{'User-Agent':'InternshipApplicationAgent/1.0 (personal job discovery)',Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}
