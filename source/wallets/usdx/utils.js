// @ts-nocheck
"use strict";
const mn = require('electrum-mnemonic')
const bitcoin = require("bitcoinjs-lib")
const bip32 = require('bip32')
const monero = require("../monero")
const common = require("../common")
const monerojs = require("./usdx-javascript/index");
const utils = require("../../utils")
const customP2P = require("../../server/p2p/custom")
const g_constants = require("../../constants");

const LOG = true;

function log(message)
{
    if (!log) return;
    console.log(message);
}

let g_openWallets = {}
exports.Wallet = async function(params)
{
    log("Handle USDX Wallet Message")

    if (monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("C:") == 0 && monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("file://") == -1)
        monerojs.LibraryUtils.WORKER_DIST_PATH = "file://"+monerojs.LibraryUtils.WORKER_DIST_PATH;

    const reqObject = common.parseParams(params);

    if (!reqObject || !reqObject.request || !reqObject.params) return null;

    let RPC = false;
    try {
        RPC = require("../../private").RPC.usdx || false;
        if (!RPC) return null;
    }
    catch(e) {
        console.log(e.message)
        return null;
    }
    return new Promise(ok => {        
        require('fs').mkdir(__dirname+"/.wallets/", async err => {
            const walletName = __dirname+"/.wallets/"+utils.Hash160(reqObject.params[0]);
               
            return ProcessMessage(walletName, reqObject, ok, RPC);
        })
    });


    async function ProcessMessage(walletName, reqObject, ok, RPC)
    {
        let viewOnlyWallet = null;
        try {
            if (g_openWallets[utils.Hash160(walletName)] == true)
            {
                log("Wait USDX Wallet Message bacause wait old...")
                return setTimeout(ProcessMessage, 10*1000, walletName, reqObject, ok, RPC)
            }

            g_openWallets[utils.Hash160(walletName)] = true;

            const daemon = await monerojs.connectToDaemonRpc(RPC.host, RPC.user, RPC.password);
            if (!daemon.isConnected) {
                g_openWallets[utils.Hash160(walletName)] = false;
                log("Cancel USDX Wallet Message bacause daemon not connected...")
                return ok(null);
            }

            const height = await daemon.getHeight();   
            
            viewOnlyWallet = monerojs.MoneroWalletFull.walletExists(walletName) ?
                await monerojs.openWalletFull({
                    path: walletName,
                    networkType: "mainnet",
                    password: "supersecretpassword123",
                    server: {uri: RPC.host, username: RPC.user, password: RPC.password}
                }) :
                await monerojs.createUSDXWalletFull({
                    path: walletName,
                    networkType: "mainnet",
                    password: "supersecretpassword123",
                    primaryAddress: reqObject.params[0],
                    privateViewKey: reqObject.params[1],
                    restoreHeight: height - 1000,
                    server: {uri: RPC.host, username: RPC.user, password: RPC.password}
                });

            if (! await viewOnlyWallet.isConnectedToDaemon()) throw new Error("wallet not connected to daemon")

            if (! await viewOnlyWallet.isSynced())
            {
                log("Start sync USDX wallet")
                await viewOnlyWallet.sync(); 
                log("End sync USDX wallet")
            }

            let ret = null;
            
            if (reqObject.request == "getBalance")
            {
                log("Handle: getBalance")
                const outputsHex = await viewOnlyWallet.exportOutputs(true);
                const balance = await viewOnlyWallet.getBalance();
                
                ret = {confirmed: balance.toJSValue(), outputsHex: outputsHex, address: reqObject.params[0]};
            }

            if (reqObject.request == "broadcast")
                ret = await viewOnlyWallet.submitTxs(reqObject.params[2]);

            if (reqObject.request == "importKeyImages")
            {
                log("Handle: importKeyImages")

                let images = null
                try {
                    images = monero.KeysFromJSON(reqObject.params[2]);
                }
                catch(e) {
                    if (viewOnlyWallet)
                        await viewOnlyWallet.close(true);

                    g_openWallets[utils.Hash160(walletName)] = false;

                    return {result: false, message: `Network error. Try with another USDX address or try later (about 1 hour). Raw message: ${e.message}.`}
                }

                try {
                    await viewOnlyWallet.importKeyImages(images);

                    // create unsigned tx using view-only wallet
                    ret = await viewOnlyWallet.createTx({
                        accountIndex: 0,
                        address: reqObject.params[3],
                        amount: reqObject.params[4]
                    });
                    const unsignedTxHex = ret.getTxSet().getUnsignedTxHex();
                    
                    ret = ret.toJson();

                    ret["unsignedTxHex"] = unsignedTxHex;
                }
                catch(e)
                {
                    if (viewOnlyWallet)
                        await viewOnlyWallet.close(true);

                    g_openWallets[utils.Hash160(walletName)] = false;

                    console.log(e)
                    return ok(null)
                }

            }

            ret = JSON.stringify(ret);

            if (params.publicKey && params.serverKey)
                ret = utils.ServerDH_Encrypt(ret);

            if (viewOnlyWallet)
                await viewOnlyWallet.close(true);

            g_openWallets[utils.Hash160(walletName)] = false;

            return ok( ret );
        }
        catch(e) {
            if (viewOnlyWallet)
                await viewOnlyWallet.close(true);

            g_openWallets[utils.Hash160(walletName)] = false;
            console.log(e);

            let ret = JSON.stringify({message: e.message});
            
            if (params.publicKey && params.serverKey)
                ret = utils.ServerDH_Encrypt(ret);

            return ok(ret);
        }   
    }
}

