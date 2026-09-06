import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import type { BlockPos, InventoryItem, ItemEntity, MiningBlock, MiningWorld } from './types.js'
const v=(p:BlockPos)=>new Vec3(p.x,p.y,p.z)
const blockShape=(b:any):MiningBlock=>({name:b.name,type:b.type,position:{x:b.position.x,y:b.position.y,z:b.position.z},diggable:b.diggable,canHarvest:typeof b.canHarvest==='function'?(id:number)=>b.canHarvest(id):undefined,harvestTools:b.harvestTools})
export class MineflayerMiningWorld implements MiningWorld {
  constructor(private readonly bot:Bot){}
  getBotPosition(){const p=this.bot.entity.position;return{x:p.x,y:p.y,z:p.z}}
  getBlock(position:BlockPos){const b=this.bot.blockAt(v(position));return b?blockShape(b):null}
  findBlocks(names:string[],origin:BlockPos,maxDistance:number,count:number){const ids=new Set<number>();for(const n of names){const id=(this.bot.registry.blocksByName as any)[n]?.id;if(typeof id==='number')ids.add(id)}if(!ids.size)return[];const positions=this.bot.findBlocks({matching:[...ids],point:v(origin),maxDistance,count});return positions.map(p=>this.bot.blockAt(p)).filter(Boolean).map(blockShape)}
  canDig(block:MiningBlock){const b=this.bot.blockAt(v(block.position));return !!b&&this.bot.canDigBlock(b)}
  getHeldItem(){const i=this.bot.heldItem;return i?{name:i.name,type:i.type,count:i.count,metadata:i.metadata}:null}
  getInventory(){return this.bot.inventory.items().map(i=>({name:i.name,type:i.type,count:i.count,metadata:i.metadata}))}
  async equip(item:InventoryItem,destination:'hand'){const actual=this.bot.inventory.items().find(i=>i.type===item.type);if(!actual)throw new Error(`inventory item ${item.name} disappeared`);await this.bot.equip(actual,destination)}
  async lookAtBlock(block:MiningBlock){await this.bot.lookAt(v(block.position).offset(0.5,0.5,0.5),true)}
  async dig(block:MiningBlock,signal?:AbortSignal){if(signal?.aborted)throw Object.assign(new Error('aborted'),{code:'ABORTED'});const b=this.bot.blockAt(v(block.position));if(!b)throw new Error('block disappeared before dig');await this.bot.dig(b)}
  getItemEntities(origin:BlockPos,maxDistance:number){return Object.values(this.bot.entities).filter((e:any)=>e&&e.position&&((e.name==='item')||(e.type==='object'&&e.objectType==='Item'))&&e.position.distanceTo(v(origin))<=maxDistance).map((e:any):ItemEntity=>({id:e.id,name:e.name,type:e.type,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}
  inventoryCount(itemName?:string){return this.bot.inventory.items().filter(i=>!itemName||i.name===itemName).reduce((n,i)=>n+i.count,0)}
  wait(ms:number,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{if(signal?.aborted)return reject(Object.assign(new Error('aborted'),{code:'ABORTED'}));const abort=()=>{clearTimeout(timer);cleanup();reject(Object.assign(new Error('aborted'),{code:'ABORTED'}))};const cleanup=()=>signal?.removeEventListener('abort',abort);const timer=setTimeout(()=>{cleanup();resolve()},ms);signal?.addEventListener('abort',abort,{once:true})})}
}
