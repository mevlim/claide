import re
V=open('valley.html',encoding='utf8').read().split('\n')
S=open('saga.html',encoding='utf8').read().split('\n')
L=lambda a,b:'\n'.join(V[a-1:b])
s='\n'.join(S[1:])
def rep(old,new,cnt=1):
    global s
    assert old in s,old[:80]
    s=s.replace(old,new,cnt)
rep('<title>Квантовая сага</title>','<title>Звёздный конспект</title>')
s=re.sub(r'<link rel="stylesheet"[^\n]*\n','<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;600;700&family=Tiny5&display=swap">\n',s,count=1)
a=s.index('<style>\n')+len('<style>\n'); b=s.index('</style>')
s=s[:a]+open('cosmo.css',encoding='utf8').read()+s[b:]
# no theme toggle: single committed dark look
rep("function themeBtn(){","function themeBtn(){return '';")
qv="/* ---------- Спрайт героини с карты «Долины кварков» ---------- */\nconst QV=(()=>{\n"+L(296,425)+"\n"+L(430,566)+r"""
function drawShadow(g, x, y, w) { g.fillStyle = 'rgba(0,0,0,0.35)'; const h = Math.max(2, w >> 2); for (let j = -h; j <= h; j++) { const hw = Math.round(w * Math.sqrt(1 - (j * j) / ((h + 0.5) * (h + 0.5)))); g.fillRect(Math.round(x - hw), Math.round(y + j), hw * 2, 1); } }
let heroC=null;
function heroCanvas(){ if(heroC) return heroC; const c=mkCanvas(24,34), g=c.getContext('2d'); drawShadow(g,12,31,8); g.drawImage(heroFrames(DECK).down[0],0,0); return heroC=c; }
/* Рамка панели: ступенчатые углы, бежевый контур в два пикселя, тонкая внутренняя линия */
function frameURL(){ const N=16,c=mkCanvas(N,N),g=c.getContext('2d');
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const cx=Math.min(x,N-1-x),cy=Math.min(y,N-1-y),r=Math.min(cx,cy,cx+cy-2);let col=null;
    if(r<0)continue; if(r===0)col='#0c0b0f'; else if(r<=2)col='#cbb59d'; else if(r===3)col='#1c1b20'; else if(r===4)col='#5e554d'; else col='#1c1b20';
    g.fillStyle=col;g.fillRect(x,y,1,1);}
  return c.toDataURL(); }
return { heroCanvas, frameURL };
})();
"""
art=open('art.js',encoding='utf8').read()
hero=r"""
const HERO_SVG={};
function heroArt(sxp,cls){
 const key=cls||'';if(HERO_SVG[key])return HERO_SVG[key];
 const W=24,H=34,c=QV.heroCanvas(),d=c.getContext('2d').getImageData(0,0,W,H).data;
 const col=i=>d[i+3]?`rgba(${d[i]},${d[i+1]},${d[i+2]},${+(d[i+3]/255).toFixed(2)})`:null;
 let out='';
 for(let y=0;y<H;y++){let x=0;while(x<W){const f=col((y*W+x)*4);if(!f){x++;continue}let n=1;while(x+n<W&&col((y*W+x+n)*4)===f)n++;out+=`<rect x="${x}" y="${y}" width="${n+.03}" height="1.03" style="fill:${f}"/>`;x+=n}}
 return HERO_SVG[key]=`<svg class="${cls||''}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}
/* Портреты героини по настроению дня */
const MOODS={neutral:'a_neutral',think:'a_think',happy:'a_happy',angry:'a_angry',tired:'a_tired',read:'a_think',calm:'a_calm',dream:'a_dream',shy:'a_shy',wow:'a_wow'};
/* Настроение зависит от дня: сколько сделано, который час, отгул или больничный */
function moodState(C){
 const d=view,r=C.days[d]||{},L=log(d),h=new Date().getHours(),isToday=d===today();
 const xp=r.xpT||0;
 if(r.type==='sick')return{k:'tired',msg:'Болеем. Чай, плед и сон, остальное подождёт.'};
 if(r.type==='off')return{k:'dream',msg:'Отгул. Можно смотреть в небо и ни о чём не думать.'};
 if(C.hp<C.maxHp*.4)return{k:'angry',msg:'Здоровье тает. Пора позаботиться о себе.'};
 if(xp>=80)return{k:'wow',msg:'Ого! Столько опыта за один день!'};
 if(xp>=40)return{k:'happy',msg:'Сколько всего сделано! Вот это день.'};
 if(L.tdone||L.wk)return{k:'read',msg:'Свиток прочитан. Голова гудит, но приятно.'};
 if(xp>0||r.touched){
  if(isToday&&h>=20)return{k:'angry',msg:'Вечер, а сделано совсем немного. Успеем ещё?'};
  return{k:'calm',msg:'Хорошее начало. Что ещё успеем?'}}
 if(!isToday)return{k:'angry',msg:'Этот день прошёл впустую.'};
 if(h>=14)return{k:'angry',msg:'Полдня прошло, а мы ещё ничего не сделали.'};
 if(h>=11)return{k:'think',msg:'Утро уже позади. С чего начнём?'};
 if(h<9)return{k:'shy',msg:'Ещё так рано… Пять минуточек.'};
 return{k:'neutral',msg:'Новый день. С чего начнём?'};
}
const portrait=(k,cls,alt)=>`<img class="${cls}" src="${ART[MOODS[k]]}" alt="${alt?esc(alt):''}">`;
"""
a=s.index('/* ---------- Героиня 40×56'); b=s.index('const topStats=')
s=s[:a]+art+qv+hero+'\n'+s[b:]
# image icons from the art sheet
rep("const iconArt=(id,cls)=>{","const iconArt=(id,cls)=>`<img class=\"${cls||''} itemart\" src=\"${itemURL(ICONS[id]?id:'chest')}\" alt=\"\">`;const _oldIconArt=(id,cls)=>{")
# names of new icons in the shop selector
s=s.replace("const RARITY=",open("items.js",encoding="utf8").read()+open("icons2.js",encoding="utf8").read()+"for(const k in ICONS)delete ICONS[k];for(const k in ITEM_ART)ICONS[k]={name:ITEM_ART[k].name};\nconst RARITY=",1)
rep("const GICON={study:'book',work:'chest',move:'sword',body:'potion',soul:'orb',bad:'dice'};","const GICON={study:'physics',work:'calc',move:'skate',body:'mug',soul:'scope',bad:'dice'};\nconst GTILE={};const GIC={study:'study',work:'work',move:'move',body:'body',soul:'soul',bad:'bad'};\nconst STATIC={int:'int',str:'str',agi:'agi',vit:'vit',wil:'wil',cha:'cha',cre:'cre',cur:'cur'};")
rep("${iconArt(GICON[g],'gico')}","<img class=\"gico\" src=\"${ART[GTILE[g]]}\" alt=\"\">")
# header avatar
rep("${heroArt(C.sxp,'sprite mini',1)}","<img class=\"ava\" src=\"${ART.p_neutral}\" alt=\"\">")
# hero card on today
rep("<div class=\"hc\"><div class=\"stage sm\">${stageSVG()}${heroArt(C.sxp,'sprite')}</div><div><div class=\"h\">${esc(heroClass(C.sxp))}</div><div class=\"small\">Ур. ${C.lvl+1} · ${esc(RANKS[C.lvl][0])} · ${RANKS[C.lvl][1]}</div></div></div>",
    "<div class=\"mood\">${moodPortrait(C,'','Героиня')}<div><div class=\"h\" style=\"margin:0\">${esc(heroClass(C.sxp))}</div><div class=\"small\">Ур. ${C.lvl+1} · ${esc(RANKS[C.lvl][0])} · ${RANKS[C.lvl][1]}</div><div class=\"bubble\">${esc(moodState(C).msg)}</div></div></div>")
