import { Vec3 } from 'vec3'
import type { NavigationGoal,NavigationNode } from '../types/navigation.js'
export const distance3D=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number}):number=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
export const horizontalDistance=(a:{x:number;z:number},b:{x:number;z:number}):number=>Math.hypot(a.x-b.x,a.z-b.z)
export const nodeKey=(n:NavigationNode):string=>`${n.x}|${n.y.toFixed(3)}|${n.z}|${n.mode}`
export const nodePosition=(n:NavigationNode):Vec3=>new Vec3(n.x+0.5,n.y,n.z+0.5)
export const goalSatisfied=(n:NavigationNode,g:NavigationGoal):boolean=>Math.hypot(n.x+0.5-g.position.x,n.z+0.5-g.position.z)<=(g.tolerance??0.75)&&Math.abs(n.y-g.position.y)<=(g.verticalTolerance??1)
export const octile3DHeuristic=(n:NavigationNode,g:NavigationGoal):number=>{const dx=Math.abs(n.x+0.5-g.position.x),dz=Math.abs(n.z+0.5-g.position.z),dy=Math.abs(n.y-g.position.y),d=Math.min(dx,dz),s=Math.max(dx,dz)-d;return d*Math.SQRT2+s+dy*1.15}
export const asGoal=(t:Vec3|NavigationGoal,tolerance=0.75):NavigationGoal=>'position'in t?t:{position:t,tolerance}
export const clamp=(v:number,min:number,max:number):number=>Math.max(min,Math.min(max,v))
