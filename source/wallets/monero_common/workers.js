'use strict';

//const text_monero = unescape(require('./usdx_web_worker.js').STR); 
//const text_monero_main = unescape(require('./usdx_web_worker.js').STR); 
const text_usdx = unescape(require('./usdx_web_worker.js').STR); 

global.AtomicSwapWebWorker = function CreateWebWorker(name)
{
    this.worker = null;
    /*if (name == "monero")
    {
        const blob_monero = new Blob([text_monero], {type: 'application/javascript'});
        this.worker = new Worker(URL.createObjectURL(blob_monero));
    }
    if (name == "monero_main")
    {
        const blob_monero = new Blob([text_monero_main], {type: 'application/javascript'});
        this.worker = new Worker(URL.createObjectURL(blob_monero));
    }
 
    if (name == "usdx")
    {*/
        const blob_usdx = new Blob([text_usdx], {type: 'application/javascript'});
        this.worker = new Worker(URL.createObjectURL(blob_usdx));  
    //}
    
    return this;
}