# hero page
rep("<section class=\"win pad heroid\"><div class=\"stage big\">${stageSVG()}${heroArt(sxp,'sprite')}</div><div><div class=\"small\">Персонаж</div>",
    "<section class=\"win pad heroid\"><img class=\"portrait\" src=\"${ART.p_main}\" alt=\"Портрет героини\"><div class=\"moods\" aria-label=\"Настроения\">${['neutral','think','happy','angry','tired'].map(k=>portrait(k,'',MOODS[k][1])).join('')}</div><div><div class=\"small\">Персонаж</div>")
rep(", а в руках у героини появляется предмет главной. Делай разное, и она будет меняться.",". Делай разное, и он будет меняться. Портрет на главной меняется вместе с днём: радуется клятвам, устаёт на больничном и хмурится, когда тает здоровье.")
# library banner
rep("<div class=\"two\">${topicFull('day',d)}${topicFull('week',d)}</div>",
    "<section class=\"win pad libbanner\"><div><h1 class=\"sec\" style=\"margin:0 0 6px\">Библиотека</h1><p class=\"hook\">Свиток дня и свиток недели. Прочитай, ответь на вопрос и запиши мысль: так тема попадает в летопись.</p></div></section>\n  <div class=\"two\">${topicFull('day',d)}${topicFull('week',d)}</div>")
