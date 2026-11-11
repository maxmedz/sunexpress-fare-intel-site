// Path sampling for the Forecast page (mirrors fareintel/forecast.py; unit-tested with node: tests/test_traj.js).
// A leg forecast = per-horizon quantiles (EUR) at levels QL; values between levels are linear in z-space.
// Paths: Gaussian copula across horizons, corr(h1,h2) = (min/max)^beta. A return pair adds the two legs'
// sampled paths, with cross-leg correlation rho_x between their standardized surprises.
const TRAJ = {
  rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},
  normals(r,n){const o=new Float64Array(n);for(let i=0;i<n;i+=2){const u=Math.max(r(),1e-12),v=r();const m=Math.sqrt(-2*Math.log(u));o[i]=m*Math.cos(2*Math.PI*v);if(i+1<n)o[i+1]=m*Math.sin(2*Math.PI*v);}return o;},
  chol(hs,beta){const n=hs.length,L=Array.from({length:n},()=>new Float64Array(n));
    for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=Math.pow(Math.min(hs[i],hs[j])/Math.max(hs[i],hs[j]),beta)+(i===j?1e-9:0);
      for(let k=0;k<j;k++)s-=L[i][k]*L[j][k];L[i][j]=i===j?Math.sqrt(Math.max(s,1e-12)):s/L[j][j];}return L;},
  zmap(z,q,ZL){const n=ZL.length;if(z<=ZL[0])return q[0]+(z-ZL[0])*(q[1]-q[0])/(ZL[1]-ZL[0]);
    if(z>=ZL[n-1])return q[n-1]+(z-ZL[n-1])*(q[n-1]-q[n-2])/(ZL[n-1]-ZL[n-2]);
    let k=1;while(ZL[k]<z)k++;const w=(z-ZL[k-1])/(ZL[k]-ZL[k-1]);return q[k-1]+w*(q[k]-q[k-1]);},
  // legs: [{p0, q:[[7 EUR quantiles] per h]}] on the same horizons hs. Returns paths (N x H) of the summed EUR price.
  sample(legs,hs,ZL,beta,rho,N=1500,seed=1){
    const r=TRAJ.rng(seed),L=TRAJ.chol(hs,beta),H=hs.length,out=[];
    const lq=legs.map(l=>l.q.map(row=>row.map(v=>Math.log(v/l.p0))));
    for(let s=0;s<N;s++){const path=new Float64Array(H);let zprev=null;
      for(let li=0;li<legs.length;li++){const e=TRAJ.normals(r,H),z=new Float64Array(H);
        for(let i=0;i<H;i++){let a=0;for(let k=0;k<=i;k++)a+=L[i][k]*e[k];z[i]=a;}
        if(zprev&&rho)for(let i=0;i<H;i++)z[i]=rho*zprev[i]+Math.sqrt(1-rho*rho)*z[i];
        for(let i=0;i<H;i++)path[i]+=legs[li].p0*Math.exp(TRAJ.zmap(z[i],lq[li][i],ZL));zprev=z;}
      out.push(path);}
    return out;},
  quantiles(paths,levels){const H=paths[0].length,N=paths.length,res=[];
    for(let i=0;i<H;i++){const col=paths.map(p=>p[i]).sort((a,b)=>a-b);res.push(levels.map(l=>col[Math.min(N-1,Math.max(0,Math.round(l*(N-1))))]));}return res;},
  lowest(p0,paths,dates){const N=paths.length,mins=[],arg=[];
    for(const p of paths){let m=Infinity,a=0;for(let i=0;i<p.length;i++)if(p[i]<m){m=p[i];a=i;}mins.push(m);arg.push(a);}
    const thr=Math.min(p0-3,0.97*p0),dip=mins.map(m=>m<=thr);const s=mins.slice().sort((a,b)=>a-b);
    const wk={};arg.forEach((a,i)=>{if(dip[i]){const w=TRAJ.weekStart(dates[a]);wk[w]=(wk[w]||0)+1;}});
    const best=Object.entries(wk).sort((a,b)=>b[1]-a[1])[0];
    return {low_med:s[Math.floor(N/2)],low_p10:s[Math.floor(N*0.1)],low_p90:s[Math.floor(N*0.9)],p_cheaper:dip.filter(Boolean).length/N,dip_week:best?best[0]:null};},
  weekStart(d){const t=new Date(d+'T00:00:00Z');const k=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-k);return t.toISOString().slice(0,10);},
  verdict(p0,st,q50){const pc=+st.p_cheaper.toFixed(2),low=st.low_med,up14=q50.length?q50[Math.min(13,q50.length-1)]:p0,pct=x=>Math.round(x*100)+'%';
    if(pc>=0.6&&p0-low>=5)return['wait',`Worth waiting: ${pct(pc)} chance it dips to about €${Math.round(low)}`+(st.dip_week?`, most likely the week of ${(d=>d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()])(new Date(st.dip_week+'T00:00:00Z'))}.`:'.')];
    if(pc<0.3&&up14>=p0+3)return['buy',`Book now: a meaningful dip is unlikely (${pct(pc)}) and the fare is expected to rise.`];
    if(pc<0.3)return['buy',`Book when ready: only a ${pct(pc)} chance of a lower price before departure.`];
    return['hold',`No clear edge: ${pct(pc)} chance of a dip below €${Math.round(p0-3)}; expected low about €${Math.round(low)}.`];}
};
if(typeof module!=='undefined')module.exports={TRAJ};
