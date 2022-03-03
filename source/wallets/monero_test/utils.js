"use strict";
const mn = require('electrum-mnemonic')
const bitcoin = require("bitcoinjs-lib")
const bip32 = require('bip32')
const monero = require("../monero")
const common = require("../common")
const monerojs = require("monero-javascript");
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
    log("Handle Monero Wallet Message")

    if (monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("C:") == 0 && monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("file://") == -1)
        monerojs.LibraryUtils.WORKER_DIST_PATH = "file://"+monerojs.LibraryUtils.WORKER_DIST_PATH;

    const reqObject = common.parseParams(params);

    if (!reqObject || !reqObject.request || !reqObject.params) return null;

    return new Promise(ok => {        
        require('fs').mkdir(__dirname+"/wallets/", async err => {
            const walletName = __dirname+"/wallets/"+utils.Hash160(reqObject.params[0]);

            return ProcessMessage(walletName, reqObject, ok);
        })
    });

    async function _getBalance(params, viewOnlyWallet)
    {
        const outputsHex = await viewOnlyWallet.exportOutputs(true);
        const balance = await viewOnlyWallet.getBalance();
          
        if (params.publicKey && params.serverKey)
            return utils.ServerDH_Encrypt(JSON.stringify({confirmed: balance.toJSValue(), outputsHex: outputsHex}));
        else
            return JSON.stringify({confirmed: balance.toJSValue(), outputsHex: outputsHex}); 
    }

    async function ProcessMessage(walletName, reqObject, ok)
    {
        try {
            const RPC = require("../../private").RPC.txmr || false;
            if (!RPC) return ok(null);

            if (g_openWallets[utils.Hash160(walletName)] == true)
            {
                log("Wait Monero Wallet Message bacause wait old...")
                return setTimeout(ProcessMessage, 10*1000, walletName, reqObject, ok)
            }

            g_openWallets[utils.Hash160(walletName)] = true;

            const daemon = await monerojs.connectToDaemonRpc(RPC.host, RPC.user, RPC.password);
            if (!daemon.isConnected) {
                g_openWallets[utils.Hash160(walletName)] = false;
                log("Cancel Monero Wallet Message bacause daemon not connected...")
                return ok(null);
            }

            const height = await daemon.getHeight();   
            
            let viewOnlyWallet = await monerojs.MoneroWalletFull.walletExists(walletName) ?
                await monerojs.openWalletFull({
                    path: walletName,
                    networkType: "stagenet",
                    password: "supersecretpassword123",
                    server: {uri: RPC.host, username: RPC.user, password: RPC.password}
                }) :
                await monerojs.createWalletFull({
                    path: walletName,
                    networkType: "stagenet",
                    password: "supersecretpassword123",
                    primaryAddress: reqObject.params[0],
                    privateViewKey: reqObject.params[1],
                    restoreHeight: height - 1000,
                    server: {uri: RPC.host, username: RPC.user, password: RPC.password}
                });

            if (! await viewOnlyWallet.isConnectedToDaemon()) throw new Error("wallet not connected to daemon")

            if (! await viewOnlyWallet.isSynced())
            {
                log("Start sync Monero wallet")
                await viewOnlyWallet.sync(); 
                log("End sync Monero wallet")
            }

            let ret = null;
            
            if (reqObject.request == "getBalance")
            {
                log("Handle: getBalance")
                ret = await _getBalance(params, viewOnlyWallet);
            }

            if (reqObject.request == "importKeyImages")
            {
                log("Handle: importKeyImages")

                await viewOnlyWallet.importKeyImages(monero.KeysFromJSON(reqObject.params[2]));

                // create unsigned tx using view-only wallet
                ret = await viewOnlyWallet.createTx({
                    accountIndex: 0,
                    address: reqObject.params[3],
                    amount: reqObject.params[4]
                });
                ret = ret.toJson()

                log("importKeyImages ready. tx="+JSON.stringify(ret))
            }

            await viewOnlyWallet.close(true);

            g_openWallets[utils.Hash160(walletName)] = false;

            return ok( ret );
        }
        catch(e) {
            g_openWallets[utils.Hash160(walletName)] = false;
            console.log(e);
            return ok(null);
        }   
    }
}