# level up
rep('<div class="inner"><div class="px" style="font-size:11px;color:var(--gold)">Level up!</div>','<div class="inner"><img class="lvlpic" src="${ART.a_wow}" alt=""><div class="px" style="font-size:11px;color:var(--gold)">Level up!</div>')
# frame border-image
i=s.index('render();\nconnect();')
s=s[:i]+"try{const st=document.createElement('style');st.textContent=`.win,.top,#lvl .inner{border-image:url(${QV.frameURL()}) 6 / 12px stretch}@media (max-width:600px){.win,.top,#lvl .inner{border-image-width:10px}}`;document.body.appendChild(st)}catch(e){}\n"+s[i:]

# --- выходные свободны только от работы: учёба и клятвы как обычно ---
rep("Обязательные дела дня: учёба, движение, чтение, вода, а по субботам допзанятие.","Обязательные дела дня: учёба, движение, чтение, вода, а по субботам допзанятие. Суббота и воскресенье свободны только от работы: учёба, клятвы и задания наставницы остаются.")
# --- аватар с меняющимися эмоциями ---
rep('<img class="ava" src="${ART.p_neutral}" alt="">',"${moodPortrait(C,'ava')}")
rep("""<div class="moods" aria-label="Настроения">${['neutral','think','happy','angry','tired'].map(k=>portrait(k,'',MOODS[k][1])).join('')}</div>""","")
rep(" Портрет на главной меняется вместе с днём: радуется клятвам, устаёт на больничном и хмурится, когда тает здоровье."," Портрет в шапке и на главной показывает, как идёт день: много сделано, и она радуется; полдня без дел, и она злится; прочитала свиток, и сидит с книгой; на отгуле и больничном устаёт.")
rep("const portrait=(k,cls,alt)=>","""let lastC=null,lastMood='';
function moodPortrait(C,cls,alt){lastC=C;const m=moodState(C);lastMood=m.k;const src=ART[MOODS[m.k]];return `<img class="${cls}" src="${src}" alt="${alt?esc(alt):''}" title="${esc(m.msg)}">`}
/* раз в минуту: если час сменил настроение (например, наступил полдень без дел), перерисовываем */
let lastHr=new Date().getHours();setInterval(()=>{const h=new Date().getHours();if(lastC&&!document.hidden&&(moodState(lastC).k!==lastMood||h!==lastHr)){lastHr=h;render()}},60000);
const portrait=(k,cls,alt)=>""")

