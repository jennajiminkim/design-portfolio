/* Independent Plan-Do-See demo storage adapter.
 * The source UI and app.js are loaded from the owner's public repository unchanged.
 * Only /api/state GET and POST calls are intercepted, stored in this browser.
 * No remote database, credentials or user journal records are used.
 */
(()=>{'use strict';
const KEY='jimin.pds.original-source-demo.v1';
const uuid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'demo-'+Math.random().toString(36).slice(2)+Date.now();
const iso=d=>new Date(d).toISOString().slice(0,10);
const add=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return iso(x)};
const today=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return parts.year+'-'+parts.month+'-'+parts.day};
const monday=()=>{let x=new Date(today()+'T12:00:00');x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
const stamp=()=>new Date().toISOString();
const arrays=['plans','versions','tasks','cells','logs','completions','reflections','journals','colors'];
function fixture(){
 const start=monday(),end=add(start,6),date=(n)=>add(start,n),now=stamp();
 const P=[
 ['디자인 포트폴리오 정리',1,'웹 프로젝트 4개 소개 문구 정리',180],
 ['가상의 주간 웹사이트 리뉴얼',2,'와이어프레임 검토와 첫 화면 완성',150],
 ['피그마 UI 컴포넌트 학습',3,'버튼·카드 컴포넌트 구성',120],
 ['일상과 휴식 루틴',4,'산책·독서·정리 시간 확보',90]
 ].map(([title,priority,success_criteria,estimated_minutes])=>({id:uuid(),title,priority,success_criteria,estimated_minutes,start_date:start,end_date:end,created_at:now,updated_at:now,deleted_at:null}));
 const taskspec=[
 [0,'포트폴리오 소개 문구 정리','업무','#DCE9F7',45,'done'],[0,'프로젝트 화면 검토','업무','#DCE9F7',90,'active'],
 [1,'메인 레이아웃 시안 제작','공부','#F0DBE9',120,'done'],[1,'모바일 화면 여백 검토','공부','#F0DBE9',90,'active'],
 [2,'컴포넌트 라이브러리 조사','공부','#E5E7FA',60,'active'],[2,'버튼 상태와 포커스 점검','공부','#E5E7FA',75,'active'],
 [3,'저녁 산책','생활','#DCEBD9',30,'done'],[3,'이번 주 독서 기록','취미','#F6ECC4',40,'active']
 ];
 const tasks=taskspec.map(([ix,title,tag,color,estimated_minutes,status],i)=>({id:uuid(),plan_id:P[ix].id,title,tag,color,priority:P[ix].priority,start_date:start,end_date:end,due_date:date(Math.min(i%7,6)),mode:'range',estimate_basis:'total',estimated_minutes,status,created_at:now,updated_at:now,deleted_at:null,completed_at:status==='done'?now:null}));
 const cells=tasks.slice(0,6).map((t,i)=>({id:uuid(),task_id:t.id,day:date(Math.min(i,6)),state:i%3===1?'progress':'done',progress:'가상 예시 진행 기록',note:''}));
 const logSpecs=[[0,50],[1,65],[2,115],[3,70],[4,45],[6,35]];
 const logs=logSpecs.map(([ix,mins],i)=>{const d=date(i%5),started_at=new Date(d+'T09:00:00+09:00').toISOString(),ended_at=new Date(new Date(started_at).getTime()+mins*60000).toISOString();return {id:uuid(),task_id:tasks[ix].id,started_at,ended_at,actual_minutes:mins,progress:'가상 프로젝트 체험 데이터',blocker:'',created_at:now}});
 const journals=[{id:uuid(),week_start:start,entry_date:date(3),plan_id:P[0].id,question:'이번 주 작지만 시작할 수 있었던 일은?',discovery:'완벽한 시작보다 한 페이지를 완성하는 일이 중요하다는 것을 배웠다. (가상 예시)',next_action:'다음에는 핵심 작업부터 먼저 정리해보기. (가상 예시)',bg_color:'#EFF5FF',date_color:'#2456EA',created_at:now,updated_at:now}];
 return {plans:P,versions:[],tasks,cells,logs,completions:[],reflections:[],journals,colors:[]};
}
let memory=null;function read(){if(memory)return memory;try{const raw=localStorage.getItem(KEY);if(raw){const obj=JSON.parse(raw);if(arrays.every(k=>Array.isArray(obj[k]))){memory=obj;return memory}}}catch{}memory=fixture();save();return memory}
function save(){try{localStorage.setItem(KEY,JSON.stringify(memory))}catch{}}
function get(action,data){const s=read(),a=String(action||''),d=data||{},now=stamp(),copy=obj=>structuredClone(obj),addRec=(key,record)=>{s[key].push(record);save();return copy(record)};
 const requiredTask=()=>{const t=s.tasks.find(t=>t.id===d.id&&!t.deleted_at);if(!t)throw Error('해당 할 일을 찾지 못했습니다.');return t};
 const requiredPlan=()=>{const p=s.plans.find(p=>p.id===d.id&&!p.deleted_at);if(!p)throw Error('해당 계획을 찾지 못했습니다.');return p};
 let t,p,r;
 switch(a){
 case 'plan.create':return addRec('plans',{id:uuid(),title:String(d.title||'').slice(0,180),priority:Number(d.priority)||1,start_date:d.start_date,end_date:d.end_date,estimated_minutes:Number(d.estimated_minutes)||0,success_criteria:d.success_criteria||'',created_at:now,updated_at:now,deleted_at:null});
 case 'plan.update':p=requiredPlan();s.versions.push({id:uuid(),plan_id:p.id,changed_at:now,snapshot:copy(p)});Object.assign(p,{title:d.title,priority:Number(d.priority)||1,start_date:d.start_date,end_date:d.end_date,estimated_minutes:Number(d.estimated_minutes)||0,success_criteria:d.success_criteria||'',updated_at:now});s.tasks.filter(t=>t.plan_id===p.id&&!t.deleted_at).forEach(t=>t.priority=p.priority);save();return copy(p);
 case 'plan.delete':p=requiredPlan();p.deleted_at=now;save();return copy(p);
 case 'task.create':return addRec('tasks',{id:uuid(),title:String(d.title||'').slice(0,180),plan_id:d.plan_id||null,priority:Number(s.plans.find(p=>p.id===d.plan_id)?.priority||d.priority||1),tag:d.tag||'생활',color:d.color||'#DCEBD9',start_date:d.start_date,end_date:d.end_date,due_date:d.due_date||null,mode:d.mode||'single',estimated_minutes:Number(d.estimated_minutes)||0,estimate_basis:d.estimate_basis||'total',status:'active',created_at:now,updated_at:now,deleted_at:null,completed_at:null});
 case 'task.update':t=requiredTask();Object.assign(t,{title:d.title,plan_id:d.plan_id||null,priority:Number(s.plans.find(p=>p.id===d.plan_id)?.priority||d.priority||1),tag:d.tag,color:d.color,start_date:d.start_date,end_date:d.end_date,due_date:d.due_date||null,mode:d.mode,estimated_minutes:Number(d.estimated_minutes)||0,estimate_basis:d.estimate_basis,updated_at:now});save();return copy(t);
 case 'task.delete':t=requiredTask();t.deleted_at=now;save();return copy(t);
 case 'task.complete':t=requiredTask();t.status='done';t.completed_at=now;s.completions.push({id:uuid(),task_id:t.id,completed_at:now});save();return copy(t);
 case 'task.reopen':t=requiredTask();t.status='active';t.completed_at=null;save();return copy(t);
 case 'cell.save':if(!s.tasks.some(t=>t.id===d.task_id&&!t.deleted_at))throw Error('할 일을 찾지 못했습니다.');r=s.cells.find(c=>c.task_id===d.task_id&&c.day===d.day);if(r)Object.assign(r,{state:d.state||'planned',progress:String(d.progress||'').slice(0,90),note:d.note||''});else{r={id:uuid(),task_id:d.task_id,day:d.day,state:d.state||'planned',progress:String(d.progress||'').slice(0,90),note:d.note||''};s.cells.push(r)}save();return copy(r);
 case 'log.create':{const from=new Date(d.started_at),to=new Date(d.ended_at);const actual_minutes=Math.round((to-from)/60000);if(!Number.isFinite(actual_minutes)||actual_minutes<0||actual_minutes>1440)throw Error('시간을 확인해 주세요.');if(!s.tasks.some(t=>t.id===d.task_id&&!t.deleted_at))throw Error('할 일을 찾지 못했습니다.');return addRec('logs',{id:uuid(),task_id:d.task_id,started_at:d.started_at,ended_at:d.ended_at,actual_minutes,progress:d.progress||'',blocker:d.blocker||'',created_at:now})}
 case 'log.delete':{const n=s.logs.findIndex(l=>l.id===d.id);if(n<0)throw Error('기록을 찾지 못했습니다.');s.logs.splice(n,1);save();return {deleted:true}}
 case 'journal.save':{r=s.journals.find(j=>j.week_start===d.week_start);if(r){Object.assign(r,{plan_id:d.plan_id||null,question:d.question||'',discovery:d.discovery||'',next_action:d.next_action||'',bg_color:d.bg_color||'#FAFAFA',date_color:d.date_color||'#1E4099',updated_at:now})}else{r={id:uuid(),entry_date:today(),week_start:d.week_start,plan_id:d.plan_id||null,question:d.question||'',discovery:d.discovery||'',next_action:d.next_action||'',bg_color:d.bg_color||'#FAFAFA',date_color:d.date_color||'#1E4099',created_at:now,updated_at:now};s.journals.push(r)}save();return copy(r)}
 case 'reflection.save':{r=s.reflections.find(x=>x.plan_id===d.plan_id);if(r)Object.assign(r,{question:d.question,answer:d.answer,improvement:d.improvement,updated_at:now});else{r={id:uuid(),plan_id:d.plan_id,question:d.question,answer:d.answer,improvement:d.improvement,updated_at:now};s.reflections.push(r)}save();return copy(r)}
 case 'reflection.next':{const ref=s.reflections.find(x=>x.id===d.id);if(!ref)throw Error('이전 계획의 돌아보기를 확인해 주세요.');p=s.plans.find(x=>x.id===ref.plan_id);return addRec('plans',{...copy(p),id:uuid(),start_date:d.start_date,end_date:d.end_date,created_at:now,updated_at:now,deleted_at:null})}
 default:throw Error('체험 버전에서 지원하지 않는 명령입니다: '+a);
 }
}
const original=window.fetch.bind(window);
window.fetch=function(input,init){let url;try{url=new URL(typeof input==='string'?input:input.url,location.href)}catch{return original(input,init)}
 if(url.pathname!=='/api/state')return original(input,init);
 try{const method=(init?.method||'GET').toUpperCase();if(method==='GET')return Promise.resolve(new Response(JSON.stringify(read()),{status:200,headers:{'Content-Type':'application/json'}}));
 if(method!=='POST')throw Error('지원하지 않는 요청입니다.');const payload=JSON.parse(init?.body||'{}');const result=get(payload.action,payload.data);return Promise.resolve(new Response(JSON.stringify({ok:true,result}),{status:200,headers:{'Content-Type':'application/json'}}))}
 catch(e){return Promise.resolve(new Response(JSON.stringify({error:e.message||'오류가 발생했습니다.'}),{status:400,headers:{'Content-Type':'application/json'}}))}
};
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin||e.data?.type!=='pds-demo-reset')return;memory=fixture();save();location.reload()});
window.PDS_DEMO_MODE=true;
})();
