// Pure trip-pairing logic (also unit-tested with node: tests/test_trip.js)
function rankTrips(deps, o){
  const outs=deps.filter(d=>d.dir==='out'&&d.price!=null&&(!o.dest||d.dest===o.dest)&&d.dep_date>=o.outFrom&&d.dep_date<=o.outTo);
  const backs=deps.filter(d=>d.dir==='back'&&d.price!=null&&(!o.dest||d.origin===o.dest)&&d.dep_date>=o.backFrom&&d.dep_date<=o.backTo);
  const day=s=>Date.parse(s+'T00:00:00Z')/864e5;
  const res=[];
  for(const a of outs)for(const b of backs){
    if(a.dest!==b.origin)continue;
    const nights=day(b.dep_date)-day(a.dep_date);
    if(nights<(o.minN??1)||nights>(o.maxN??60))continue;
    const risk=1-(1-(a.p_rise||0))*(1-(b.p_rise||0));
    const verdict=(a.verdict==='Buy now'||b.verdict==='Buy now')?'Buy now':(a.verdict==='Wait'&&b.verdict==='Wait')?'Wait':'No rush';
    res.push({out:a,back:b,nights,total:a.price+b.price,risk,verdict,
      band:[(a.q10??a.price)+(b.q10??b.price),(a.q90??a.price)+(b.q90??b.price)]});
  }
  res.sort((x,y)=>x.total-y.total||x.risk-y.risk);
  return res;
}
if(typeof module!=='undefined')module.exports={rankTrips};