# --- без смайликов ---
rep("const heart=h=>h?`<span class=\"chip hp\">${sg(h)} ♥</span>`:'';","const heart=h=>h?`<span class=\"chip hp\">${sg(h)} HP</span>`:'';")
rep("−${S.pen.hp} ♥.`;","−${S.pen.hp} HP.`;")
rep("${C.hp}/${C.maxHp} ♥</span>","${C.hp}/${C.maxHp} HP</span>")
rep("<b>${open?'★':'☆'} ${esc(t[0])}</b>","<b>${esc(t[0])}${open?'':' (закрыт)'}</b>")
rep("${done?'✓':'⚂'}","${done?'✓':'?'}")
rep("${r.faint?' ✕':''}","${r.faint?' (обморок)':''}")
rep("${ACH.map(a=>{const v=a[3](C.T),ok=v>=a[4];return `<div class=\"badge ${ok?'got':''}\"><span class=\"sym\" aria-hidden=\"true\"><span>${a[0]}</span></span>",
    "${ACH.map((a,i)=>{const v=a[3](C.T),ok=v>=a[4];return `<div class=\"badge ${ok?'got':''}\"><span class=\"sym\" aria-hidden=\"true\">${esc(a[0])}</span>")
# --- значки в рамках в заголовках панелей ---
i=s.index('render();\nconnect();')
s=s[:i]+r"""const ACH_SYM=['λ','Σ','Ψ','F','∞','S','∇','Γ','η','β','Я','v','k','Q','C','W','Λ','?','Ω','T','φ','M','Au','e⁻','θ','7','α','ν','p'];
ACH.forEach((a,i)=>{if(ACH_SYM[i])a[0]=ACH_SYM[i]});
const ICPOOL=Object.keys(ICON_ART);
const HEAD_RULES=[[/босс|бестиар/i,'beast'],[/лавк/i,'shop'],[/покупк/i,'receipt'],[/товар/i,'tag'],[/утрен/i,'sun'],[/вечер/i,'moon'],[/легенд/i,'legend'],[/случа/i,'dice'],[/первых/i,'camera'],[/сюжет/i,'compass'],[/квесты недели/i,'calendar'],[/доск/i,'board'],[/журнал/i,'journal'],[/свои квест/i,'pencil'],[/квест/i,'quests'],[/трофе/i,'trophy'],[/лестниц/i,'atom'],[/добыч/i,'loot'],[/опыт за/i,'chart'],[/летопис/i,'hourglass'],[/^дни/i,'calendar'],[/фолиант/i,'tome'],[/прочитан/i,'scrolls'],[/свиток/i,'scroll'],[/библиот/i,'shelf'],[/клятв/i,'oath'],[/характер/i,'radar'],[/растёт/i,'sprout'],[/совет/i,'owl'],[/свод|правил/i,'scales'],[/дела и/i,'checklist'],[/своё дело/i,'pencil'],[/сохран/i,'save'],[/цел/i,'target']];
/* В одной вкладке значок не повторяется: занятый заменяется ближайшим свободным */
function decorateHeads(){const used=new Set([...document.querySelectorAll('#app [data-ic]')].map(x=>x.dataset.ic));
 document.querySelectorAll('#app h2.h,#app h2.sec,#app h1.sec').forEach(h=>{
  if(h.closest('.ghead,.boss,.libbanner')||h.querySelector('.hico'))return;
  const t=h.textContent.trim(),r=HEAD_RULES.find(x=>x[0].test(t));let k=r&&!used.has(r[1])?r[1]:ICPOOL.find(x=>!used.has(x));if(!k)return;used.add(k);
  const im=document.createElement('img');im.className='hico';im.alt='';im.src=iconURL2(k);im.dataset.ic=k;h.classList.add('withico');h.prepend(im)})}
{const _r=render;render=function(){document.body.dataset.tab=tab;const C=_r();decorateHeads();return C}}
"""+s[i:]
rep('<img class="gico" src="${ART[GTILE[g]]}" alt="">','<img class="gico" src="${iconURL2(GIC[g])}" data-ic="${GIC[g]}" alt="">')

# --- значки характеристик, без монетки ---
rep('<span class="stab">${s.ab}</span>','<img class="stab" src="${iconURL2(STATIC[s.k])}" data-ic="${STATIC[s.k]}" alt="${s.ab}">')
rep("const coinArt=pix(","const coinArt='';const _coinOld=pix(")
rep('Квантовая<br>сага','Звёздный <br>конспект')

