// Consume gestures only in the top dialog; never chain them to the game behind it.
export function installModalScrollGuard(root=document){
 function guard(event,dx,dy){const modal=root.querySelector('#modal-root .modal');if(!modal)return;let node=event.target instanceof Element?event.target:null;if(!modal.contains(node)){event.preventDefault();return;}
  while(node&&modal.contains(node)){const css=getComputedStyle(node);const y=/(auto|scroll)/.test(css.overflowY)&&node.scrollHeight>node.clientHeight+1&&((dy>0&&node.scrollTop+node.clientHeight<node.scrollHeight-1)||(dy<0&&node.scrollTop>0));const x=/(auto|scroll)/.test(css.overflowX)&&node.scrollWidth>node.clientWidth+1&&((dx>0&&node.scrollLeft+node.clientWidth<node.scrollWidth-1)||(dx<0&&node.scrollLeft>0));if(y||x)return;node=node.parentElement;}event.preventDefault();
 }
 root.addEventListener('wheel',e=>guard(e,e.deltaX,e.deltaY),{capture:true,passive:false});
 let touch=null;root.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 root.addEventListener('touchmove',e=>{if(!touch||e.touches.length!==1)return;const t=e.touches[0];guard(e,touch.x-t.clientX,touch.y-t.clientY);touch={x:t.clientX,y:t.clientY};},{capture:true,passive:false});
 root.addEventListener('touchend',()=>touch=null,{passive:true});
}
