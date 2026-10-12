import {loadInput} from './app.js';
import {LEAK_FLOW,CLEAN_FLOW} from './samples.js';
import {PROVIDER_SAMPLE} from './providerSample.js';
import {ZCASH_SAMPLE} from './zcashSample.js';
if(typeof document!=='undefined' && document.getElementById('flow-input')){
 const bind=(id:string,raw:unknown,run=false):void=>{document.getElementById(id)?.addEventListener('click',()=>loadInput(raw,run));};
 bind('load-leak',LEAK_FLOW);bind('load-clean',CLEAN_FLOW);bind('hero-load-case',LEAK_FLOW,true);
 bind('load-provider',PROVIDER_SAMPLE);bind('load-zcash',ZCASH_SAMPLE);
 bind('load-reuse-config',{format:'veylens-evidence/1',provider:PROVIDER_SAMPLE,context:{shieldingSourceAddresses:[PROVIDER_SAMPLE.quoteRequest.refundTo]}});
 bind('load-safer-config',{...PROVIDER_SAMPLE,signature:'',quoteRequest:{...PROVIDER_SAMPLE.quoteRequest,refundType:'INTENTS',refundTo:'illustrative-intents-account.near'}});
 const preset=new URLSearchParams(window.location.search).get('example');
 if(preset==='leak'||preset==='clean')loadInput(preset==='leak'?LEAK_FLOW:CLEAN_FLOW);
}