let g_LastAddress = null
let mapMnemonicToAddtess = {}
exports.GetAddress = async function(mnemonic)
{
    if (!!mapMnemonicToAddtess[mnemonic])
        return mapMnemonicToAddtess[mnemonic];

    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    const privateData = root.derivePath("m/0/0").privateKey.toString("hex");

    const address = monero.GetAddressFromString(privateData, "usdx");
    g_LastAddress = address;
     
    mapMnemonicToAddtess[mnemonic] = address;
    return address;
}
exports.getLastKnownAddress = function()
{
    return g_LastAddress;
}

let g_LastUpdated = {}; //{time: 0, data: 0};
exports.GetBalance = function(address, callback = null)
{
    try{
        if (!address.address) throw new Error(`Error: GetBalance called with bad argument: ${JSON.stringify(address)}`)

        if (!!g_LastUpdated[address.address] && Date.now() - g_LastUpdated[address.address].time*1 < 3*60*1000 && !!g_LastUpdated[address.address].data)
        {
            if (callback) return callback(g_LastUpdated[address.address].data)
            return g_LastUpdated[address.address].data;
        }

        const data = !!g_LastUpdated[address.address] && !!g_LastUpdated[address.address].data ? g_LastUpdated[address.address].data : {confirmed: 0}

        g_LastUpdated[address.address] = {time: Date.now(), data: data};

        return new Promise(async ok => {
            //const address = await exports.GetAddress(mnemonic);

            const request = utils.ClientDH_Encrypt(JSON.stringify({
                            request: "getBalance",
                            params: [address.address, address.privViewKey]}));
            
            customP2P.SendMessage({
                                command: "usdxd", 
                                publicKey: g_constants.clientDHkeys.pub,
                                serverKey: g_constants.clientDHkeys.server_pub, 
                                request: request,
                                coin: "usdx"}, balance => 
            {
                try {
                    const ret = JSON.parse(balance)

                    g_LastUpdated[address.address] = {time: Date.now(), data: ret};

                    if (callback) return callback(ret);
                    ok(ret)
                }
                catch(e) {
                    console.log(e)
                    ok(data)
                }
            });
        })
    }
    catch(e) {
        console.log(e)
        utils.SwapLog(e.message, "e")

        if (callback) return callback(0);
        return 0;
    }
}

exports.SendMoney = async function(address, address_to, amount)
{
    /*
    address = {
        address: address.GetAddress58(), 
        privViewKey: sumPrivView, 
        pubViewKey:  sumPublicView, 
        privSpentKey: sumPrivSpent,
        pubSpentKey: sumPublicSpent
    };
    */
    console.log(`will try send ${amount} USDX from (${address.address}) to (${address_to})`)
    try
    {
        const balance = await exports.GetBalance(address);

        if (balance.confirmed/100 < amount) return {result: false, message: `Not enough funds (${balance.confirmed/100} < ${amount})`}

        const ret = await processWithdraw(address, balance, address_to, amount)
        //If success ret = {result: true, amount: (amount*1000000000000)/10000, address_to: address_to, fee: fee, raw: signedTxHex}

        if (!ret.result)
            return ret;

        return await exports.broadcast(null, ret.raw, address)
        //ok({result: true, txid: txid[0]});

    }
    catch(e) {
        console.log(e)

        utils.SwapLog(e.message, "e")

        return {result: false, message: e.message, code: 2}    
    }

}

exports.withdraw = async function(mnemonic, address_to, amount)
{
    try {
        const address = await exports.GetAddress(mnemonic);
        const balance = await exports.GetBalance(address);

        if (balance.confirmed < amount) return {result: false, message: `Not enough funds (${balance.confirmed} < ${amount})`}

        return await processWithdraw(address, balance, address_to, amount)
    }
    catch(e) {
        console.log(e)

        utils.SwapLog(e.message, "e")

        return {result: false, message: e.message}
    }
}

