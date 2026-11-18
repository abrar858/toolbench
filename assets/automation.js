// Automation builder: chains text steps into a workflow that runs in the browser.
// Loaded only on automation-builder.html, after tools.js. Wrapped so its names don't clash with the shared script.
(() => {
'use strict';
const $=s=>document.querySelector(s);
const names={uppercase:'Uppercase text',lowercase:'Lowercase text',trim:'Trim whitespace',replace:'Find and replace',prefix:'Add prefix',suffix:'Add suffix',split:'Split into lines',join:'Join lines',jsonParse:'Parse JSON',jsonStringify:'Format JSON',urlEncode:'URL encode',urlDecode:'URL decode',base64Encode:'Base64 encode',base64Decode:'Base64 decode',wordCount:'Count words'};
const configTypes=new Set(['replace','prefix','suffix','split','join']);
const key='toolbench-workflow-v1';
const defaults=[{id:'step-1',type:'trim',a:'',b:''},{id:'step-2',type:'uppercase',a:'',b:''}];
let steps=defaults.map(x=>({...x})),selected=steps[0].id;
const asText=v=>typeof v==='string'?v:JSON.stringify(v);
function validate(arr){
 if(!Array.isArray(arr)||arr.length>50)throw Error('Workflow must contain at most 50 steps.');
 return arr.map((x,i)=>{
  if(!x||typeof x!=='object'||!Object.hasOwn(names,x.type))throw Error('Unsupported step at position '+(i+1));
  return {id:'step-'+i+'-'+Math.random().toString(36).slice(2,9),type:x.type,a:String(x.a??'').slice(0,1000),b:String(x.b??'').slice(0,1000)};
 });
}
function persist(){try{localStorage.setItem(key,JSON.stringify(steps))}catch{}}
let zoom=1;
const positions=new Map();
const graphWidth=1400,graphHeight=900;
function positionFor(step,i){if(!positions.has(step.id))positions.set(step.id,{x:80+i*250,y:260+(i%2)*80});return positions.get(step.id)}
function drawWires(){
 const svg=$('#wires');svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+graphWidth+' '+graphHeight);
 for(let i=1;i<steps.length;i++){
  const a=positionFor(steps[i-1],i-1),b=positionFor(steps[i],i);
  const x1=a.x+205,y1=a.y+55,x2=b.x,y2=b.y+55;
  const dx=Math.max(45,Math.abs(x2-x1)*.48);
  const d='M'+x1+' '+y1+' C'+(x1+dx)+' '+y1+','+(x2-dx)+' '+y2+','+x2+' '+y2;
  const ns='http://www.w3.org/2000/svg';
  const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','wire');svg.append(path);
  const pulse=document.createElementNS(ns,'path');pulse.setAttribute('d',d);pulse.setAttribute('class','wire-active');svg.append(pulse);
 }
}
function render(){
 const container=$('#nodes');container.replaceChildren();
 const existing=new Set(steps.map(x=>x.id));for(const id of positions.keys())if(!existing.has(id))positions.delete(id);
 steps.forEach((step,i)=>{
  const pos=positionFor(step,i);
  const node=document.createElement('div');node.className='graph-node'+(selected===step.id?' active':'');node.style.left=pos.x+'px';node.style.top=pos.y+'px';
  const top=document.createElement('div');top.className='graph-node-top';
  const icon=document.createElement('span');icon.className='node-icon';icon.textContent=i+1;
  const label=document.createElement('div');const name=document.createElement('strong');name.textContent=names[step.type];const sub=document.createElement('small');sub.textContent='Action · Step '+(i+1);label.append(name,sub);top.append(icon,label);
  const actions=document.createElement('div');actions.className='actions';
  for(const [txt,fn,disabled] of [['Configure',()=>{selected=step.id;render()},false],['↑',()=>move(i,-1),i===0],['↓',()=>move(i,1),i===steps.length-1],['×',()=>remove(i),false]]){
   const btn=document.createElement('button');btn.type='button';btn.textContent=txt;btn.disabled=disabled;btn.setAttribute('aria-label',txt+' '+names[step.type]);btn.onclick=fn;actions.append(btn);
  }
  node.append(top,actions);
  node.onclick=e=>{if(e.target.closest('button'))return;selected=step.id;document.querySelectorAll('.graph-node').forEach(n=>n.classList.remove('active'));node.classList.add('active');renderEditor()};
  top.style.touchAction='none';
  top.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();top.setPointerCapture(e.pointerId);
   const startX=e.clientX,startY=e.clientY,originX=pos.x,originY=pos.y;
   const onMove=ev=>{pos.x=Math.max(5,Math.min(graphWidth-210,originX+(ev.clientX-startX)/zoom));pos.y=Math.max(5,Math.min(graphHeight-125,originY+(ev.clientY-startY)/zoom));node.style.left=pos.x+'px';node.style.top=pos.y+'px';drawWires()};
   const onEnd=()=>{top.removeEventListener('pointermove',onMove);top.removeEventListener('pointerup',onEnd);top.removeEventListener('pointercancel',onEnd)};
   top.addEventListener('pointermove',onMove);top.addEventListener('pointerup',onEnd);top.addEventListener('pointercancel',onEnd);
  });
  container.append(node);
 });
 drawWires();renderEditor();persist();
}
function setZoom(value){zoom=Math.max(.5,Math.min(1.5,value));$('#graph').style.transform='scale('+zoom+')';$('#zoomLabel').textContent=Math.round(zoom*100)+'%'}
function move(i,d){const j=i+d;if(j<0||j>=steps.length)return;[steps[i],steps[j]]=[steps[j],steps[i]];render()}
function remove(i){steps.splice(i,1);if(!steps.some(x=>x.id===selected))selected=steps[0]?.id;render()}
function renderEditor(){
 const el=$('#editor');el.replaceChildren();const step=steps.find(x=>x.id===selected);
 if(!step){el.textContent='Add or select a step to configure it.';return}
 const title=document.createElement('p');title.textContent=names[step.type];el.append(title);
 const fields=step.type==='replace'?[['a','Find text'],['b','Replace with']]:step.type==='prefix'?[['a','Prefix']]:step.type==='suffix'?[['a','Suffix']]:step.type==='split'?[['a','Separator (blank = new line)']]:step.type==='join'?[['a','Separator (blank = new line)']]:[];
 if(!fields.length){const note=document.createElement('p');note.className='note';note.textContent='This step needs no additional settings.';el.append(note)}
 for(const [prop,label] of fields){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.value=step[prop];input.maxLength=1000;input.oninput=()=>{step[prop]=input.value;persist()};el.append(l,input)}
}
function transform(value,step){
 const text=asText(value),a=step.a,b=step.b;
 switch(step.type){
  case 'uppercase':return text.toUpperCase();
  case 'lowercase':return text.toLowerCase();
  case 'trim':return text.trim();
  case 'replace':if(!a)throw Error('Find text cannot be empty');return text.split(a).join(b);
  case 'prefix':return a+text;
  case 'suffix':return text+a;
  case 'split':return text.split(a||'\n');
  case 'join':if(!Array.isArray(value))throw Error('Join lines requires an array from a previous step');return value.map(asText).join(a||'\n');
  case 'jsonParse':return JSON.parse(text);
  case 'jsonStringify':return JSON.stringify(typeof value==='string'?JSON.parse(value):value,null,2);
  case 'urlEncode':return encodeURIComponent(text);
  case 'urlDecode':return decodeURIComponent(text);
  case 'base64Encode':return btoa(Array.from(new TextEncoder().encode(text),x=>String.fromCharCode(x)).join(''));
  case 'base64Decode':return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text),c=>c.charCodeAt(0)));
  case 'wordCount':return {words:(text.trim().match(/\S+/g)||[]).length,characters:[...text].length};
  default:throw Error('Unknown step');
 }
}
$('#zoomIn').onclick=()=>setZoom(zoom+.1);
$('#zoomOut').onclick=()=>setZoom(zoom-.1);
$('#fit').onclick=()=>{$('#viewport').scrollTo({left:0,top:0,behavior:'smooth'});setZoom(.75)};
$('#add').onclick=()=>{if(steps.length>=50){$('#status').textContent='Maximum 50 steps';return}const type=$('#addType').value;const step={id:'step-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),type,a:'',b:''};steps.push(step);selected=step.id;render()};
$('#run').onclick=()=>{
 let value=$('#source').value;const log=[];$('#output').textContent='';
 try{
  for(const [i,step] of steps.entries()){value=transform(value,step);log.push('✓ '+(i+1)+'. '+names[step.type])}
  $('#output').textContent=asText(value);$('#status').textContent='Success — '+steps.length+' step(s) completed';$('#log').textContent=log.join('\n')||'No steps: input returned unchanged';
 }catch(e){$('#status').textContent='Execution stopped: '+e.message;$('#log').textContent=[...log,'✕ '+e.message].join('\n')}
};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#output').textContent);$('#status').textContent='Output copied'}catch{$('#status').textContent='Clipboard unavailable'}};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,steps:steps.map(({type,a,b})=>({type,a,b}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='toolbench-workflow.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('File exceeds 100 KB');const obj=JSON.parse(await file.text());if(obj.version!==1)throw Error('Unsupported workflow version');steps=validate(obj.steps);selected=steps[0]?.id;render();$('#status').textContent='Workflow imported'}catch(err){$('#status').textContent='Import failed: '+err.message}e.target.value=''};
$('#reset').onclick=()=>{if(!confirm('Reset your workflow to its default steps?'))return;steps=defaults.map(x=>({...x}));selected=steps[0].id;render();$('#status').textContent='Workflow reset'};
try{const saved=localStorage.getItem(key);if(saved){steps=validate(JSON.parse(saved));selected=steps[0]?.id}}catch{steps=defaults.map(x=>({...x}));selected=steps[0].id}
render();setZoom(.85);
})();
