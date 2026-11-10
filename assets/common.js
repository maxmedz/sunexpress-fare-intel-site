const FI = {
  async json(p){const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw new Error(p+' '+r.status);return r.json();},
  eur(x){return x==null?'–':'€'+Math.round(x);},
  pct(x){return x==null?'–':Math.round(x*100)+'%';},
  vclass(v){return {'Buy now':'v-buy','Wait':'v-wait','No rush':'v-norush','Check':'v-check'}[v]||'v-none';},
  pill(v){return `<span class="pill ${FI.vclass(v)}">${v}</span>`;},
  routeName(r,city){const [a,b]=r.split('-');return `${city[a]||a} → ${city[b]||b}`;},
  bar(p){return p==null?'–':`<span class="bar"><i style="width:${Math.min(100,p*100)}%"></i></span>${FI.pct(p)}`;},
  header(on){
    const more=[['explorer.html','Explorer (all departures)'],['trip.html','Trip optimizer'],['insights.html','Insights'],['track.html','Track record']];
    const cur=more.find(([h])=>h===on);
    document.write(`<header><a class="brand" href="index.html">SunExpress <span>Fare Intel</span></a><nav><a href="index.html" class="${on==='index.html'?'on':''}">Forecast</a>
    <details class="more"><summary class="${cur?'on':''}">${cur?cur[1].replace(' (all departures)',''):'More'} ▾</summary><div class="menu">${more.map(([h,t])=>`<a href="${h}" class="${on===h?'on':''}">${t}</a>`).join('')}</div></details></nav><div class="muted small" id="asof"></div></header>`);
    document.addEventListener('click',e=>{const d=document.querySelector('details.more');if(d&&d.open&&!d.contains(e.target))d.open=false;});
  },
  footer(meta){
    document.getElementById('asof').textContent=`Data through ${meta.data_through} · updated ${meta.generated_at.replace('T',' ').slice(0,16)} Paris`;
  }
};
Chart.defaults.color='#9aa3b2';Chart.defaults.borderColor='#262b36';Chart.defaults.font.family='-apple-system,Segoe UI,Roboto,sans-serif';