# --- наставница ---
rep("function calcDay(d,prev,now,start,lv){",open("mentor.js",encoding="utf8").read()+"function calcDay(d,prev,now,start,lv){")
rep(" const os=oathsFor(d).map"," {const mt=mentorTask(d);if(mt&&d>=MENTOR_FROM&&d>=start){if(mentorDone(mt,a)){addTo(xp,MENTOR_REWARD);gold+=MENTOR_GOLD;line('Задание наставницы: '+mt.t.toLowerCase(),MENTOR_REWARD,MENTOR_GOLD)}else if(d<now&&type==='normal'){addTo(xp,MENTOR_PEN);line('Наставница недовольна: задание не сделано',MENTOR_PEN)}}}\n const os=oathsFor(d).map")
rep('<div class="mainc">${oathPanel(r,isToday)}','<div class="mainc">${mentorCard(d)}${oathPanel(r,isToday)}')
rep("<li><b>Библиотека.</b>","<li><b>Наставница.</b> Профессор Гранина каждый день, включая выходные, даёт учебное задание: лекции, задачи, разбор ошибок, повторение. Оно проверяется само по отмеченным делам. Сделано: +6 ИНТ, +3 ВОЛ и +15 золота. Не сделано к полуночи: −4 ВОЛ и выговор утром. На отгуле и больничном заданий нет.</li>\n   <li><b>Библиотека.</b>")

# --- штраф за пропуск субботнего допзанятия ---
rep("function calcDay(d,prev,now,start,lv){","const SAT_PEN={int:-5,wil:-3},SAT_PEN_HP=-10,SAT_PEN_FROM='2026-11-07';\nfunction satPenRow(d,L){if(!isSat(d))return '';const a=L.a||{},done=!!a.sat,past=d<today()&&d>=S.start&&d>=SAT_PEN_FROM&&(L.type||'normal')==='normal';\n const st=done?'<span class=\"chip\" style=\"--c:var(--ok)\">не грозит</span>':past?'<span class=\"chip hp\">получен</span>':'<span class=\"chip\">в полночь, если не отметить</span>';\n return `<div class=\"row ${done?'off':''}\"><div class=\"rname\"><b>Пропуск субботнего допзанятия</b><small>Ставится сам, если допзанятие не отмечено до конца субботы</small><span class=\"chips\">${xpChips(SAT_PEN)}${heart(SAT_PEN_HP)}</span></div><div class=\"ctl\">${st}</div></div>`}\nfunction calcDay(d,prev,now,start,lv){",1)
rep(" if(type==='sick'){hpD+=15;"," if(isSat(d)&&!a.sat&&d<now&&type==='normal'&&d>=start&&d>=SAT_PEN_FROM){addTo(xp,SAT_PEN);hpD+=SAT_PEN_HP;line('Пропущено субботнее допзанятие',SAT_PEN,0,SAT_PEN_HP)}\n if(type==='sick'){hpD+=15;")
rep("<h2 class=\"h\">${GROUPS[g]}</h2></div>${items.map(x=>rowHTML(x,d,L)).join('')}</section>","<h2 class=\"h\">${GROUPS[g]}</h2></div>${items.map(x=>rowHTML(x,d,L)).join('')}${g==='bad'?satPenRow(d,L):''}</section>")
rep("<li><b>Здоровье.</b>","<li><b>Пропуск субботнего допзанятия.</b> Если в субботу допзанятие не отмечено до полуночи, ставится штраф: −5 ИНТ, −3 ВОЛ и −10 здоровья. Это сверх нарушенной клятвы.</li>\n   <li><b>Здоровье.</b>")
exec(open('nooath.py',encoding='utf8').read())
exec(open('legends.py',encoding='utf8').read())
exec(open('study.py',encoding='utf8').read())
exec(open('branches.py',encoding='utf8').read())
exec(open('cut18.py',encoding='utf8').read())
R('${heroCard(C)}${lootCard(r)}','${lootCard(r)}')
open('kvantovaya-saga-dolina.html','w',encoding='utf8').write(s)
print(len(s))