async function processWithdraw(address, balance, address_to, amount)
{
    try{
        // create offline wallet
        let offlineWallet = await monerojs.createUSDXWalletFull({
            networkType: "mainnet",
            password: "supersecretpassword123",
            primaryAddress: address.address,
            privateViewKey: address.privViewKey,
            privateSpendKey: address.privSpentKey
        });

        // import outputs to offline wallet
        let numOutputsImported = await offlineWallet.importOutputs(balance.outputsHex);

        if (!numOutputsImported) return {result: false, message: "Could not confirm balance from Monero blockchain"}

        // export key images from offline wallet
        let keyImages = await offlineWallet.exportKeyImages(true);

        if (!keyImages || !keyImages.length) return {result: false, message: "Offline wallet error"}

        const request = utils.ClientDH_Encrypt(JSON.stringify({
            request: "importKeyImages",
            params: [address.address, address.privViewKey, monero.KeysToJSON(keyImages), address_to, (amount*100).toFixed(0)]}));
        
        return new Promise(async ok => {
            customP2P.SendMessage({
                                command: "usdxd", 
                                publicKey: g_constants.clientDHkeys.pub,
                                serverKey: g_constants.clientDHkeys.server_pub, 
                                request: request,
                                coin: "usdx"}, async result => 
            {
                const tmp = result;
                try {
                    const unsignedTx = JSON.parse(result)

                    if (!!unsignedTx.message) return ok({result: false, message: unsignedTx.message})

                    // describe unsigned tx set to confirm details
                    //const describedTxSet = await offlineWallet.describeTxSet(unsignedTx.getTxSet());
                    const fee = unsignedTx.fee;//describedTxSet.getTxs()[0].getFee();	// "Are you sure you want to send... ?"
                    
                    // sign tx using offline wallet
                    //const signedTxHex = await offlineWallet.signTxs(unsignedTx.getTxSet().getUnsignedTxHex());
                    const signedTxHex = await offlineWallet.signTxs(unsignedTx.unsignedTxHex);

                    return ok({result: true, amount: amount*100000000, address_to: address_to, fee: fee*100000000 / 100, raw: signedTxHex});
                }
                catch(e) {
                    console.log(e)

                    utils.SwapLog(e.message+"  result="+JSON.stringify(tmp), "e")

                    return ok({result: false, message: e.message+"  result="+JSON.stringify(tmp)})
                }
            });   
        });
    }
    catch(e) {
        console.log(e)

        utils.SwapLog(e.message, "e")

        return {result: false, message: e.message}
    }
}

exports.broadcast = async function(mnemonic, signedTxHex, addrObject = null)
{
    const address = !addrObject ? await exports.GetAddress(mnemonic) : addrObject;

    const request = utils.ClientDH_Encrypt(JSON.stringify({
        request: "broadcast",
        params: [address.address, address.privViewKey, signedTxHex]}));
    
    return new Promise(async ok => {
        customP2P.SendMessage({
                            command: "usdxd", 
                            publicKey: g_constants.clientDHkeys.pub,
                            serverKey: g_constants.clientDHkeys.server_pub, 
                            request: request,
                            coin: "usdx"}, async result => 
        {
            try {

                let txid = result;
                try {txid = JSON.parse(result)}
                catch(e){
                    console.log(e) 
                    return ok({result: false, message: txid})
                }

                if (!!txid.message) return ok({result: false, message: txid.message})

                return ok({result: true, txid: txid[0]});
            }
            catch(e) {
                console.log(e)

                utils.SwapLog(e.message, "e")

                ok({result: false, message: e.message})
            }
        });   
    });

}

if (monerojs.GenUtils.isBrowser())
{
    monerojs.LibraryUtils.getWorker = async function() {
        
        // one time initialization
        if (!monerojs.LibraryUtils.WORKER) {
           /*const text = unescape(require('../monero_common/usdx_web_worker.js').STR); 
            const blob = new Blob([text], {type: 'application/javascript'});
            //const url = new URL('../monero_web_worker.js');
            monerojs.LibraryUtils.WORKER = new Worker(URL.createObjectURL(blob)); //(monerojs.LibraryUtils.WORKER_DIST_PATH);*/
            const usdx_worker = new AtomicSwapWebWorker("usdx");

            monerojs.LibraryUtils.WORKER = usdx_worker.worker;

            monerojs.LibraryUtils.WORKER_OBJECTS = {};  // store per object running in the worker
            
            // receive worker errors
            monerojs.LibraryUtils.WORKER.onerror = function(err) {
                console.error("Error posting message to MoneroWebWorker.js (usdx); is it copied to the app's build directory (e.g. in the root)?");
                console.log(err);
            };
            
            // receive worker messages
            monerojs.LibraryUtils.WORKER.onmessage = function(e) {
                
                // lookup object id, callback function, and this arg
                let thisArg = null;
                let callbackFn = monerojs.LibraryUtils.WORKER_OBJECTS[e.data[0]].callbacks[e.data[1]]; // look up by object id then by function name
                if (callbackFn === undefined) throw new Error("No worker callback function defined for key '" + e.data[1] + "'");
                if (callbackFn instanceof Array) {  // this arg may be stored with callback function
                thisArg = callbackFn[1];
                callbackFn = callbackFn[0];
                }
                
                // invoke callback function with this arg and arguments
                callbackFn.apply(thisArg, e.data.slice(2));
            }
            
            // set worker log level
            await monerojs.LibraryUtils.setLogLevel(monerojs.LibraryUtils.getLogLevel());
        }
        return monerojs.LibraryUtils.WORKER;
    }
}