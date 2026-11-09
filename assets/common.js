const FI = {
  async json(p){const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw new Error(p+' '+r.status);return r.json();},
  eur(x){return x==null?'–':'€'+Math.round(x);},
  pct(x){return x==null?'–':Math.round(x*100)+'%';},
  vclass(v){return {'Buy now':'v-buy','Wait':'v-wait','No rush':'v-norush','Check':'v-check'}[v]||'v-none';},
  pill(v){return `<span class="pill ${FI.vclass(v)}">${v}</span>`;},
  routeName(r,city){const [a,b]=r.split('-');return `${city[a]||a} → ${city[b]||b}`;},
  bar(p){return p==null?'–':`<span class="bar"><i style="width:${Math.min(100,p*100)}%"></i></span>${FI.pct(p)}`;},
  header(on){
    const pages=[['index.html','Explorer'],['trip.html','Trip optimizer'],['insights.html','Insights']];
    document.write(`<header><div class="brand">SunExpress <span>Fare Intel</span></div><nav>${pages.map(([h,t])=>`<a href="${h}" class="${on===h?'on':''}">${t}</a>`).join('')}</nav><div class="muted small" id="asof"></div></header>`);
  },
  footer(meta){
    document.getElementById('asof').textContent=`Data through ${meta.data_through} · updated ${meta.generated_at.replace('T',' ').slice(0,16)} Paris`;
  }
};
Chart.defaults.color='#9aa3b2';Chart.defaults.borderColor='#262b36';Chart.defaults.font.family='-apple-system,Segoe UI,Roboto,sans-serif';
