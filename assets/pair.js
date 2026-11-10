// Pure return-pair logic for the Explorer's Return mode (unit-tested with node: tests/test_pair.js).
// SunExpress prices each leg separately, so a return = outbound one-way fare + inbound one-way fare.
const PAIR = {
  day(s){return Date.parse(s+'T00:00:00Z')/864e5;},
  nights(a,b){return PAIR.day(b.dep_date)-PAIR.day(a.dep_date);},
  // Pair verdict rule (kept in step with the Trip optimizer):
  //  1. either leg has no fare        -> "No fare"
  //  2. either leg needs a check      -> "Check"
  //  3. either leg says "Buy now"     -> "Buy now"  (one rising leg is enough to lose money by waiting)
  //  4. both legs say "Wait"          -> "Wait"     (only wait when waiting is expected to help on both)
  //  5. otherwise                     -> "No rush"
  verdict(a,b){
    const v=[a.verdict,b.verdict];
    if(a.price==null||b.price==null||v.includes('No fare'))return 'No fare';
    if(v.includes('Check'))return 'Check';
    if(v.includes('Buy now'))return 'Buy now';
    if(v[0]==='Wait'&&v[1]==='Wait')return 'Wait';
    return 'No rush';
  },
  // P(at least one leg rises >=3%/EUR3 within 7 days), legs treated as independent.
  risk(a,b){if(a.p_rise==null&&b.p_rise==null)return null;return 1-(1-(a.p_rise||0))*(1-(b.p_rise||0));},
  // 7-day band of the total: sum of the leg q10s / q90s (a conservative, slightly wide band).
  band(a,b){if(a.price==null||b.price==null)return null;return [(a.q10??a.price)+(b.q10??b.price),(a.q50??a.price)+(b.q50??b.price),(a.q90??a.price)+(b.q90??b.price)];},
  summary(a,b){
    const total=(a.price!=null&&b.price!=null)?a.price+b.price:null;
    return {out:a,back:b,nights:PAIR.nights(a,b),total,risk:PAIR.risk(a,b),band:PAIR.band(a,b),verdict:PAIR.verdict(a,b)};
  },
  // History of the pair: for each observation date where BOTH legs have a price, the sum.
  // ha / hb are arrays of [date, price, src] as stored in data/history/<route>.json.
  history(ha,hb){
    const mb=new Map((hb||[]).map(p=>[p[0],p[1]]));
    return (ha||[]).filter(p=>p[1]!=null&&mb.get(p[0])!=null).map(p=>[p[0],p[1]+mb.get(p[0]),p[1],mb.get(p[0])]);
  },
  // Outbound legs CDG->dest and inbound legs dest->CDG for one destination.
  legs(deps,dest){
    const outs=deps.filter(d=>d.dir==='out'&&d.dest===dest).sort((x,y)=>x.dep_date<y.dep_date?-1:1);
    const backs=deps.filter(d=>d.dir==='back'&&d.origin===dest).sort((x,y)=>x.dep_date<y.dep_date?-1:1);
    return {outs,backs};
  },
  // Inbound legs that can follow a given outbound (strictly later date).
  returnsAfter(backs,out){return backs.filter(b=>b.dep_date>out.dep_date);},
  // Cheapest priced pairs whose trip length is within [minN,maxN] nights; optional outbound month 'YYYY-MM'.
  cheapest(deps,dest,o){
    const {outs,backs}=PAIR.legs(deps,dest);const minN=o.minN??3,maxN=o.maxN??14;const res=[];
    for(const a of outs){if(a.price==null||(o.month&&!a.dep_date.startsWith(o.month)))continue;
      for(const b of backs){if(b.price==null)continue;const n=PAIR.nights(a,b);if(n<minN||n>maxN)continue;res.push(PAIR.summary(a,b));}}
    res.sort((x,y)=>x.total-y.total||x.risk-y.risk||(x.out.dep_date<y.out.dep_date?-1:1));
    return res;
  }
};
if(typeof module!=='undefined')module.exports={PAIR};