exports.GetAddress = async function(mnemonic)
{
    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    const privateData = root.derivePath("m/0/0").privateKey.toString("hex");

    const address = await monero.GetAddressFromString(privateData);
     
    return address;
}

let g_LastUpdated = {time: 0, data: 0};
exports.GetBalance = function(mnemonic, callback = null)
{
    if (Date.now() - g_LastUpdated.time < 60*1000)
        return g_LastUpdated.data;

    g_LastUpdated.time = Date.now();

    return new Promise(async ok => {
        const address = await exports.GetAddress(mnemonic);

        const request = utils.ClientDH_Encrypt(JSON.stringify({
                        request: "getBalance",
                        params: [address.address, address.privViewKey]}));
        
        customP2P.SendMessage({
                            command: "monerod", 
                            publicKey: g_constants.clientDHkeys.pub,
                            serverKey: g_constants.clientDHkeys.server_pub, 
                            request: request,
                            coin: "txmr"}, balance => 
        {
            try {
                const ret = JSON.parse(balance)

                g_LastUpdated = {time: Date.now, data: ret};

                if (callback) return callback(ret);
                ok(ret)
            }
            catch(e) {
                console.log(e)
            }
        });
    })
}

exports.withdraw = async function(mnemonic, address_to, amount)
{
    try {
        const address = await exports.GetAddress(mnemonic);
        const balance = await exports.GetBalance(mnemonic);

        if (balance.confirmed < amount) return {result: false, message: `Not enough funds (${balance.confirmed} < ${amount})`}

        // create offline wallet
        let offlineWallet = await monerojs.createWalletFull({
            networkType: "stagenet",
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
            params: [address.address, address.privViewKey, monero.KeysToJSON(keyImages), address_to, (amount*1000000000000).toFixed(0)]}));
        
        return new Promise(async ok => {
            customP2P.SendMessage({
                                command: "monerod", 
                                publicKey: g_constants.clientDHkeys.pub,
                                serverKey: g_constants.clientDHkeys.server_pub, 
                                request: request,
                                coin: "txmr"}, async result => 
            {
                try {
                    const unsignedTx = JSON.parse(result)

                    // describe unsigned tx set to confirm details
                    const describedTxSet = await offlineWallet.describeTxSet(unsignedTx.getTxSet());
                    const fee = describedTxSet.getTxs()[0].getFee();	// "Are you sure you want to send... ?"
                    
                    // sign tx using offline wallet
                    const signedTxHex = await offlineWallet.signTxs(unsignedTx.getTxSet().getUnsignedTxHex());

                    return ok({result: true, fee: fee, signedTxHex: signedTxHex});
                }
                catch(e) {
                    console.log(e)
                    ok({result: false, message: e.message})
                }
            });   
        });
    }
    catch(e) {
        console.log(e)
        return {result: false, message: e.message}
    }
}

if (monerojs.GenUtils.isBrowser())
{
    monerojs.LibraryUtils.getWorker = async function() {
        
        // one time initialization
        if (!monerojs.LibraryUtils.WORKER) {
            const text = unescape(require('../monero_common/monero_web_worker_2.js').STR); 
            const blob = new Blob([text], {type: 'application/javascript'});
            //const url = new URL('../monero_web_worker.js');
            monerojs.LibraryUtils.WORKER = new Worker(URL.createObjectURL(blob)); //(monerojs.LibraryUtils.WORKER_DIST_PATH);

            monerojs.LibraryUtils.WORKER_OBJECTS = {};  // store per object running in the worker
            
            // receive worker errors
            monerojs.LibraryUtils.WORKER.onerror = function(err) {
                console.error("Error posting message to MoneroWebWorker.js; is it copied to the app's build directory (e.g. in the root)?");
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