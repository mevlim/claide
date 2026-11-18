
/* ---------- Наставница: профессор Гранина. Каждый день, включая выходные, даёт учебное задание и проверяет его по отмеченным делам ---------- */
const MENTOR_FROM='2026-11-07'; /* с этого дня задания приносят награду и штраф; раньше только видны */
const MENTOR_NAME='Профессор Гранина';
const MENTOR_TASKS=[
 {t:'Лекция по физике и три задачи к ней',need:{lecture:1,phys:3}},
 {t:'Пять задач по физике',need:{phys:5}},
 {t:'Пять задач по математике',need:{math:5}},
 {t:'Три задачи по физике и три по математике',need:{phys:3,math:3}},
 {t:'Лекция и повторение конспекта',need:{lecture:1,review:1}},
 {t:'Разбор ошибок и три задачи по физике',need:{mistakes:1,phys:3}},
 {t:'Две лекции по физике',need:{lecture:2}},
 {t:'Четыре задачи по математике и разбор ошибок',need:{math:4,mistakes:1}},
 {t:'Лекция и две задачи по математике',need:{lecture:1,math:2}},
 {t:'Повторение конспекта и четыре задачи по физике',need:{review:1,phys:4}}];
const MENTOR_REWARD={int:6,wil:3},MENTOR_GOLD=15,MENTOR_PEN={wil:-4};
const NEED_NAME={lecture:'лекции',phys:'задачи по физике',math:'задачи по математике',review:'повторение конспекта',mistakes:'разбор ошибок'};
function mentorTask(d){return MENTOR_TASKS[hash('mentor'+d)%MENTOR_TASKS.length]}
function mentorProg(task,a){return Object.entries(task.need).map(([k,n])=>{const v=+(a[k]===true?1:a[k]||0);return{k,n,v:Math.min(n,v),ok:v>=n}})}
function mentorDone(task,a){return mentorProg(task,a).every(x=>x.ok)}
function prevWorkday(d){return addDays(d,-1)}
/* Что она говорит: зависит от дня, часа и вчерашнего задания */
function mentorSpeech(d){
 const task=mentorTask(d),a=log(d).a||{},isToday=d===today(),h=new Date().getHours(),L=log(d),type=L.type||'normal';
 const pd=prevWorkday(d),pt=mentorTask(pd),pMiss=pd>=MENTOR_FROM&&pd>=S.start&&pt&&!mentorDone(pt,log(pd).a||{})&&(log(pd).type||'normal')==='normal';
 if(!task)return{mood:'calm',lines:['Сегодня без задания.']};
 if(type==='sick')return{mood:'calm',lines:['Болеешь? Лечись. Задание подождёт до выздоровления.']};
 if(type==='off')return{mood:'calm',lines:['Отгул так отгул. Но формулы сами себя не выучат.']};
 const pr=mentorProg(task,a),done=pr.every(x=>x.ok),some=pr.some(x=>x.v>0);
 const pre=pMiss?['Вчерашнее задание так и не сделано. Я это запомнила.']:[];
 if(done)return{mood:'proud',lines:['Задание выполнено. Неплохо.',pMiss?'Видишь, можешь, когда хочешь. Вчера бы так.':'Завтра будет сложнее, не расслабляйся.']};
 if(!isToday)return{mood:'angry',lines:['Задание этого дня осталось несделанным.','Учёба не терпит пропусков. Наверстай.']};
 if(h>=20)return{mood:'angry',lines:[...pre,some?'Вечер, а задание сделано наполовину. Я разочарована.':'Уже вечер, а учебника ты сегодня не открывала. Это недопустимо.','До полуночи ещё есть время. Садись.']};
 if(h>=15&&!some)return{mood:'angry',lines:[...pre,'Полдня прошло, а задание даже не начато.','Сначала учёба, потом всё остальное.']};
 if(some)return{mood:'strict',lines:[...pre,'Начало положено. Доведи до конца.']};
 return{mood:'strict',lines:[...pre,'Сегодняшнее задание на доске. Вопросы есть? Вопросов нет.']};
}
function mentorCard(d){
 const task=mentorTask(d),sp=mentorSpeech(d),a=log(d).a||{};
 const pr=task?mentorProg(task,a):[],done=task&&pr.every(x=>x.ok);
 const rows=task?`<div class="mtask ${done?'done':''}"><div class="mtitle"><span class="mlabel">Задание</span><b>${esc(task.t)}</b></div>
   <ul class="mprog">${pr.map(x=>`<li class="${x.ok?'ok':''}"><span>${esc(NEED_NAME[x.k]||x.k)}</span><span>${x.v}/${x.n}</span></li>`).join('')}</ul>
   <div class="chips">${xpChips(MENTOR_REWARD)}<span class="chip gd">+${MENTOR_GOLD} зол.</span>${d>=MENTOR_FROM?`<span class="chip hp" title="Если не сделать к полуночи">провал: ${sg(MENTOR_PEN.wil)} ВОЛ</span>`:''}</div></div>`:'';
 return `<section class="win pad mentor m-${sp.mood}"><div class="mhead"><img class="mport" src="${ART.m_teacher}" alt="${MENTOR_NAME}"><div class="mtalk"><div class="mname">${MENTOR_NAME}</div>${sp.lines.map(l=>`<p>${esc(l)}</p>`).join('')}</div></div>${rows}</section>`;
}
