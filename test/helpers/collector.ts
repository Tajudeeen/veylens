import {handleApi as productionApi,type CollectorEnv} from '../../src/server/api.js';
/** Transport tests bypass only the separately tested production budget guard. */
export const handleApi=(request:Request,env:CollectorEnv,transport:typeof fetch=fetch)=>productionApi(request,env,transport,async()=>null);
