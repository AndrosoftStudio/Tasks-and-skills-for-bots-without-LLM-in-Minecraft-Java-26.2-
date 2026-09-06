export interface BlockPos { x:number; y:number; z:number }
export type MiningProfile='FAST'|'NORMAL'|'SAFE'
export interface MiningBlock { name:string; type?:number; position:BlockPos; diggable?:boolean; canHarvest?:(itemType:number)=>boolean; harvestTools?:Record<string,unknown> }
export interface InventoryItem { name:string; type:number; count:number; metadata?:number }
export interface ItemEntity { id:number; name?:string; type?:string; position:BlockPos }
export interface MiningNavigationResult<T=unknown>{ ok:boolean; data?:T; error?:{code?:string;message?:string} }
export interface MiningNavigation {
  goToBlock(params:{position:BlockPos;range?:number;profile?:MiningProfile},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MiningNavigationResult>
  goToEntity?(params:{entityId:number;range?:number;profile?:MiningProfile},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MiningNavigationResult>
}
export interface MiningWorld {
  getBotPosition():BlockPos
  getBlock(position:BlockPos):MiningBlock|null
  findBlocks(names:string[],origin:BlockPos,maxDistance:number,count:number):MiningBlock[]
  canDig(block:MiningBlock):boolean
  getHeldItem():InventoryItem|null
  getInventory():InventoryItem[]
  equip(item:InventoryItem,destination:'hand'):Promise<void>
  lookAtBlock(block:MiningBlock):Promise<void>
  dig(block:MiningBlock,signal?:AbortSignal):Promise<void>
  getItemEntities(origin:BlockPos,maxDistance:number):ItemEntity[]
  inventoryCount(itemName?:string):number
  wait(ms:number,signal?:AbortSignal):Promise<void>
}
export interface MiningRunOptions { signal?:AbortSignal; timeoutMs?:number }
export interface FindBlockParams { names:string|string[]; origin?:BlockPos; maxDistance?:number; count?:number; reachableOnly?:boolean; profile?:MiningProfile }
export interface MineBlockParams { position:BlockPos; profile?:MiningProfile; range?:number; requireHarvestable?:boolean; collectDrops?:boolean; collectRadius?:number }
export interface MineNearestParams extends Omit<FindBlockParams,'count'> { requireHarvestable?:boolean; collectDrops?:boolean }
export interface MineVeinParams { position:BlockPos; blockNames?:string[]; maxBlocks?:number; maxRadius?:number; profile?:MiningProfile; requireHarvestable?:boolean; collectDrops?:boolean }
export interface CollectDropParams { origin?:BlockPos; maxDistance?:number; timeoutMs?:number }
export interface ToolDecision { item:InventoryItem|null; harvestable:boolean; reason:string }
export interface MinedBlockData { blockName:string; position:BlockPos; tool:string|null; collected:boolean }
export interface MineVeinData { blockName:string; requested:number; mined:MinedBlockData[]; skipped:BlockPos[] }
export type MiningErrorCode='BLOCK_NOT_FOUND'|'BLOCK_CHANGED'|'UNREACHABLE'|'NOT_DIGGABLE'|'NO_HARVEST_TOOL'|'DIG_FAILED'|'COLLECT_FAILED'|'ABORTED'|'TIMEOUT'
export interface MiningError { code:MiningErrorCode; message:string; cause?:unknown }
export interface MiningResult<T>{ ok:boolean; data?:T; error?:MiningError }
