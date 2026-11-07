// Render timers may be throttled or suspended. Preserve elapsed simulation time
// and replay the same 100 ms steps as foreground combat, never a reward estimate.
export class BattleClock {
 constructor(now=Date.now()){this.last=now;this.pending=0;this.enabled=false;this.speed=1;}
 sync(now,{enabled,speed}){
  const elapsed=Math.max(0,now-this.last);
  if(this.enabled)this.pending+=elapsed*this.speed;
  this.last=Math.max(this.last,now);this.enabled=enabled;this.speed=speed;
 }
 get steps(){return Math.floor((this.pending+1e-7)/100);}
 drain(tick,limit=250){
  let count=0;
  while(this.steps>0&&count<limit){
   this.pending=Math.max(0,this.pending-100);count++;
   if(tick(.1,this.last-this.pending/this.speed)===false){this.pending=0;break;}
  }
  return count;
 }
 reset(now=Date.now()){this.last=now;this.pending=0;this.enabled=false;}
}
