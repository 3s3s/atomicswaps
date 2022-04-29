"use strict";
const utils = require("../utils")
const g_constants = require("../constants")
const customP2P = require("../server/p2p/custom")
const tbtc_utils = require("../wallets/bitcoin_test/utils")
const txmr_utils = require("../wallets/monero_test/utils")

const bip68 = require('bip68');
const bitcoin = require("bitcoinjs-lib")
const BN = require('bn.js');
const EC = require('elliptic').ec
const EdDSA = require('elliptic').eddsa;
const multicoin = require("multicoinjs-lib");

const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

exports.NETWORK = {
    "tbtc": bitcoin.networks.testnet,
    "btc": bitcoin.networks.bitcoin
}

exports.getFee = function(network)
{
    if (network == bitcoin.networks.testnet) return 0.0001*100000000;
    if (network == bitcoin.networks.bitcoin) return 0.00001*100000000;

    return 0.0001*100000000;
}

exports.CreateFullSignature = function(hash256_hex, privateKey)
{
        /////////////////////////////ECDSA signature s_a = (H + (rG)_x a) r^-1///////////////////////////////////////////////
        const H = new BN(hash256_hex, "hex")
        //const a = this.#KeyPairXMR_spent.getPrivateKey()
        const a = new BN(privateKey, "hex");
        const r = secp256k1.genKeyPair().getPrivate()

        const rG_x = secp256k1.curve.g.mul(r).getX();

        const s_a = (rG_x.umod(secp256k1.curve.n).mul(a).add(H)).mul(r.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
        
        ////////////////////////////signature: sig_a = ( (rG)_x, s_a ) /////////////////////////////////////////////////////////////////////
        const sig_a = Buffer.alloc(64);
        rG_x.toArrayLike(Buffer).copy(sig_a)
        s_a.toArrayLike(Buffer).copy(sig_a, 32)
    
        ////////////////////////////check signature here///////////////////////////////////////////////////////////////////////////
        const pairX = multicoin.ECPair.fromPrivateKey(a.toArrayLike(Buffer), { network: bitcoin.networks.testnet })
        //const pairX = secp256k1.fromPrivateKey(Buffer.from(a, "hex"));
        const s_a_check = pairX.verify(H.toArrayLike(Buffer), sig_a)

        if (s_a_check != true) throw new Error("getSignature failed")

        return sig_a.toString("hex")
}

exports.CreateAtaptorSignature = function(hash256_hex, privateKey, T_point)
{
    /////////////////////////////ADAPTOR SIGNATURE s_adaptor = (H + (r(tG))_x a) r^-1 = (H + (rT)_x a) r^-1 ///////////////////////////////////////////////////
    const H = new BN(hash256_hex, "hex")
    const a = new BN(privateKey, "hex")

    while(1)
    {
        const r = secp256k1.genKeyPair().getPrivate()

        const rT_x = T_point.mul(r).getX();
        ///
        //const tG = secp256k1.curve.g.mul(t1)
        //const rtG_x = tG.mul(r).getX()

        ///

        const s_adaptor = (rT_x.umod(secp256k1.curve.n).mul(a).add(H)).mul(r.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
                            //.mul(t1.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)

        if (s_adaptor.gt(secp256k1.curve.n.div(new BN(2))))
            continue;

        ////////////////////////////signature: sig_a = ( (rG)_x, s_a ) /////////////////////////////////////////////////////////////////////
        const sig_a = Buffer.alloc(64);
        rT_x.toArrayLike(Buffer).copy(sig_a)
        s_adaptor.toArrayLike(Buffer).copy(sig_a, 32)
        
        ////////////////////////////check signature here///////////////////////////////////////////////////////////////////////////
    /* const pairX = multicoin.ECPair.fromPrivateKey(a.toArrayLike(Buffer), { network: bitcoin.networks.testnet })
        //const pairX = secp256k1.fromPrivateKey(Buffer.from(a, "hex"));
        const s_a_check = pairX.verify(H.toArrayLike(Buffer), sig_a)

        if (s_a_check != true) throw new Error("check adaptor signature failed")*/

        return sig_a.toString("hex")
    }
    
}

exports.CreateAtaptorSignature_check = function(hash256_hex, privateKey, T_point, t)
{
    /////////////////////////////ADAPTOR SIGNATURE s_adaptor = (H + (r(tG))_x a) r^-1 = (H + (rT)_x a) r^-1 ///////////////////////////////////////////////////
    const H = new BN(hash256_hex, "hex")
    const a = new BN(privateKey, "hex")
    const r = secp256k1.genKeyPair().getPrivate()

    const rT_x = T_point.mul(r).getX();
    
    ///
    const tG = secp256k1.curve.g.mul(t)
    const rtG_x = tG.mul(r).getX()

    if (rtG_x.toString("hex") != rT_x.toString("hex")) throw new Error("Public adaptor point mismatch")

    ///

    const s_adaptor = (rT_x.umod(secp256k1.curve.n).mul(a).add(H)).mul(r.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
                        .mul(t.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
    
    ////////////////////////////signature: sig_a = ( (rG)_x, s_a ) /////////////////////////////////////////////////////////////////////
    const sig_a = Buffer.alloc(64);
    rT_x.toArrayLike(Buffer).copy(sig_a)
    s_adaptor.toArrayLike(Buffer).copy(sig_a, 32)
    
    ////////////////////////////check signature here///////////////////////////////////////////////////////////////////////////
    const pairX = multicoin.ECPair.fromPrivateKey(a.toArrayLike(Buffer), { network: bitcoin.networks.testnet })
    const s_a_check = pairX.verify(H.toArrayLike(Buffer), sig_a)

    if (s_a_check != true) throw new Error("check adaptor signature failed")

    return sig_a.toString("hex")
}



/*exports.verifyAdaptor = function(sigAdaptor, hash, privateAtaptor, publicKey, network)
{
    const pair = multicoin.ECPair.fromPrivateKey(a.toArrayLike(Buffer), { network: bitcoin.networks.testnet })

}*/

exports.SELL_SEQUENCE = bip68.encode({ blocks: 1 });
exports.REFUND_SEQUENCE = bip68.encode({ blocks: 1 });
exports.CANCEL_SEQUENCE = bip68.encode({ blocks: 1 });

function GetRedeemScript(publicGetBTC, publicRefundBTC, hashSecret)
{
    // 2 blocks from now
    const sequence2 = exports.SELL_SEQUENCE;

    // 4 blocks from now
    const sequence4 = exports.REFUND_SEQUENCE;

    // 6 blocks from now
    const sequence6 = exports.CANCEL_SEQUENCE;

    /*const redeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_IF,
        //Sell BTC script (redeem: <signatureSeller> <signatureBuyer> OP_TRUE )
            bitcoin.script.number.encode(sequence2),
            bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
            bitcoin.opcodes.OP_DROP,
            bitcoin.opcodes.OP_RIPEMD160,
            Buffer.from(hashSecret, "hex"),
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_2,
            Buffer.from(publicGetBTC, "hex"), //must be signed with buyers private key
            Buffer.from(publicRefundBTC, "hex"), //must be signed with sellers private key
            bitcoin.opcodes.OP_2,
            bitcoin.opcodes.OP_CHECKMULTISIG,
        bitcoin.opcodes.OP_ELSE,
            bitcoin.opcodes.OP_IF,
            //Refund BTC script (redeem: <signatureSeller> <signatureBuyer> OP_TRUE OP_FALSE)
                bitcoin.script.number.encode(sequence4),
                bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
                bitcoin.opcodes.OP_DROP,
                bitcoin.opcodes.OP_2,
                Buffer.from(publicGetBTC, "hex"), //must be signed with buyers private key
                Buffer.from(publicRefundBTC, "hex"), //must be signed with sellers private key
                bitcoin.opcodes.OP_2,
                bitcoin.opcodes.OP_CHECKMULTISIG,
            bitcoin.opcodes.OP_ELSE,
            //Cancel script (BTC move to buyer when seller not responce)
                bitcoin.script.number.encode(sequence6),
                bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
                bitcoin.opcodes.OP_DROP,
                Buffer.from(publicGetBTC, "hex"), //must be signed with buyers private key
                bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ENDIF,
        bitcoin.opcodes.OP_ENDIF
    ])*/

    const redeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_IF,
        //Sell BTC script (redeem: <signatureSeller> <signatureBuyer> OP_TRUE )
            bitcoin.script.number.encode(sequence2),
            bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
            bitcoin.opcodes.OP_DROP,
            bitcoin.opcodes.OP_RIPEMD160,
            Buffer.from(hashSecret, "hex"),
            bitcoin.opcodes.OP_EQUALVERIFY,
            Buffer.from(publicRefundBTC, "hex"), //must be signed with sellers private key
            bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ELSE,
            bitcoin.opcodes.OP_IF,
            //Refund BTC script (redeem: <signatureSeller> <signatureBuyer> OP_TRUE OP_FALSE)
                bitcoin.script.number.encode(sequence4),
                bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
                bitcoin.opcodes.OP_DROP,
                Buffer.from(publicGetBTC, "hex"), //must be signed with buyers private key
                bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ELSE,
            //Cancel script (BTC move to buyer when seller not responce)
                bitcoin.script.number.encode(sequence6),
                bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
                bitcoin.opcodes.OP_DROP,
                Buffer.from(publicGetBTC, "hex"), //must be signed with buyers private key
                bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ENDIF,
        bitcoin.opcodes.OP_ENDIF
    ])

   return redeemScript;
}

exports.GetP2SH = function(publicGetBTC, publicRefundBTC, hashSecret, network)
{
    const redeemScript = GetRedeemScript(publicGetBTC, publicRefundBTC, hashSecret)
    return bitcoin.payments.p2sh({ redeem: { output: redeemScript, network: network }, network: network });
}

function GetP2WSH(keyPair, network)
{
    return bitcoin.payments.p2wsh({ redeem: { output: GetRedeemScript(keyPair), network: network }, network: network });
}

exports.broadcast = async function(rawTX, coin, debug = true)
{
    //if (coin == "tbtc" && !debug)
    //    return await tbtc_utils.broadcast(rawTX)

    //if (debug)
        alert(rawTX)

    return "0";
}

exports.GetTransaction = function(hash, coin, callback)
{
    const request = utils.ClientDH_Encrypt(JSON.stringify({
        request: "blockchain.transaction.get",
        params: [hash]}));

    customP2P.SendMessage({
        command: "electrum", 
        publicKey: g_constants.clientDHkeys.pub,
        serverKey: g_constants.clientDHkeys.server_pub, 
        request: request,
        coin: coin}, result => 
        {
            try {
                if (!result)
                    return setTimeout(exports.WaitTransaction, 1, hash, coin, callback)
               
                return callback({result: true, tx: bitcoin.Transaction.fromHex(JSON.parse(result))})
            }
            catch(e) {
                callback ({result: false, message: e.message})
            }
        }
    );
}

exports.WaitTransaction = async function(tx, coin, callback)
{
    try {
        const history = await exports.GetHistory(utils.Hash256(tx.outs[1].script.toString("hex"), "hex", true), coin)

        if (!history.result || !history.txs.length)
            return setTimeout(exports.WaitTransaction, 1000*60*1, tx, coin, callback) 

        for (let i=0; i<history.txs.length; i++)
        {
            if (history.txs[i].tx_hash == tx.getHash().reverse().toString("hex"))
            {
                if (history.txs[i].height != 0)
                    return callback({result: true, height: history.txs[i].height})
            }
        }
        setTimeout(exports.WaitTransaction, 1000*60*1, tx, coin, callback)
    }
    catch(e) {
        return callback({result: false, message: e.message})
    }
}

exports.GetHistory = function(scriptpubkey, coin)
{
    const request = utils.ClientDH_Encrypt(JSON.stringify({
        request: "blockchain.scripthash.get_history",
        params: [scriptpubkey]}));
    
    return new Promise(ok => {
        customP2P.SendMessage({
            command: "electrum", 
            publicKey: g_constants.clientDHkeys.pub,
            serverKey: g_constants.clientDHkeys.server_pub, 
            request: request,
            coin: coin}, result => 
            {
                try {
                    const ret = JSON.parse(result)
                    
                    return ok({result: true, txs: ret})
                }
                catch(e) {
                    ok ({result: false, message: e.message})
                }
            }
        );    
    })
}

exports.CheckSpent = function(scriptpubkey, txHash, coin)
{
    const request = utils.ClientDH_Encrypt(JSON.stringify({
        request: "blockchain.scripthash.listunspent",
        params: [scriptpubkey]}));
    
    return new Promise(ok => {
        customP2P.SendMessage({
            command: "electrum", 
            publicKey: g_constants.clientDHkeys.pub,
            serverKey: g_constants.clientDHkeys.server_pub, 
            request: request,
            coin: coin}, result => 
            {
                try {
                    const ret = JSON.parse(result)

                    for (let i=0; i<ret.length; i++)
                    {
                        if (ret.tx_hash == txHash)
                            return ok({result: true, spent: false})
                    }
                    
                    return ok({result: true, spent: true, ret: result})
                }
                catch(e) {
                    ok ({result: false, message: e.message})
                }
            }
        );    
    })
}

exports.GetSignatureFromTX = function(txHash, coin)
{
    return new Promise(ok => {
        exports.GetTransaction(txHash, coin, ret => {
            if (!ret.result || ret.tx.outs.length != 1 || ret.tx.ins.length != 1 || !ret.tx.ins[0].script) 
            {
                console.log(ret)
                return ok(null)
            }

            const asm = ret.tx.ins[0].script.toString("hex");
            const length1 = ret.tx.ins[0].script[1]
            const length2 = ret.tx.ins[0].script[length1+2]

            const sig1 = Buffer.from(asm.substring(4, 4+length1*2), "hex")
            const sig2 = Buffer.from(asm.substring(4+length1*2+2, 4+length1*2+2+length2*2), "hex")

            //const sig = bitcoin.script.signature.decode(Buffer.from(asm.substring(2, 2+length*2), "hex")).signature
            const sigSeller = bitcoin.script.signature.decode(sig1).signature
            const sigBuyer = bitcoin.script.signature.decode(sig2).signature

            return ok({sigSeller: sigSeller, sigBuyer: sigBuyer})
        })
    })
}

exports.RefundMonero = function(address, refundAddress, amount, coin)
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

    return new Promise(async ok => {
        if (coin == "txmr")
        {
            const fee = 0.001*100000000;
            const refund_amount = amount - fee;

            const ret = await txmr_utils.SendMoney(address, refundAddress, refund_amount/100000000);
            if (ret.result == false)
                utils.SwapLog(ret.code ? `SendMoney returned error code ${ret.code}` : ret.message || "SendMoney returned error", "e")
            else
                utils.SwapLog(`SendMoney (txmr) returned without errors! txid=${ret.txid}`, "i")

            return ok(ret)
        }
        return ok({result: false, code: 2, message: "RefundMonero error: Unsupported"})
   })


}

