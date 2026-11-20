import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOOL_CONTENT} from '../scripts/content.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('admin portal includes authenticated navigation and overview metrics',()=>{
 const html=read('admin/feedback.html');
 for(const view of ['overview','feedback','reviews','bugs','requests','settings']) assert.ok(html.includes('data-view="'+view+'"'),view);
 for(const stat of ['stat-total','stat-pending','stat-bugs','stat-resolved']) assert.ok(html.includes('id="'+stat+'"'),stat);
 assert.match(html,/feedback_admins/);
 assert.match(html,/sb_publishable_/);
 assert.doesNotMatch(html,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
 assert.doesNotThrow(()=>new Function(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/m,'')));
});
test('every generated tool page and homepage includes discreet admin login',()=>{
 for(const path of ['index.html',...TOOL_CONTENT.map(c=>c.slug)]){
  const html=read(path);
  assert.match(html,/<a href="admin\/feedback\.html">Admin login<\/a>/,path);
 }
});

// All admin data queries remain protected by Supabase row-level security.
