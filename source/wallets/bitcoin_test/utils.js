"use strict";

const multicoin = require("multicoinjs-lib");
const bitcoin = require("bitcoinjs-lib")
const mn = require('electrum-mnemonic')
const bip32 = require('bip32')
const customP2P = require("../../server/p2p/custom")
const utils = require("../../utils")
const g_constants = require("../../constants")

exports.Electrum = function(params)
{
    if (typeof window !== 'undefined')  return;
    if (params.publicHash && params.publicHash != utils.Hash160(g_constants.SERVER_PRIVATE_KEY)) return;

    const request = params.publicHash ? utils.Decrypt(params.request, g_constants.SERVER_PRIVATE_KEY) : params.request;

    const ElectrumCli = require('electrum-client')

    return new Promise(async ok => {
        const ecl = new ElectrumCli(60002, 'electrum.blockstream.info', 'tls') // tcp or tls

        await ecl.connect()
        try{
            const reqObject = JSON.parse(request);
            const ret = await ecl.request(reqObject.request, reqObject.params);
            ok( ret ); // json-rpc(promise)
        }catch(e){
            console.error(e)
        }
        await ecl.close() // disconnect(promise)*/
    })
}

exports.GetBalance = async function(mnemonic, callback = null)
{
    return new Promise(ok => {
        const p2pkh = exports.GetAddress(mnemonic).p2pkh;

        const request = utils.Encrypt(JSON.stringify({
                        request: "blockchain.scripthash.get_balance",
                        params: [utils.Hash256("76a914"+p2pkh.hash.toString("hex") + "88ac", "hex", true)]
                    }), g_constants.SERVER_PRIVATE_KEY);
        
        return customP2P.SendMessage({
                                    command: "electrum", 
                                    publicHash: utils.Hash160(g_constants.SERVER_PRIVATE_KEY, ""),
                                    request: request,
                                    coin: "tbtc"}, balance => 
        {
            if (callback) return callback(balance);
            ok(balance)
        });
    })
}

exports.GetAddress = function(mnemonic)
{
    const seed = mn.mnemonicToSeedSync(mnemonic, { prefix: mn.PREFIXES.standard });
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    let p2pkh = bitcoin.payments.p2pkh({ pubkey: root.derivePath("m/0/0").publicKey, network: bitcoin.networks.testnet });
    
    return {p2pkh: p2pkh, privateKey: root.derivePath("m/0/0").privateKey};    
}

exports.withdraw = function(mnemonic, address_to, amount)
{
    const fee = 0.00001*100000000;
    
    return new Promise(async ok => {
        const address = exports.GetAddress(mnemonic);
        const ecPair = multicoin.ECPair.fromPrivateKey(address.privateKey, { network: bitcoin.networks.testnet })

        if (!ecPair)
            return ok(-2);

        const request = utils.Encrypt(JSON.stringify({
            request: "blockchain.scripthash.listunspent", 
            params: [utils.Hash256("76a914"+address.p2pkh.hash.toString("hex") + "88ac", "hex", true)]
        }), g_constants.SERVER_PRIVATE_KEY);

        customP2P.SendMessage({
                command: "electrum", 
                publicHash: utils.Hash160(g_constants.SERVER_PRIVATE_KEY, ""),
                request: request,
                coin: "tbtc"}, list => 
        {    
            const txb = new multicoin.TransactionBuilder(bitcoin.networks.testnet) 
            txb.setVersion(1)
            
            let sum = 0;
            let needToSign = 0;
            for (let i=0; i<list.length; i++)
            {
                txb.addInput(Buffer.from(list[i].tx_hash, "hex").reverse(), list[i].tx_pos);
                sum += list[i].value;

                needToSign++;

                if (sum > amount*100000000)
                    break;
            }
            
            const change = sum - amount*100000000 - fee;

            if (change < 0)
                return ok(-1);

            txb.addOutput(address_to, (amount*100000000).toFixed(0)*1);
            txb.addOutput(address.p2pkh.address, change.toFixed(0)*1);

            for (let i=0; i<needToSign; i++)
                txb.sign(i, ecPair)


            const ret = txb.build().toHex();

            ok({
                raw: ret, 
                amount: (amount*100000000).toFixed(0)*1, 
                address_to: address_to, 
                change: change.toFixed(0)*1,
                change_address: address.p2pkh.address,
                fee: fee.toFixed(0)*1
            })
        })
    })
}

exports.broadcast = function(rawTX)
{
    const request = JSON.stringify({
        request: "blockchain.transaction.broadcast", 
        params: [rawTX]
    });

    return new Promise(ok => {
            customP2P.SendMessage({
                command: "electrum", 
                request: request,
                coin: "tbtc"}, ret => 
        {    
            ok(ret);
        })
    })
}
