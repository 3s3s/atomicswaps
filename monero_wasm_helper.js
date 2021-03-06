const fs = require('fs')

const worker = kzv_fetch.toString() +("\r\n"+ fs.readFileSync('./node_modules/monero-javascript/dist/monero_web_worker.js')).replace(/\:fetch\(/g, `:kzv_fetch(`)+"\r\n\r\n\r\n"
const monero_wallet_full_wasm = "const STR = '" + fs.readFileSync('./node_modules//monero-javascript/dist/monero_wallet_full.wasm').toString("hex")+"'"

fs.writeFile("./source/wallets/monero_common/monero_web_worker_2.js", "exports.STR= '"+escape(worker+monero_wallet_full_wasm)+"'", ret => {
    if (ret) console.log(ret)
    else console.log("Success: monero_common/monero_web_worker_2.js compiled")
})

const worker_usdx = kzv_fetch.toString() +("\r\n"+ fs.readFileSync('./source/wallets/usdx/usdx-javascript/dist/monero_web_worker.js')).replace(/\:fetch\(/g, `:kzv_fetch(`)+"\r\n\r\n\r\n"
const usdx_wallet_full_wasm = "const STR = '" + fs.readFileSync('./source/wallets/usdx/usdx-javascript/dist/monero_wallet_full.wasm').toString("hex")+"'"

fs.writeFile("./source/wallets/monero_common/usdx_web_worker.js", "exports.STR = '"+escape(worker_usdx+usdx_wallet_full_wasm)+"'", ret => {
    if (ret) console.log(ret)
    else console.log("Success: monero_common/usdx_web_worker.js compiled")
})

function kzv_fetch(url, opt)
{
    if (url.indexOf("monero_wallet_full.wasm") == -1)
        return fetch(url, opt);

    const byteArray = new Uint8Array(STR.match(/.{2}/g).map(e => parseInt(e, 16)));

    const blob = new Blob([byteArray], {type: 'application/wasm'});
    return fetch(URL.createObjectURL(blob))
}
