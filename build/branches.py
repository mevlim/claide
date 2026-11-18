# --- бытовые дела ---
R("body:'Тело и режим',","body:'Тело и режим',home:'Быт',")
R(" {id:'early',group:'body',kind:'toggle',name:'Отбой до полуночи',note:'',xp:{vit:2,wil:2}},",""" {id:'early',group:'body',kind:'toggle',name:'Отбой до полуночи',note:'',xp:{vit:2,wil:2}},
 {id:'cook',group:'home',kind:'toggle',name:'Приготовить еду',note:'Сама, без доставки',xp:{vit:2,cre:2}},
 {id:'clean',group:'home',kind:'toggle',name:'Уборка',note:'Хотя бы 15 минут',xp:{wil:2,str:1}},
 {id:'laundry',group:'home',kind:'toggle',name:'Постирать вещи',note:'Загрузить, развесить, убрать',xp:{wil:2}},
 {id:'dog',group:'home',kind:'count',name:'Погулять с собакой',note:'За каждую прогулку',xp:{str:2,vit:1}},""")
R("GROUP_STAT={study:'int',","GROUP_STAT={home:'vit',study:'int',")
R("const GIC={study:'study',","const GIC={home:'home',study:'study',")
# --- ветки развития ---
R("const qXP=x=>",r"""const BRANCHES=[
 {id:'sci',name:'Наука',st:['int','cur'],ic:'int',desc:'Лекции, задачи, учебники, открытия и вопросы обо всём на свете'},
 {id:'body',name:'Тело',st:['str','agi'],ic:'str',desc:'Тренировки, скейт, велосипед, прогулки и походы'},
 {id:'disc',name:'Дисциплина',st:['wil','vit'],ic:'wil',desc:'Режим, сон, помидоры, быт и задания наставницы'},
 {id:'soul',name:'Душа',st:['cre','cha'],ic:'cre',desc:'Творчество, музыка, рисунок, люди и разговоры'}];
const BR_BONUS=0.25,BR_MAX=2;
function branchesOn(d){const L=(S.branchLog||[]).filter(x=>x.d<=d);return L.length?L[L.length-1].b:[]}
function branchStats(d){return branchesOn(d).flatMap(id=>(BRANCHES.find(b=>b.id===id)||{st:[]}).st)}
const BR_RANKS=[[0,'Новичок'],[4,'Ученица'],[8,'Адептка'],[12,'Мастерица'],[18,'Легенда']];
function branchPick(list,d){const bs=branchStats(d);if(!bs.length)return list;const p=list.filter(x=>bs.includes(x.st[0]));return p.length>=3?p:list}
const qXP=x=>""")
R("return nextTopic(list.filter(x=>!x.work),hash(slot+d),qSeen())","return nextTopic(branchPick(list.filter(x=>!x.work),d),hash(slot+d),qSeen())")
R("const s=qSeen(),a=nextTopic(QW,hash('w'+m),s);let b=nextTopic(QW,hash('x'+m),s,a.id);if(b.id===a.id)b=QW[(QW.indexOf(a)+1)%QW.length];return[a,b]","const s=qSeen(),W2=branchPick(QW,m),a=nextTopic(W2,hash('w'+m),s);let b=nextTopic(W2,hash('x'+m),s,a.id);if(b.id===a.id)b=W2[(W2.indexOf(a)+1)%W2.length];return[a,b]")
R("order=QB.slice().sort((a,b)=>hash('b'+a.id)-hash('b'+b.id))","bs=branchStats(today()),order=QB.slice().sort((a,b)=>(bs.includes(b.st[0])-bs.includes(a.st[0]))||hash('b'+a.id)-hash('b'+b.id))")
R("const qChips=x=>`<span class=\"chips\">${xpChips(qXP(x))}</span>`;","const qChips=x=>`<span class=\"chips\">${xpChips(qXP(x))}${branchStats(today()).includes(x.st[0])?'<span class=\"chip\" style=\"--c:var(--spark)\">твоя ветка</span>':''}</span>`;")
R("const xpT=sumX(xp),pct=streakPct(streak)","{const bs=branchStats(d),bon={};bs.forEach(k=>{if((xp[k]||0)>0)bon[k]=Math.round(xp[k]*BR_BONUS)});if(sumX(bon)){addTo(xp,bon);line('Основные ветки развития: +25% опыта',bon)}}\n const xpT=sumX(xp),pct=streakPct(streak)")
R("  <section><h2 class=\"sec\">Характеристики</h2>",r"""  ${branchesSection(C)}
  <section><h2 class="sec">Характеристики</h2>""")
R("function heroView(C){",r"""function branchesSection(C){
 const on=branchesOn(today());
 const cards=BRANCHES.map(b=>{const xp=b.st.reduce((s,k)=>s+(C.sxp[k]||0),0),lv=b.st.reduce((s,k)=>s+(C.sl[k]||1),0)-b.st.length,rk=BR_RANKS.filter(r=>lv>=r[0]).pop(),nx=BR_RANKS.find(r=>r[0]>lv),sel=on.includes(b.id);
  return `<div class="win branch ${sel?'sel':''}"><div class="bhead"><img class="stab" src="${iconURL2(b.ic)}" alt=""><div><b>${esc(b.name)}</b><small>${b.st.map(k=>SN[k].name).join(' и ')}</small></div><span class="brk">${esc(rk[1])}</span></div>
   <p class="small" style="margin:0">${esc(b.desc)}</p>
   <div class="stmeta"><span>${xp} опыта · уровень ветки ${lv}</span><span>${nx?'до «'+esc(nx[1])+'»: '+(nx[0]-lv)+' ур.':'вершина'}</span></div>
   <button class="btn ${sel?'':'ghost'}" id="br-${b.id}" data-act="branch" data-id="${b.id}" aria-pressed="${sel}">${sel?'Основная ветка':'Сделать основной'}</button></div>`}).join('');
 return `<section class="win pad"><div class="tophead"><h2 class="sec" style="margin:0">Ветки развития</h2><span class="chip" style="--c:var(--spark)">выбрано ${on.length} из ${BR_MAX}</span></div>
  <p class="hook">Выбери до двух основных веток. Их характеристики получают +25% опыта, а утренние, вечерние, легендарные, недельные квесты и доска чаще подбираются под них. Выбор действует с сегодняшнего дня, прошлые дни не пересчитываются. Уровень ветки растёт вместе с уровнями её характеристик.</p>
  <div class="branches">${cards}</div></section>`;
}
function heroView(C){""")
R("  chest(){dayLog(view).chest=true},","""  chest(){dayLog(view).chest=true},
  branch(){const d=today(),cur=branchesOn(d).slice(),i=cur.indexOf(id);if(i>=0)cur.splice(i,1);else{if(cur.length>=BR_MAX){toast('Можно две основные ветки','Сначала сними одну из выбранных');return}cur.push(id)}
   S.branchLog=(S.branchLog||[]).filter(x=>x.d!==d).concat({d,b:cur});toast(i>=0?'Ветка снята':'Основная ветка',(BRANCHES.find(b=>b.id===id)||{}).name)},""")
R("<li><b>Таланты.</b>","<li><b>Ветки развития.</b> Наука, Тело, Дисциплина и Душа. Две основные ветки дают +25% опыта своим характеристикам и подбирают квесты под себя.</li>\n   <li><b>Таланты.</b>")
