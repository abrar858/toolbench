import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOOL_CONTENT} from '../scripts/content.mjs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('every tool page includes a matching feedback form and script',()=>{
  for (const tool of TOOL_CONTENT){
    const html=read(tool.slug);
    const slug=tool.slug.replace(/\.html$/,'');
    assert.ok(html.includes('data-feedback-widget="'+slug+'"'),tool.slug+' feedback slug');
    assert.match(html,/assets\/feedback\.js\?v=[0-9a-f]{10}/,tool.slug+' feedback script');
  }
});
test('feedback JavaScript is parseable and does not access tool input values',()=>{
  const script=read('assets/feedback.js');
  assert.doesNotThrow(()=>new Function(script));
  assert.match(script,/tool_slug:slug/);
  assert.doesNotMatch(script,/service_role|SUPABASE_SERVICE_ROLE_KEY|document\.querySelectorAll\(['"]input/);
});
test('privacy notice explains feedback storage and Supabase',()=>{
  const html=read('privacy.html');
  assert.match(html,/Optional feedback/);
  assert.match(html,/Supabase/);
});
test('admin dashboard is noindex and uses only publishable key',()=>{
  const html=read('admin/feedback.html');
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/sb_publishable_/);
  assert.doesNotMatch(html,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(html,/feedback_admins/);
});
