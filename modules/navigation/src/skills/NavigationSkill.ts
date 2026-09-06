export interface NavigationSkill<TParams,TData>{ readonly name:string;readonly defaultTimeoutMs:number;execute(params:TParams,signal?:AbortSignal):Promise<TData> }
