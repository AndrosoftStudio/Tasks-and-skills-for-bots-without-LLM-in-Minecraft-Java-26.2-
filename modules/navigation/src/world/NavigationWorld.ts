import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'

export type WorldKnowledge='known'|'unknown'
export interface NavigationBlock{knowledge:WorldKnowledge;name:string;position:Vec3;shapes:number[][];boundingBox:string}
export type WorldInvalidation=
  | {type:'block';x:number;y:number;z:number}
  | {type:'chunk';x:number;z:number}
  | {type:'global'}
export interface NavigationWorld{getBlock(x:number,y:number,z:number):NavigationBlock;revision():number;onInvalidate?(listener:(event:WorldInvalidation)=>void):()=>void}

type LooseEmitter={on(event:string,listener:(...args:unknown[])=>void):void}

export class MineflayerNavigationWorld implements NavigationWorld{
  private rev=0
  private readonly listeners=new Set<(event:WorldInvalidation)=>void>()
  constructor(private readonly bot:Bot){
    const emitter=this.bot as unknown as LooseEmitter
    emitter.on('blockUpdate',(...args)=>{const p=this.extractPosition(args);this.bump(p?{type:'block',x:p.x,y:p.y,z:p.z}:{type:'global'})})
    emitter.on('chunkColumnLoad',(...args)=>{const p=this.extractPosition(args);this.bump(p?{type:'chunk',x:p.x,z:p.z}:{type:'global'})})
    emitter.on('chunkColumnUnload',(...args)=>{const p=this.extractPosition(args);this.bump(p?{type:'chunk',x:p.x,z:p.z}:{type:'global'})})
  }
  revision():number{return this.rev}
  onInvalidate(listener:(event:WorldInvalidation)=>void):()=>void{this.listeners.add(listener);return()=>this.listeners.delete(listener)}
  getBlock(x:number,y:number,z:number):NavigationBlock{const p=new Vec3(Math.floor(x),Math.floor(y),Math.floor(z));const block=this.bot.blockAt(p);if(!block)return{knowledge:'unknown',name:'unknown',position:p,shapes:[],boundingBox:'unknown'};return{knowledge:'known',name:block.name,position:block.position.clone(),shapes:Array.isArray(block.shapes)?block.shapes.map((s:number[])=>[...s]):[],boundingBox:String(block.boundingBox??'empty')}}
  private bump(event:WorldInvalidation):void{this.rev+=1;for(const listener of this.listeners)listener(event)}
  private extractPosition(args:unknown[]):{x:number;y:number;z:number}|undefined{for(const value of args){if(typeof value==='object'&&value!==null){const candidate=value as {position?:{x?:unknown;y?:unknown;z?:unknown};x?:unknown;y?:unknown;z?:unknown};const p=candidate.position??candidate;if(typeof p.x==='number'&&typeof p.z==='number')return{x:p.x,y:typeof p.y==='number'?p.y:0,z:p.z}}}if(typeof args[0]==='number'&&typeof args[1]==='number')return{x:args[0],y:0,z:args[1]};return undefined}
}

export class CachedNavigationWorld implements NavigationWorld{
  private readonly cache=new Map<string,NavigationBlock>()
  private readonly chunkIndex=new Map<string,Set<string>>()
  private observedRevision:number
  private readonly hasSpatialInvalidation:boolean
  constructor(private readonly inner:NavigationWorld,private readonly maxEntries=20_000){
    this.observedRevision=inner.revision()
    this.hasSpatialInvalidation=typeof inner.onInvalidate==='function'
    inner.onInvalidate?.(event=>this.applyInvalidation(event))
  }
  revision():number{return this.inner.revision()}
  onInvalidate(listener:(event:WorldInvalidation)=>void):()=>void{return this.inner.onInvalidate?.(listener)??(()=>{})}
  getBlock(x:number,y:number,z:number):NavigationBlock{
    const rev=this.inner.revision()
    if(!this.hasSpatialInvalidation&&rev!==this.observedRevision)this.clearAll()
    this.observedRevision=rev
    const bx=Math.floor(x),by=Math.floor(y),bz=Math.floor(z),key=this.blockKey(bx,by,bz)
    const cached=this.cache.get(key);if(cached)return cached
    const block=this.inner.getBlock(bx,by,bz);this.cache.set(key,block);this.indexKey(key,bx,bz)
    if(this.cache.size>this.maxEntries){const first=this.cache.keys().next().value as string|undefined;if(first)this.deleteKey(first)}
    return block
  }
  private applyInvalidation(event:WorldInvalidation):void{
    if(event.type==='global'){this.clearAll();return}
    if(event.type==='block'){this.invalidateBlockNeighborhood(event.x,event.y,event.z,1);return}
    this.invalidateChunkEvent(event.x,event.z)
  }
  private invalidateBlockNeighborhood(x:number,y:number,z:number,radius:number):void{for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)for(let dz=-radius;dz<=radius;dz++)this.deleteKey(this.blockKey(Math.floor(x)+dx,Math.floor(y)+dy,Math.floor(z)+dz))}
  private invalidateChunkEvent(x:number,z:number):void{const candidates=new Set([this.chunkKey(Math.floor(x),Math.floor(z)),this.chunkKey(Math.floor(x/16),Math.floor(z/16))]);for(const key of candidates)this.invalidateChunkKey(key)}
  private invalidateChunkKey(chunkKey:string):void{const keys=this.chunkIndex.get(chunkKey);if(!keys)return;for(const key of [...keys])this.deleteKey(key);this.chunkIndex.delete(chunkKey)}
  private indexKey(key:string,x:number,z:number):void{const chunk=this.chunkKey(Math.floor(x/16),Math.floor(z/16));let keys=this.chunkIndex.get(chunk);if(!keys){keys=new Set<string>();this.chunkIndex.set(chunk,keys)}keys.add(key)}
  private deleteKey(key:string):void{const block=this.cache.get(key);if(!block)return;this.cache.delete(key);const chunk=this.chunkKey(Math.floor(block.position.x/16),Math.floor(block.position.z/16));const keys=this.chunkIndex.get(chunk);keys?.delete(key);if(keys?.size===0)this.chunkIndex.delete(chunk)}
  private clearAll():void{this.cache.clear();this.chunkIndex.clear()}
  private blockKey(x:number,y:number,z:number):string{return`${x}|${y}|${z}`}
  private chunkKey(x:number,z:number):string{return`${x}|${z}`}
}
