// Furthest contact down a calf that fits a bent hook leg's reach budget.
// Work in world coordinates so rig proportions, depth and facing compose.
export function reachableCalfFraction(knee, ankle, hip, maxDistance, along, minAlong = 0, offset = {x:0,y:0}) {
    const vx=ankle.x-knee.x,vy=ankle.y-knee.y;
    const bx=knee.x+(offset.x??0)-hip.x,by=knee.y+(offset.y??0)-hip.y;
    if(Math.hypot(bx+vx*along,by+vy*along)<=maxDistance)return along;
    const a=vx*vx+vy*vy;
    if(a<1e-12)return minAlong;
    const dot=bx*vx+by*vy;
    const disc=dot*dot-a*(bx*bx+by*by-maxDistance*maxDistance);
    // If the whole calf lies outside the comfort radius, choose its closest
    // permitted point. The leg solver still enforces actual segment lengths.
    const t=disc>=0?(-dot+Math.sqrt(disc))/a:-dot/a;
    return Math.max(minAlong,Math.min(along,t));
}
