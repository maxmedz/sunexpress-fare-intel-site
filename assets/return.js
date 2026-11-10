// Explorer "Return" mode: pick CDG->dest + dest->CDG, see the combined fare, its history and the signals per leg.
const RT=(()=>{
 let DEP,META,chart,HIST={},S={dest:'AYT',out:null,back:null,minN:3,maxN:14,month:''};
 const $=id=>document.getElementById(id);
 const DESTS=['AYT','ADB','GZT','ASR'];
 const lbl=d=>`${d.dow} ${d.dep_date} · ${d.price!=null?FI.eur(d.price):'no fare'}${d.price!=null?' · '+d.verdict:''}`;
 async function hist(r){if(!HIST[r])HIST[r]=await FI.json(`data/history/${r}.json`);return HIST[r];}
 function syncUrl(){const q=new URLSearchParams({mode:'return',dest:S.dest,out:S.out||'',back:S.back||'',minN:S.minN,maxN:S.maxN});if(S.month)q.set('month',S.month);history.replaceState(null,'','?'+q);}
 function init(dep,meta,qs){
  DEP=dep;META=meta;
  $('rdest').innerHTML=DESTS.filter(d=>META.routes.includes('CDG-'+d)).map(d=>`<option value="${d}">${META.city.CDG} ⇄ ${META.city[d]||d}</option>`).join('');
  if(qs.get('dest'))S.dest=qs.get('dest');S.out=qs.get('out')||null;S.back=qs.get('back')||null;
  if(qs.get('minN'))S.minN=+qs.get('minN');if(qs.get('maxN'))S.maxN=+qs.get('maxN');S.month=qs.get('month')||'';
  $('rdest').value=S.dest;$('rmin').value=S.minN;$('rmax').value=S.maxN;
  $('rdest').oninput=()=>{S.dest=$('rdest').value;S.out=S.back=null;fill();};
  $('rout').oninput=()=>{S.out=$('rout').value;S.back=null;fill();};
  $('rback').oninput=()=>{S.back=$('rback').value;fill();};
  ['rmin','rmax','rmonth'].forEach(i=>$(i).oninput=()=>{S.minN=Math.max(1,+$('rmin').value||1);S.maxN=Math.max(S.minN,+$('rmax').value||S.minN);S.month=$('rmonth').value;table();syncUrl();});
 }
 function fill(){
  const {outs,backs}=PAIR.legs(DEP,S.dest);
  const noBack=!backs.some(b=>b.price!=null);
  $('rnote').innerHTML=noBack?`<b>Return leg not collected.</b> ${META.city[S.dest]||S.dest} → Paris fares aren't tracked yet, so only one-way prices exist for this route.`:'';
  $('rnote').hidden=!noBack;$('rbody').hidden=noBack;
  const months=[...new Set(outs.filter(d=>d.price!=null).map(d=>d.dep_date.slice(0,7)))];
  $('rmonth').innerHTML='<option value="">Any</option>'+months.map(m=>`<option ${m===S.month?'selected':''}>${m}</option>`).join('');
  if(!months.includes(S.month))S.month='';
  if(noBack){$('rout').innerHTML='';$('rback').innerHTML='';syncUrl();return;}
  const ranked=PAIR.cheapest(DEP,S.dest,{minN:S.minN,maxN:S.maxN});
  if(!S.out||!outs.find(d=>d.id===S.out))S.out=(ranked[0]||{}).out?.id||(outs.find(d=>d.price!=null)||outs[0]||{}).id;
  const out=outs.find(d=>d.id===S.out);
  $('rout').innerHTML=outs.filter(d=>PAIR.returnsAfter(backs,d).length).map(d=>`<option value="${d.id}" ${d.id===S.out?'selected':''}>${lbl(d)}</option>`).join('');
  const after=out?PAIR.returnsAfter(backs,out):[];
  if(!S.back||!after.find(d=>d.id===S.back)){
   const inWin=after.filter(b=>b.price!=null&&PAIR.nights(out,b)>=S.minN&&PAIR.nights(out,b)<=S.maxN).sort((x,y)=>x.price-y.price)[0];
   S.back=(inWin||after.find(b=>b.price!=null)||after[0]||{}).id;}
  $('rback').innerHTML=after.map(d=>`<option value="${d.id}" ${d.id===S.back?'selected':''}>${lbl(d)} · ${PAIR.nights(out,d)}n</option>`).join('');
  show();table();
 }
 function legCard(x,title){
  if(!x)return `<div class="leg"><h3>${title}</h3><p class="muted">Pick a flight.</p></div>`;
  return `<div class="leg"><h3>${title} · ${FI.routeName(x.route,META.city)} ${FI.pill(x.verdict)}</h3>
  <div class="legrow"><b class="big f-${x.fair||'typical'}">${FI.eur(x.price)}</b><span class="muted small">${x.dow} ${x.dep_date} · ${x.flight} ${x.dep_time||''} · ${x.dbd}d to go${x.sale?' <span class="tag">drop</span>':''}</span></div>
  ${x.price==null?`<p class="small muted">${x.reason}</p>`:`<table class="kv small"><tr><td>Rise risk 7d</td><td>${FI.bar(x.p_rise)} <span class="muted">LGBM ${FI.pct(x.p_lgbm)} · Cox ${FI.pct(x.p_cox)}</span></td></tr>
  <tr><td>7-day 80% band</td><td>${FI.eur(x.q10)}–${FI.eur(x.q90)} <span class="muted">(median ${FI.eur(x.q50)})</span></td></tr>
  <tr><td>Google typical</td><td>${x.g_lo!=null?FI.eur(x.g_lo)+'–'+FI.eur(x.g_hi)+' · '+(x.g_level||''):'–'}</td></tr>
  <tr><td>60-day min–max</td><td>${x.min60!=null?FI.eur(x.min60)+'–'+FI.eur(x.max60):'–'}</td></tr></table>
  <p class="small muted" style="margin:6px 0 0">${x.reason} <a href="index.html?route=${x.route}&dep=${encodeURIComponent(x.id)}">Open one-way view</a></p>`}</div>`;
 }
 async function show(){
  syncUrl();
  const a=DEP.find(d=>d.id===S.out),b=DEP.find(d=>d.id===S.back);
  $('rlegs').innerHTML=legCard(a,'Outbound')+legCard(b,'Return');
  if(!a||!b){$('rkpis').innerHTML='';$('rverdict').innerHTML='';return;}
  const p=PAIR.summary(a,b);
  $('rkpis').innerHTML=`<div class="kpi"><span class="muted small">Return total</span><b>${FI.eur(p.total)}</b><span class="small muted">${FI.eur(a.price)} + ${FI.eur(b.price)} · ${p.nights} nights</span></div>
  <div class="kpi"><span class="muted small">7-day band (total)</span><b>${p.band?FI.eur(p.band[0])+'–'+FI.eur(p.band[2]):'–'}</b><span class="small muted">median ${p.band?FI.eur(p.band[1]):'–'}</span></div>
  <div class="kpi"><span class="muted small">Rise risk (either leg)</span><b>${FI.pct(p.risk)}</b><span class="small muted">within 7 days</span></div>
  <div class="kpi"><span class="muted small">Pair verdict</span><b>${FI.pill(p.verdict)}</b><span class="small muted">out ${a.verdict} · back ${b.verdict}</span></div>`;
  $('rverdict').innerHTML=`Pair verdict rule: <b>Buy now</b> if either leg says Buy now; <b>Wait</b> only if both legs say Wait; otherwise <b>No rush</b> (No fare / Check if a leg has no fare or needs a check). Legs are priced and bought separately, so you can also book them on different days.`;
  const [ha,hb]=await Promise.all([hist(a.route),hist(b.route)]);
  const h=PAIR.history(ha.history[a.id],hb.history[b.id]);
  const labels=h.map(x=>x[0]);let fl=null;
  if(p.band&&a.price_date){const d=new Date(a.price_date);d.setDate(d.getDate()+7);fl=d.toISOString().slice(0,10);labels.push(fl);}
  const ds=[{label:'Return total',data:h.map(x=>x[1]),borderColor:'#ffb000',backgroundColor:'#ffb000',pointRadius:0,stepped:true,borderWidth:2.5},
   {label:'Outbound',data:h.map(x=>x[2]),borderColor:'rgba(90,169,255,.8)',pointRadius:0,stepped:true,borderWidth:1},
   {label:'Return leg',data:h.map(x=>x[3]),borderColor:'rgba(62,207,142,.8)',pointRadius:0,stepped:true,borderWidth:1}];
  if(fl){const n=labels.length;const band=v=>labels.map((l,i)=>i===n-1?v:i===n-2?p.total:null);
   ds.push({label:'7d q10',data:band(p.band[0]),borderColor:'rgba(255,176,0,.5)',pointRadius:0,borderWidth:1,spanGaps:true,borderDash:[2,2]});
   ds.push({label:'7d band',data:band(p.band[2]),borderColor:'rgba(255,176,0,.5)',pointRadius:0,borderWidth:1,spanGaps:true,borderDash:[2,2],fill:'-1',backgroundColor:'rgba(255,176,0,.10)'});}
  if(chart)chart.destroy();
  chart=new Chart($('rchart'),{type:'line',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
   plugins:{legend:{labels:{boxWidth:10,filter:i=>!/q10/.test(i.text)}},tooltip:{filter:i=>i.raw!=null}},scales:{x:{ticks:{maxTicksLimit:7}},y:{ticks:{callback:v=>'€'+v}}}}});
  $('rctitle').textContent=`${META.city.CDG} ⇄ ${META.city[S.dest]||S.dest} · ${a.dep_date} → ${b.dep_date}`;
  $('rhnote').textContent=h.length?`Total summed on each day both legs had a price (${h.length} days, ${h[0][0]} → ${h[h.length-1][0]}).`:'No day yet where both legs were priced.';
  document.querySelectorAll('#rtb tr').forEach(tr=>tr.classList.toggle('sel',tr.dataset.o===S.out&&tr.dataset.b===S.back));
 }
 function table(){
  const r=PAIR.cheapest(DEP,S.dest,{minN:S.minN,maxN:S.maxN,month:S.month}).slice(0,30);
  $('rttl').textContent=`Cheapest returns · ${S.minN}–${S.maxN} nights${S.month?' · out in '+S.month:''}`;
  $('rtb').innerHTML=r.map((t,i)=>`<tr data-o="${t.out.id}" data-b="${t.back.id}" class="${t.out.id===S.out&&t.back.id===S.back?'sel':''}"><td class="muted hide-m">${i+1}</td>
  <td>${t.out.dep_date.slice(5)} <span class="muted">${t.out.dow}</span>${t.out.sale?'<span class="tag">drop</span>':''}</td><td>${t.back.dep_date.slice(5)} <span class="muted">${t.back.dow}</span>${t.back.sale?'<span class="tag">drop</span>':''}</td>
  <td class="num">${t.nights}</td><td class="num"><b>${FI.eur(t.total)}</b></td><td class="num hide-m muted">${FI.eur(t.out.price)} + ${FI.eur(t.back.price)}</td>
  <td class="num hide-m muted">${FI.eur(t.band[0])}–${FI.eur(t.band[2])}</td><td class="hide-m">${FI.bar(t.risk)}</td><td>${FI.pill(t.verdict)}</td></tr>`).join('')||'<tr><td colspan=9 class="muted">No priced pairs for this trip length.</td></tr>';
  [...$('rtb').querySelectorAll('tr[data-o]')].forEach(tr=>tr.onclick=()=>{S.out=tr.dataset.o;S.back=tr.dataset.b;fill();$('rkpis').scrollIntoView({behavior:'smooth',block:'start'});});
 }
 return {init,activate:fill};
})();
