
/* ---------- Значки игры: пиксель-арт 32×32 в стиле предметов лавки (заливка, блики, тени, контур) ---------- */
const C_={gold:'#e8b33a',goldL:'#ffe08a',goldD:'#a8732a',wood:'#a8693a',woodL:'#cf8f55',woodD:'#6e4120',paper:'#f2e8d4',paperD:'#cbbd9f',ink:'#2a2226',blue:'#3d6fc4',blueL:'#7fa6e8',blueD:'#25478a',red:'#d6404e',redL:'#ff8a96',redD:'#8e2230',green:'#3fa36a',greenL:'#7fd08e',greenD:'#25633f',steel:'#9aa3ad',steelL:'#dfe7ee',steelD:'#5f6873',pink:'#e45a98',purple:'#8a5cd6',purpleL:'#c3a6f5',skin:'#f3cba6',white:'#ffffff',dark:'#3a3540'};
const ICON_ART={
 /* --- группы дел --- */
 study(g){ /* стопка книг и карандаш */
  P.r(g,4,22,22,5,C_.blue);P.r(g,4,22,22,1,C_.blueL);P.r(g,23,23,3,3,C_.paper);P.r(g,6,24,12,1,C_.gold);
  P.r(g,6,16,20,5,C_.red);P.r(g,6,16,20,1,C_.redL);P.r(g,6,17,3,3,C_.paper);P.r(g,12,18,10,1,C_.gold);
  P.r(g,5,10,18,5,C_.green);P.r(g,5,10,18,1,C_.greenL);P.r(g,20,11,3,3,C_.paper);P.r(g,8,12,8,1,C_.goldL);
  P.poly(g,[[22,3],[26,3],[26,11],[24,14],[22,11]],C_.gold);P.r(g,22,3,1,8,C_.goldL);P.r(g,22,2,4,2,C_.pink);P.p(g,24,13,C_.ink)},
 work(g){ /* портфель с застёжками */
  P.r(g,11,5,10,5,C_.woodD);P.r(g,13,7,6,3,'rgba(0,0,0,0)');g.clearRect(13,7,6,3);
  P.r(g,3,10,26,17,C_.wood);P.r(g,3,10,26,2,C_.woodL);P.r(g,3,25,26,2,C_.woodD);P.r(g,3,16,26,2,C_.woodD);
  P.r(g,13,14,6,6,C_.gold);P.r(g,14,15,4,1,C_.goldL);P.r(g,15,17,2,2,C_.goldD);P.r(g,6,11,1,15,C_.woodD);P.r(g,25,11,1,15,C_.woodD)},
 move(g){ /* кроссовок с линиями скорости */
  P.poly(g,[[8,10],[15,10],[17,15],[27,18],[29,23],[29,26],[6,26],[6,14]],C_.blue);P.poly(g,[[8,10],[15,10],[16,13],[8,13]],C_.blueL);
  P.r(g,6,24,23,3,C_.white);P.r(g,6,26,23,1,C_.paperD);P.l(g,12,14,18,17,C_.white);P.l(g,13,17,19,19,C_.white);P.r(g,22,19,4,2,C_.red);
  P.r(g,1,12,4,1,C_.steelL);P.r(g,0,16,5,1,C_.steelL);P.r(g,2,20,3,1,C_.steelL)},
 body(g){ /* стакан воды, яблоко и луна сна */
  P.poly(g,[[3,9],[13,9],[12,28],[4,28]],'#cfe6f0');P.poly(g,[[4,15],[12,15],[12,28],[4,28]],'#5fa8e0');P.r(g,4,15,8,1,'#a4d4ec');P.r(g,4,10,1,17,C_.white);
  P.e(g,21,21,7,6,C_.red);P.e(g,19,19,3,2,C_.redL);P.r(g,21,12,1,4,C_.woodD);P.e(g,24,13,2,1,C_.green);P.p(g,18,18,C_.white);
  P.e(g,24,6,4,4,C_.goldL);P.e(g,26,5,3,3,'rgba(0,0,0,0)');g.clearRect(25,2,5,6)},
 soul(g){ /* палитра с кистью */
  P.e(g,15,17,13,10,C_.woodL);P.e(g,15,16,12,8,'#e2b27a');P.e(g,20,22,3,2,'rgba(0,0,0,0)');g.clearRect(18,21,5,3);
  [[8,13,C_.red],[13,10,C_.gold],[19,10,C_.green],[24,14,C_.blue],[9,19,C_.purple]].forEach(([x,y,c])=>{P.e(g,x,y,2,2,c);P.p(g,x-1,y-1,C_.white)});
  P.l(g,27,2,17,18,C_.woodD);P.l(g,28,3,18,19,C_.wood);P.r(g,16,18,3,3,C_.steel);P.r(g,14,20,3,3,C_.ink)},
 bad(g){ /* телефон с трещиной и злым экраном */
  P.r(g,8,2,16,28,C_.dark);P.r(g,8,2,16,2,'#5a5468');P.r(g,10,5,12,20,'#1c2a4a');P.r(g,10,5,12,3,'#2c4070');
  P.l(g,12,6,16,12,C_.redL);P.l(g,16,12,13,17,C_.redL);P.l(g,13,17,18,23,C_.redL);P.l(g,16,12,21,10,C_.redL);
  P.r(g,14,27,4,1,C_.steel);P.r(g,14,3,4,1,C_.steelD)},
 home(g){ /* домик с трубой и тёплым окном */
  P.poly(g,[[3,15],[16,4],[29,15]],C_.red);P.poly(g,[[6,14],[16,6],[16,14]],C_.redL);P.r(g,22,5,3,6,C_.woodD);
  P.r(g,6,15,20,13,C_.paper);P.r(g,6,15,20,2,C_.paperD);P.r(g,9,19,6,9,C_.wood);P.p(g,13,24,C_.gold);
  P.r(g,18,19,6,5,C_.goldL);P.r(g,20,19,1,5,C_.woodD);P.r(g,18,21,6,1,C_.woodD);P.r(g,4,28,24,2,C_.green)},
 /* --- характеристики --- */
 int(g){ /* лампочка-идея */
  P.e(g,16,12,9,9,C_.goldL);P.e(g,16,12,7,7,'#fff3b0');P.e(g,13,9,2,2,C_.white);P.r(g,12,20,8,3,C_.gold);
  P.r(g,12,23,8,5,C_.steel);P.r(g,12,24,8,1,C_.steelD);P.r(g,12,26,8,1,C_.steelD);P.r(g,14,28,4,2,C_.steelD);
  P.l(g,14,15,16,12,C_.goldD);P.l(g,16,12,18,15,C_.goldD);P.r(g,16,15,1,5,C_.goldD);
  [[2,12],[29,12],[16,0],[6,3],[26,3]].forEach(([x,y])=>P.r(g,x,y,2,2,C_.goldL))},
 str(g){ /* гантель */
  P.r(g,8,14,16,4,C_.steel);P.r(g,8,14,16,1,C_.steelL);
  [[3,8],[24,8]].forEach(([x,y])=>{P.r(g,x,y,5,16,C_.dark);P.r(g,x,y,5,2,'#5a5468');P.r(g,x+1,y+2,1,12,'#6a6478')});
  [[1,11],[29,11]].forEach(([x,y])=>{P.r(g,x,y,2,10,C_.dark)})},
 agi(g){ /* скейт с колёсами и линиями скорости */
  P.poly(g,[[3,17],[26,9],[30,11],[29,14],[7,22],[3,21]],'#2c2a33');P.poly(g,[[4,17],[26,10],[29,11],[6,19]],'#4a4656');
  P.poly(g,[[11,15],[18,12],[19,14],[12,17]],C_.green);P.p(g,15,14,C_.goldL);
  P.r(g,8,22,4,2,C_.steel);P.r(g,22,17,4,2,C_.steel);P.e(g,9,25,2,2,C_.paper);P.p(g,9,25,C_.steelD);P.e(g,24,20,2,2,C_.paper);P.p(g,24,20,C_.steelD);
  P.r(g,1,26,6,1,C_.steelL);P.r(g,4,29,7,1,C_.steelL)},
 vit(g){ /* сердце с пульсом */
  P.e(g,10,11,7,7,C_.red);P.e(g,22,11,7,7,C_.red);P.poly(g,[[3,13],[29,13],[16,28]],C_.red);P.e(g,8,8,3,2,C_.redL);P.p(g,7,7,C_.white);
  P.l(g,5,16,10,16,C_.white);P.l(g,10,16,12,11,C_.white);P.l(g,12,11,15,21,C_.white);P.l(g,15,21,17,16,C_.white);P.l(g,17,16,26,16,C_.white)},
 wil(g){ /* щит с пламенем */
  P.poly(g,[[4,4],[28,4],[28,16],[16,29],[4,16]],C_.steel);P.poly(g,[[6,6],[26,6],[26,15],[16,26],[6,15]],C_.blueD);P.poly(g,[[6,6],[16,6],[16,26],[6,15]],C_.blue);
  P.poly(g,[[16,9],[20,15],[19,21],[16,23],[13,21],[12,16]],C_.gold);P.poly(g,[[16,14],[18,18],[16,21],[14,18]],C_.goldL);P.r(g,5,5,22,1,C_.steelL)},
 cha(g){ /* речевое облачко с сердцем */
  P.e(g,16,13,13,10,C_.paper);P.poly(g,[[8,20],[14,22],[6,28]],C_.paper);P.e(g,12,9,4,2,C_.white);
  P.e(g,12,12,3,3,C_.pink);P.e(g,19,12,3,3,C_.pink);P.poly(g,[[9,13],[22,13],[15.5,20]],C_.pink);P.p(g,11,11,C_.white)},
 cre(g){ /* мольберт с картиной */
  P.l(g,8,29,13,8,C_.woodD);P.l(g,24,29,19,8,C_.woodD);P.l(g,16,29,16,22,C_.woodD);
  P.r(g,7,5,18,17,C_.paper);P.r(g,8,6,16,15,'#9fd4f0');P.poly(g,[[8,21],[14,13],[18,17],[21,14],[24,18],[24,21]],C_.green);P.e(g,20,10,2,2,C_.gold);P.r(g,6,21,20,2,C_.wood)},
 cur(g){ /* лупа над звездой */
  P.e(g,13,12,9,9,C_.gold);P.e(g,13,12,7,7,'#cfe6f0');P.e(g,10,9,2,2,C_.white);
  P.poly(g,[[13,7],[14,11],[18,12],[14,13],[13,17],[12,13],[8,12],[12,11]],C_.purple);
  P.l(g,20,19,28,27,C_.woodD);P.l(g,21,19,29,27,C_.wood);P.l(g,20,20,28,28,C_.woodD)},
 /* --- разделы --- */
 oath(g){ /* свиток клятвы с сургучной печатью */
  P.r(g,6,5,20,22,C_.paper);P.r(g,4,3,24,4,C_.paperD);P.r(g,4,25,24,4,C_.paperD);P.r(g,4,3,24,1,C_.white);
  [9,13,17].forEach(y=>P.r(g,9,y,14,1,'#8a7a68'));P.e(g,20,22,4,4,C_.red);P.e(g,19,21,1,1,C_.redL);P.r(g,18,25,2,5,C_.red);P.r(g,22,25,2,4,C_.redD)},
 loot(g){ /* мешок монет */
  P.e(g,16,20,11,9,C_.woodL);P.e(g,14,18,6,5,'#e2a868');P.poly(g,[[11,6],[21,6],[19,12],[13,12]],C_.woodL);P.r(g,11,11,10,2,C_.woodD);
  P.e(g,16,21,4,4,C_.gold);P.e(g,15,20,2,2,C_.goldL);P.r(g,16,19,1,5,C_.goldD);P.e(g,25,27,3,2,C_.gold);P.e(g,7,27,3,2,C_.gold)},
 quests(g){ /* карта с маршрутом */
  P.poly(g,[[3,7],[11,4],[21,7],[29,4],[29,26],[21,29],[11,26],[3,29]],C_.paper);P.poly(g,[[11,4],[21,7],[21,29],[11,26]],C_.paperD);
  P.l(g,6,24,10,18,C_.red);P.l(g,10,18,16,20,C_.red);P.l(g,16,20,22,12,C_.red);P.r(g,6,10,4,3,C_.green);P.r(g,24,20,3,4,C_.blue);
  P.e(g,23,9,3,3,C_.red);P.p(g,23,9,C_.white);P.poly(g,[[21,10],[25,10],[23,14]],C_.red)},
 camera(g){ /* фотоаппарат */
  P.r(g,3,9,26,18,C_.dark);P.r(g,3,9,26,3,'#5a5468');P.r(g,10,6,10,4,C_.dark);P.r(g,23,6,4,3,C_.red);
  P.e(g,16,18,7,7,C_.steel);P.e(g,16,18,5,5,'#1c2a4a');P.e(g,16,18,3,3,C_.blue);P.p(g,14,16,C_.white);P.p(g,15,16,C_.white);P.r(g,5,12,4,2,C_.steelL)},
 scroll(g){ /* свёрнутый свиток с лентой */
  P.r(g,7,6,18,20,C_.paper);P.e(g,7,16,3,10,C_.paperD);P.e(g,25,16,3,10,C_.paperD);P.e(g,25,16,1,8,C_.paper);
  [10,14,18,22].forEach(y=>P.r(g,10,y,12,1,'#8a7a68'));P.r(g,14,4,4,24,C_.blue);P.r(g,14,4,1,24,C_.blueL)},
 tome(g){ /* толстый фолиант с застёжкой */
  P.r(g,5,4,22,25,C_.redD);P.r(g,7,4,20,22,C_.red);P.r(g,9,26,18,3,C_.paper);for(let x=10;x<27;x+=2)P.p(g,x,27,C_.paperD);
  P.r(g,11,8,12,14,C_.redD);P.e(g,17,15,3,3,C_.gold);P.p(g,16,14,C_.goldL);P.r(g,23,13,6,4,C_.gold);P.r(g,26,14,2,2,C_.goldD);
  [[7,4],[24,4]].forEach(([x,y])=>P.r(g,x,y,3,3,C_.gold))},
 quill(g){ /* перо и чернильница */
  P.poly(g,[[27,2],[29,4],[14,22],[11,21]],C_.white);P.poly(g,[[27,2],[29,4],[20,14],[17,13]],C_.paperD);P.l(g,28,3,12,21,C_.steel);
  P.r(g,6,20,12,9,C_.ink);P.r(g,8,18,8,3,C_.dark);P.r(g,7,21,2,6,'#5a5468');P.r(g,9,18,6,1,C_.blueD)},
 sun(g){ /* солнце утреннего квеста */
  P.e(g,16,16,7,7,C_.gold);P.e(g,15,15,5,5,C_.goldL);P.p(g,13,13,C_.white);
  [[16,2],[16,27],[2,16],[27,16],[6,6],[24,6],[6,24],[24,24]].forEach(([x,y])=>P.r(g,x,y,3,3,'#f2a33c'))},
 moon(g){ /* луна и звёзды вечернего квеста */
  P.e(g,15,16,11,11,'#efe6d2');P.e(g,20,12,9,9,'rgba(0,0,0,0)');g.clearRect(0,0,0,0);
  const d=g.getImageData(0,0,32,32);for(let y=0;y<32;y++)for(let x=0;x<32;x++){if((x-21)**2+(y-12)**2<=80)d.data[(y*32+x)*4+3]=0}g.putImageData(d,0,0);
  P.e(g,9,19,2,2,'#cbb59d');P.e(g,13,25,1,1,'#cbb59d');[[25,22],[28,6],[22,27]].forEach(([x,y])=>{P.r(g,x,y-1,1,3,C_.goldL);P.r(g,x-1,y,3,1,C_.goldL)})},
 legend(g){ /* корона с камнем */
  P.poly(g,[[3,10],[9,18],[16,6],[23,18],[29,10],[27,26],[5,26]],C_.gold);P.poly(g,[[5,13],[9,20],[16,10],[16,25],[6,25]],C_.goldL);
  P.r(g,5,22,22,4,C_.goldD);P.e(g,16,23,2,2,C_.red);P.p(g,15,22,C_.redL);P.e(g,9,24,1,1,C_.blue);P.e(g,23,24,1,1,C_.green);
  [[3,9],[16,5],[29,9]].forEach(([x,y])=>P.e(g,x,y,2,2,C_.gold))},
 dice(g){ /* игральный кубик */
  P.poly(g,[[4,10],[16,4],[28,10],[16,16]],C_.white);P.poly(g,[[4,10],[16,16],[16,29],[4,23]],'#d8cfc2');P.poly(g,[[16,16],[28,10],[28,23],[16,29]],'#b3a796');
  P.r(g,15,9,3,2,C_.red);[[7,15],[10,19],[7,22],[12,23]].forEach(([x,y])=>P.r(g,x,y,2,2,C_.ink));[[19,18],[24,15],[21,23]].forEach(([x,y])=>P.r(g,x,y,2,2,C_.ink))},
 compass(g){ /* компас сюжетных цепочек */
  P.e(g,16,16,13,13,C_.gold);P.e(g,16,16,11,11,C_.paper);P.e(g,16,16,10,10,'#e9dcc6');
  P.poly(g,[[16,5],[19,16],[13,16]],C_.red);P.poly(g,[[16,27],[19,16],[13,16]],C_.steelD);P.e(g,16,16,1,1,C_.gold);
  [[16,3],[16,29],[3,16],[29,16]].forEach(([x,y])=>P.r(g,x,y,1,1,C_.ink))},
 calendar(g){ /* календарь недели */
  P.r(g,4,6,24,22,C_.paper);P.r(g,4,6,24,6,C_.red);P.r(g,4,6,24,1,C_.redL);P.r(g,9,3,2,6,C_.steelD);P.r(g,21,3,2,6,C_.steelD);
  for(let i=0;i<12;i++){const x=7+(i%4)*5,y=14+Math.floor(i/4)*4;P.r(g,x,y,3,2,i===6?C_.red:C_.paperD)}P.r(g,4,26,24,2,C_.paperD)},
 board(g){ /* доска объявлений с листками */
  P.r(g,3,4,26,22,C_.wood);P.r(g,5,6,22,18,'#c98a4a');P.r(g,3,4,26,2,C_.woodL);P.r(g,8,26,2,4,C_.woodD);P.r(g,22,26,2,4,C_.woodD);
  P.r(g,7,8,8,9,C_.paper);P.r(g,17,9,8,7,'#fff3b0');P.r(g,10,16,10,6,'#cfe6f0');P.e(g,11,8,1,1,C_.red);P.e(g,21,9,1,1,C_.blue);P.e(g,15,16,1,1,C_.green);
  [10,12,14].forEach(y=>P.r(g,8,y,6,1,C_.paperD))},
 journal(g){ /* дневник на ремешке */
  P.r(g,6,3,20,26,C_.purple);P.r(g,6,3,3,26,'#5a3796');P.r(g,23,5,3,22,C_.paper);P.r(g,11,8,10,6,C_.purpleL);P.r(g,12,10,8,1,C_.white);
  P.r(g,6,18,22,3,C_.woodD);P.r(g,25,17,4,5,C_.gold);P.p(g,26,19,C_.goldL)},
 pencil(g){ /* карандаш для своих квестов */
  P.poly(g,[[24,3],[29,8],[11,26],[6,21]],C_.gold);P.poly(g,[[24,3],[26,5],[8,23],[6,21]],C_.goldL);P.poly(g,[[6,21],[11,26],[3,29]],'#f3cba6');P.poly(g,[[3,29],[5,25],[7,27]],C_.ink);
  P.poly(g,[[24,3],[29,8],[27,10],[22,5]],C_.pink);P.l(g,21,6,26,11,C_.steel)},
 trophy(g){ /* кубок */
  P.poly(g,[[8,4],[24,4],[23,15],[16,20],[9,15]],C_.gold);P.poly(g,[[9,5],[14,5],[14,18],[10,15]],C_.goldL);
  P.e(g,6,9,3,4,C_.gold);P.e(g,6,9,1,2,'rgba(0,0,0,0)');g.clearRect(6,8,1,3);P.e(g,26,9,3,4,C_.gold);g.clearRect(26,8,1,3);
  P.r(g,14,20,4,4,C_.goldD);P.r(g,9,24,14,5,C_.wood);P.r(g,9,24,14,1,C_.woodL);P.r(g,12,26,8,1,C_.goldL);P.e(g,16,10,2,2,C_.red)},
 atom(g){ /* атом для лестницы масштабов */
  [[0],[60],[120]].forEach(([a])=>{for(let t=0;t<360;t+=4){const r=t*Math.PI/180,x=12*Math.cos(r),y=4.5*Math.sin(r),A=a*Math.PI/180;P.p(g,Math.round(16+x*Math.cos(A)-y*Math.sin(A)),Math.round(16+x*Math.sin(A)+y*Math.cos(A)),C_.blueL)}});
  P.e(g,16,16,3,3,C_.red);P.p(g,15,15,C_.redL);P.e(g,28,16,1,1,C_.gold);P.e(g,10,6,1,1,C_.gold);P.e(g,10,26,1,1,C_.gold)},
 shop(g){ /* лавка под навесом */
  P.r(g,5,14,22,14,C_.wood);P.r(g,5,14,22,2,C_.woodD);P.r(g,8,18,8,10,C_.woodD);P.r(g,18,18,6,5,'#9fd4f0');P.r(g,18,18,6,1,C_.white);
  for(let i=0;i<6;i++)P.poly(g,[[3+i*4.5,6],[7.5+i*4.5,6],[7.5+i*4.5,12],[3+i*4.5,12]],i%2?C_.white:C_.red);
  for(let i=0;i<6;i++)P.e(g,5+i*4.5,12,2,1,i%2?C_.white:C_.red);P.e(g,14,24,1,1,C_.gold)},
 receipt(g){ /* чек покупок */
  P.poly(g,[[7,3],[25,3],[25,28],[22,26],[19,28],[16,26],[13,28],[10,26],[7,28]],C_.paper);
  [7,10,13,16].forEach((y,i)=>{P.r(g,10,y,8,1,'#8a7a68');P.r(g,20,y,3,1,'#8a7a68')});P.r(g,10,20,13,1,C_.ink);P.r(g,18,22,5,2,C_.red)},
 tag(g){ /* ценник */
  P.poly(g,[[12,3],[28,3],[28,19],[14,29],[3,18]],C_.gold);P.poly(g,[[12,3],[28,3],[28,5],[5,17],[3,18]],C_.goldL);P.e(g,22,9,2,2,C_.dark);
  P.l(g,10,18,16,12,C_.goldD);P.l(g,13,21,19,15,C_.goldD)},
 radar(g){ /* паутинка характеристик: восемь осей и заполненный многоугольник */
  const pt=(i,r)=>{const t=-Math.PI/2+i*Math.PI/4;return [16+r*Math.cos(t),16+r*Math.sin(t)]};
  P.poly(g,[0,1,2,3,4,5,6,7].map(i=>pt(i,13)),'#3a3540');P.poly(g,[0,1,2,3,4,5,6,7].map(i=>pt(i,8)),'#4a4656');
  [0,1,2,3,4,5,6,7].forEach(i=>{const [x,y]=pt(i,13);P.l(g,16,16,Math.round(x),Math.round(y),'#6a6478')});
  const v=[11,7,12,6,10,8,13,9];P.poly(g,v.map((r,i)=>pt(i,r)),C_.gold);P.poly(g,v.map((r,i)=>pt(i,r*.55)),C_.goldL);
  v.forEach((r,i)=>{const [x,y]=pt(i,r);P.r(g,Math.round(x)-1,Math.round(y)-1,2,2,C_.white)})},
 sprout(g){ /* росток в горшке */
  P.poly(g,[[9,21],[23,21],[21,29],[11,29]],'#c2643a');P.r(g,8,20,16,3,'#d97a4a');P.r(g,15,8,2,13,C_.greenD);
  P.e(g,10,11,5,3,C_.green);P.e(g,22,8,5,3,C_.green);P.e(g,9,10,2,1,C_.greenL);P.e(g,22,7,2,1,C_.greenL);P.e(g,16,5,2,3,C_.greenL)},
 owl(g){ /* сова-наставница */
  P.e(g,16,18,11,11,C_.woodL);P.e(g,16,21,7,7,C_.paper);P.poly(g,[[6,6],[11,9],[7,12]],C_.woodL);P.poly(g,[[26,6],[21,9],[25,12]],C_.woodL);
  P.e(g,11,13,4,4,C_.white);P.e(g,21,13,4,4,C_.white);P.e(g,11,13,2,2,C_.ink);P.e(g,21,13,2,2,C_.ink);P.p(g,10,12,C_.white);P.p(g,20,12,C_.white);
  P.poly(g,[[14,16],[18,16],[16,20]],C_.gold);[19,22,25].forEach(y=>P.r(g,13,y,6,1,C_.paperD));P.r(g,8,13,1,1,C_.goldD)},
 scales(g){ /* весы правил */
  P.r(g,15,4,2,22,C_.gold);P.r(g,10,26,12,3,C_.goldD);P.r(g,4,8,24,2,C_.gold);P.e(g,16,4,2,2,C_.goldL);
  P.l(g,6,10,3,19,C_.steel);P.l(g,6,10,9,19,C_.steel);P.l(g,26,10,23,17,C_.steel);P.l(g,26,10,29,17,C_.steel);
  P.e(g,6,20,4,1,C_.gold);P.e(g,26,18,4,1,C_.gold);P.e(g,6,18,2,1,C_.red)},
 checklist(g){ /* планшет со списком дел */
  P.r(g,6,4,20,25,C_.wood);P.r(g,8,7,16,20,C_.paper);P.r(g,12,2,8,5,C_.steel);P.r(g,13,3,6,1,C_.steelL);
  [10,15,20].forEach((y,i)=>{P.r(g,10,y,3,3,i<2?C_.green:C_.paperD);P.r(g,15,y+1,7,1,'#8a7a68')});P.p(g,11,11,C_.white);P.p(g,11,16,C_.white)},
 save(g){ /* сундучок-хранилище с замком */
  P.r(g,4,8,24,19,C_.blueD);P.r(g,4,8,24,3,C_.blue);P.r(g,8,8,16,8,C_.steelL);P.r(g,18,10,3,4,C_.steel);P.r(g,8,19,16,8,C_.paper);
  [21,23,25].forEach(y=>P.r(g,10,y,12,1,C_.paperD))},
 target(g){ /* мишень целей */
  P.e(g,15,17,12,12,C_.red);P.e(g,15,17,9,9,C_.white);P.e(g,15,17,6,6,C_.red);P.e(g,15,17,3,3,C_.white);P.e(g,15,17,1,1,C_.red);
  P.l(g,15,17,28,4,C_.woodD);P.poly(g,[[26,2],[30,2],[30,6]],C_.green)},
 chart(g){ /* столбики опыта */
  P.r(g,4,27,25,2,C_.paperD);[[6,18,C_.blue],[12,12,C_.green],[18,15,C_.gold],[24,6,C_.red]].forEach(([x,y,c])=>{P.r(g,x,y,4,27-y,c);P.r(g,x,y,1,27-y,'rgba(255,255,255,.35)')});
  P.l(g,5,17,13,10,C_.white);P.l(g,13,10,19,13,C_.white);P.l(g,19,13,26,4,C_.white)},
 hourglass(g){ /* песочные часы летописи */
  P.r(g,7,3,18,3,C_.wood);P.r(g,7,26,18,3,C_.wood);P.poly(g,[[9,6],[23,6],[16,16]],'#cfe6f0');P.poly(g,[[16,16],[23,26],[9,26]],'#cfe6f0');
  P.poly(g,[[11,8],[21,8],[16,13]],C_.gold);P.poly(g,[[16,20],[21,26],[11,26]],C_.gold);P.r(g,16,15,1,6,C_.goldL);P.r(g,8,6,1,20,C_.woodD);P.r(g,23,6,1,20,C_.woodD)},
 shelf(g){ /* книжная полка библиотеки */
  P.r(g,3,3,26,26,C_.woodD);P.r(g,5,5,22,9,'#3a2418');P.r(g,5,16,22,10,'#3a2418');P.r(g,3,14,26,2,C_.wood);
  [[6,6,3,C_.red],[9,7,3,C_.blue],[12,5,2,C_.green],[15,6,3,C_.gold],[19,8,4,C_.purple],[6,17,4,C_.green],[10,18,2,C_.red],[13,17,3,C_.blue],[17,19,6,C_.paper]].forEach(([x,y,w,c])=>P.r(g,x,y,w,(y<15?14:26)-y,c))},
 scrolls(g){ /* стопка прочитанных свитков */
  [[4,20,C_.paper],[8,13,C_.paperD],[5,6,C_.paper]].forEach(([x,y,c])=>{P.r(g,x+2,y,20,6,c);P.e(g,x+2,y+3,2,3,C_.paperD);P.e(g,x+22,y+3,2,3,C_.paperD);P.r(g,x+11,y,3,6,C_.red)})},
 beast(g){ /* глаз чудовища */
  P.e(g,16,16,13,9,C_.purple);P.e(g,16,16,10,6,'#f4e8ff');P.e(g,16,16,5,5,C_.red);P.e(g,16,16,2,4,C_.ink);P.p(g,14,13,C_.white);
  [[5,5],[27,5],[16,2]].forEach(([x,y])=>P.l(g,x,y,16,9,C_.purpleL))},
 spark(g){ /* искра по умолчанию */
  P.poly(g,[[16,2],[19,13],[30,16],[19,19],[16,30],[13,19],[2,16],[13,13]],C_.gold);P.poly(g,[[16,8],[18,14],[24,16],[18,18],[16,24],[14,18],[8,16],[14,14]],C_.goldL);P.p(g,16,16,C_.white)}
};
const ICON_CACHE={};
function iconURL2(k){if(ICON_CACHE[k])return ICON_CACHE[k];const c=itC();(ICON_ART[k]||ICON_ART.spark)(c.getContext('2d'));itOutline(c);return ICON_CACHE[k]=c.toDataURL()}
