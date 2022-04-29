"use strict";

const utils = require("../utils")
const bitcoin = require("bitcoinjs-lib")
const common = require("./common")
const multicoin = require("multicoinjs-lib");
const monero = require("../wallets/monero")
const txmr = require("../wallets/monero_test/utils")
const BN = require('bn.js');
const { DEFAULT_CHECK_CONNECTION_PERIOD } = require("monero-javascript/src/main/js/common/MoneroConnectionManager");
const EC = require('elliptic').ec
const EdDSA = require('elliptic').eddsa;

const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

let g_Transactions = {}

exports.getSwapTransactionFromBuyer = async function(infoSeller, swapInfo)
{
    /*
    const infoSeller = {
        infoSecret: infoSecret
    }

    */

    try {
        const network = common.NETWORK[swapInfo.swapInfoBuyer.sell_coin];
        
        if (!g_Transactions[swapInfo.swapInfoBuyer.swapID])
            return {result: false, message: "Error: Swap not found. (got invalid swapId from seller)"}

        const ctx = g_Transactions[swapInfo.swapInfoBuyer.swapID];
 
        utils.SwapLog(`Received secret from seller. Try to get ${swapInfo.swapInfoBuyer.sell_coin} from first transaction`, "b")

        //////////////////////////////////////////////////
        ///////Sign and compile Sell Transaction/////////////////////////
        const ecPair = multicoin.ECPair.fromPrivateKey(swapInfo.addressBuyerBTC.privateKey, { network: network })
        const signatureBuyer = bitcoin.script.signature.encode(ecPair.sign(ctx.signatureHash_sell), bitcoin.Transaction.SIGHASH_ALL)        
        
        const redeemScriptSig = bitcoin.payments.p2sh({
            network: network,
            redeem: {
                network: network,
                input: bitcoin.script.compile([
                    bitcoin.opcodes.OP_0,
                    ctx.signatureSell, 
                    signatureBuyer,
                    Buffer.from(infoSeller.infoSecret),
                    bitcoin.opcodes.OP_TRUE
                ]),
                output: ctx.redeemScript.redeem.output
            },
        }).input;

        ctx.sellTx.setInputScript(0, redeemScriptSig);
        
        const txid = await common.broadcast(ctx.sellTx.toHex(), ctx.sell_coin)

        if (txid.length > 50)
        {
            utils.SwapLog(`Success swap for ${ctx.sell_coin}! txid: ${txid}`, "b")

            if (g_Transactions[swapInfo.swapInfoBuyer.swapID])
                delete g_Transactions[swapInfo.swapInfoBuyer.swapID];
    
            return {result: true, txid: txid}; 
        }
        return {result: true, message: "Transaction was not sent. Something wrong on the Buyer side."};
    
    }
    catch(e) {
        return {result: false, message: e.message}
    }
    return {result: false, message: "Error: something wrong on the Buyer side"}
}

exports.getAdaptorSignatureFromBuyer = function(sellerDLEQ, swapInfo)
{
/*
    swapInfo = {swapInfoBuyer: swapInfoBuyer, addressBuyerBTC: addressBuyerBTC, getViewPair, getSpentPair}

    const swapInfoBuyer = {
        uid: orderUID,
        swapID: orderMnemonic,
        sell_coin: sell_coin,
        sell_amount: sell_amount,
        seller_pubkey: seller_pubkey,
        buy_coin: buy_coin, 
        buy_amount, buy_amount,
        privBuyerViewKey: g_Swaps[orderMnemonic].getViewPair().priv, //private view XMR key: v_2 
        pubBuyerAdaptorKey: g_Swaps[orderMnemonic].getSpentPair().pubBTC, //adaptor public: T_2 = t_2 G
        pubBuyerSpentKey: g_Swaps[orderMnemonic].getSpentPair().pub,  //public spent XMR key: t_2 M
        addressBuyerBTC: addressBuyerBTC.p2pkh.address,
        publicGetBTC: addressBuyerBTC.publicKey, //P_2
        DLEQ: {s: keys.s, c: keys.c}
    }
/*
    const sellerDLEQ = {
        firstTransaction: {hash1: firstTransaction.getHash().toString("hex"), out1: firstTransaction.outs[1].value},
        publicRefundBTC: orderSeller.addressBTC.publicKey, // P_1 = <prefix> a G
        publicRefundAddress: orderSeller.addressBTC.p2pkh.address, // address for refund BTC
        pubSellerAdaptorKey: orderSeller.swapContext.getSpentPair().pubBTC, //adaptor public: T_1 = t_1 G
        pubSellerAdaptorKey_y: orderSeller.swapContext.getSpentPair().pubBTC_y,
        pubSellerSpentKey: orderSeller.swapContext.getSpentPair().pub,  //public spent XMR key: t_1 M
        privSellerViewKey: orderSeller.swapContext.getViewPair().priv, //private view XMR key: v_1
        sharedMoneroAddress: sharedMoneroAddress,
        hashSecret: hashSecret,
        DLEQ: {s: keys.s, c: keys.c}
    }
    sellerDLEQ["signatureHash_refund"] = signatureHash_refund.toString("hex");
    sellerDLEQ["signatureHash_sell"] = signatureHash_sell.toString("hex");
    
    keys = {
        pubKeyBTC: pubKeyBTC, pubKeyBTC_y: pubKeyBTC_y,
        pubKeyXMR: pubKeyXMR, 
        s: s.toString("hex"), c: c.toString("hex")}

*/

    const network = common.NETWORK[swapInfo.swapInfoBuyer.sell_coin];

    ///////////CHECK DLEQ////////////////////////////
    //if (sellerDLEQ.pubSellerAdaptorKey_y != sellerDLEQ.DLEQ.pubBTC_y) throw new Error("Error: bad DLEQ info received from seller!")

    //const pubXMR_y = new BN(sellerDLEQ.pubSellerSpentKey, "hex", "le").toString("hex")
    const keys = {
        pubKeyBTC: sellerDLEQ.pubSellerAdaptorKey.substring(2), pubKeyBTC_y: sellerDLEQ.pubSellerAdaptorKey_y, 
        pubKeyXMR: sellerDLEQ.pubSellerSpentKey, 
        s: sellerDLEQ.DLEQ.s, c: sellerDLEQ.DLEQ.c
    }

    if (!utils.checkKeysDLEQ(keys)) 
        return {result: false, message: "Error initial check DLEQ (3)", stop: true}
    ///////////////////////////////////////
    
    const privSellerViewKey = sellerDLEQ.privSellerViewKey;
    const pubSellerSpentKey = sellerDLEQ.pubSellerSpentKey;

    const sharedMoneroAddress = monero.GetAddressFromPublicKeysAB(
        swapInfo.swapInfoBuyer.privBuyerViewKey, swapInfo.swapInfoBuyer.pubBuyerSpentKey, 
        privSellerViewKey, pubSellerSpentKey
    )

    if (sharedMoneroAddress.address != sellerDLEQ.sharedMoneroAddress) 
        return {result: false, message: "Error at buyer side: shared XMR address mismatch!", stop: true}

    if (sellerDLEQ["failedCounter"]*1 == 0)
    {
        utils.SwapLog(`Generate buyer signatures`, "b")
        utils.SwapLog(`Shared monero address: ${sharedMoneroAddress.address}`, "b")
    }
    ////DEBUG CHECK XMR SPENT ADDRESS////////////
    /*const checkAddress = monero.GetAddressFromPrivateKeysAB(
        swapInfo.swapInfoBuyer.privBuyerViewKey, swapInfo.getSpentPair().priv, 
        sellerDLEQ.privSellerViewKey, sellerDLEQ.t1, swapInfo.swapInfoBuyer.pubBuyerSpentKey, pubSellerSpentKey    
    )
    if (checkAddress.address != sharedMoneroAddress.address) throw new Error("Error check address XMR")*/
    /////////////////////////////////////////////

    const fee = common.getFee(network);

    if (sellerDLEQ.firstTransaction.out1*1 <= fee)
        return {result: false, message: "Too small amount: " + (sellerDLEQ.firstTransaction.out1/100000000).toFixed(8), stop: true}

    const redeemScript = common.GetP2SH(
        swapInfo.swapInfoBuyer.publicGetBTC, sellerDLEQ.publicRefundBTC,  //for signatures
        sellerDLEQ.hashSecret,
        network
    );    

    try {
        const txs = {refundTx: new bitcoin.Transaction(network), sellTx: new bitcoin.Transaction(network), cancel: new bitcoin.Transaction(network)}
        txs.refundTx.version = txs.sellTx.version = txs.cancel.version = 2;
        
        txs.refundTx.addInput(Buffer.from(sellerDLEQ.firstTransaction.hash1, "hex"), 1, common.REFUND_SEQUENCE);
        txs.sellTx.addInput(Buffer.from(sellerDLEQ.firstTransaction.hash1, "hex"), 1, common.SELL_SEQUENCE);
        txs.cancel.addInput(Buffer.from(sellerDLEQ.firstTransaction.hash1, "hex"), 1, common.CANCEL_SEQUENCE);

        txs.refundTx.addOutput(bitcoin.address.toOutputScript(sellerDLEQ.publicRefundAddress, network), sellerDLEQ.firstTransaction.out1-fee)
        txs.sellTx.addOutput(bitcoin.address.toOutputScript(swapInfo.swapInfoBuyer.addressBuyerBTC, network), sellerDLEQ.firstTransaction.out1-fee)
        txs.cancel.addOutput(bitcoin.address.toOutputScript(swapInfo.swapInfoBuyer.addressBuyerBTC, network), sellerDLEQ.firstTransaction.out1-fee)

        const signatureHash_refund = txs.refundTx.hashForSignature(0, redeemScript.redeem.output, bitcoin.Transaction.SIGHASH_ALL);       
        const signatureHash_sell = txs.sellTx.hashForSignature(0, redeemScript.redeem.output, bitcoin.Transaction.SIGHASH_ALL);
        
        if (signatureHash_refund.toString("hex") != sellerDLEQ["signatureHash_refund"]) 
            return {result: false, message: "Error: bad hash received from seller for refund transaction!", stop: true}
        if (signatureHash_sell.toString("hex") != sellerDLEQ["signatureHash_sell"]) 
            return {result: false, message: "Error: bad hash received from seller for sell transaction!", stop: true}

        /////////CHECK ADAPTOR SIGNATURE//////////////////////////////       
        
        const t2 = new BN(swapInfo.getSpentPair().priv, "hex", "le"); //Buyer private adaptor
        const rT_x = new BN(sellerDLEQ["signatureAdaptorPart"].substring(0, 64), "hex");

        const s_adaptor = new BN(sellerDLEQ["signatureAdaptorPart"].substring(64), "hex").mul(t2.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
        if (s_adaptor.gt(secp256k1.curve.n.div(new BN(2)))) 
            return {result: false, message: "Seller sent invalid S value for bitcoin transaction!"}
   
        const sig_a = Buffer.alloc(64);
        rT_x.toArrayLike(Buffer).copy(sig_a)        
        s_adaptor.toArrayLike(Buffer).copy(sig_a, 32)

        const ecPair = multicoin.ECPair.fromPublicKey(Buffer.from(sellerDLEQ.publicRefundBTC, "hex"), { network: network })
        
        const checked = ecPair.verify(signatureHash_sell, sig_a)

        if (!checked) 
            return {result: false, message: "Seller sent invalid adaptor signature for sell transaction!"}

        //////////////////////////////////////////////////
        ///////Sign and compile Sell Transaction/////////////////////////
        const signatureSell = bitcoin.script.signature.encode(sig_a, bitcoin.Transaction.SIGHASH_ALL);

        /*const redeemScriptSig = bitcoin.payments.p2sh({
            network: network,
            redeem: {
                network: network,
                input: bitcoin.script.compile([
                    signature, //signature for P1 (seller publicRefundBTC) public key
                    bitcoin.opcodes.OP_TRUE
                ]),
                output: redeemScript.redeem.output
            },
        }).input;

        txs.sellTx.setInputScript(0, redeemScriptSig);*/
        /////////////////////////////////////////////////////////////////////
        
        ///////Sign and compile Cancel Transaction/////////////////////////
        const signatureHash_cancel = txs.cancel.hashForSignature(0, redeemScript.redeem.output, bitcoin.Transaction.SIGHASH_ALL);

        const ecPair_cancel = multicoin.ECPair.fromPrivateKey(swapInfo.addressBuyerBTC.privateKey, { network: network })

        const signatureCancelTX = bitcoin.script.signature.encode(ecPair_cancel.sign(signatureHash_cancel), bitcoin.Transaction.SIGHASH_ALL);

        const redeemScriptSigCancelTX = bitcoin.payments.p2sh({
            network: network,
            redeem: {
                network: network,
                input: bitcoin.script.compile([
                    signatureCancelTX, //signature for P2 (buyer publicGetBTC) public key
                    bitcoin.opcodes.OP_FALSE,
                    bitcoin.opcodes.OP_FALSE
                ]),
                output: redeemScript.redeem.output
            },
        }).input;

        txs.cancel.setInputScript(0, redeemScriptSigCancelTX);
        /////////////////////////////////////////////////////////////////////

        const pubPointAdaptorT = secp256k1.curve.point(new BN(sellerDLEQ.pubSellerAdaptorKey.substring(2), "hex"), new BN(sellerDLEQ.pubSellerAdaptorKey_y, "hex"))

        const signatureAdaptorPart = common.CreateAtaptorSignature(signatureHash_refund, swapInfo.addressBuyerBTC.privateKey.toString("hex"), pubPointAdaptorT)

        const adaptor_context = {
            sharedMoneroAddress: sharedMoneroAddress.address,
            signatureAdaptorPart: new BN(signatureAdaptorPart.substring(64), "hex"),
            pubSellerSpentKey: sellerDLEQ.pubSellerSpentKey,
            privBuyerViewKey: swapInfo.swapInfoBuyer.privBuyerViewKey,
            privBuyerSpentKey: swapInfo.getSpentPair().priv,
            pubBuyerSpentKey: swapInfo.getSpentPair().pub,
            privSellerViewKey: sellerDLEQ.privSellerViewKey,
            privSellerSpentKey: null, //wait the adaptor (t1) from signed refund transaction t1 = orderSeller.swapContext.getSpentPair().priv
            hashSecret: sellerDLEQ.hashSecret,
            //t1: sellerDLEQ.t1
        }

        g_Transactions[swapInfo.swapInfoBuyer.swapID] = {
            sell_coin: swapInfo.swapInfoBuyer.sell_coin,
            buy_coin: swapInfo.swapInfoBuyer.buy_coin, 
            buy_amount: swapInfo.swapInfoBuyer.buy_amount,
            publicRefundBTC: sellerDLEQ.publicRefundBTC, //public key for refund
            publicRefundAddress: sellerDLEQ.publicRefundAddress, //address for refund BTC
            sellTx: txs.sellTx, //uncomplete sell transaction
            signatureSell: signatureSell, //signature for sell transaction
            signatureHash_sell: signatureHash_sell,
            cancel: txs.cancel, //signed cancel transaction
            redeemScript: redeemScript,
            t2: swapInfo.getSpentPair().priv, //Buyer private adaptor
            adaptor_context: adaptor_context,
            time: Date.now()
        };


        return {
            result: true, 
            signatureHash_refund: signatureHash_refund.toString("hex"), 
            signatureAdaptorPart: signatureAdaptorPart,
            sharedMoneroAddress: sharedMoneroAddress.address
        }
    }
    catch(e) {
        utils.SwapLog(e.message, "e")
        return {result: false, message: e.message}
    }

}

//Processing by buyer (buy BTC, sell XMR)
exports.ProcessBuyOrder = function(result, swapInfoBuyer, refundXMR)
{
/*
    result = {
        result: true, 
        rawTX_first: firstTransaction.toHex(), 
        sharedMoneroAddress: sharedMoneroAddress.address,
    }

    const swapInfoBuyer = {
        uid: orderUID,
        swapID: orderMnemonic,
        sell_coin: sell_coin,
        sell_amount: sell_amount,
        seller_pubkey: seller_pubkey,
        buy_coin: buy_coin, 
        buy_amount, buy_amount,
        privBuyerViewKey: g_Swaps[orderMnemonic].getViewPair().priv, //private view XMR key: v_2 
        pubBuyerAdaptorKey: g_Swaps[orderMnemonic].getSpentPair().pubBTC, //adaptor public: T_2 = t_2 G
        pubBuyerSpentKey: new BN(g_Swaps[orderMnemonic].getSpentPair().pub, "hex", "le").toString("hex"),  //public spent XMR key: t_2 M
        addressBuyerBTC: addressBuyerBTC.p2pkh.address,
        publicGetBTC: addressBuyerBTC.publicKey, //P_2
        DLEQ: {s: keys.s, c: keys.c}
    }
    
*/
    utils.SwapLog(`Start processing buy order`, "b")

    const network = common.NETWORK[swapInfoBuyer.sell_coin];

    if (!swapInfoBuyer.swapID || !g_Transactions[swapInfoBuyer.swapID]) throw new Error("Error: buyer got bad data from seller (swap not found)")

    const txs = g_Transactions[swapInfoBuyer.swapID];

    const txFirst = bitcoin.Transaction.fromHex(result.rawTX_first);

    if (txFirst && txFirst.outs && txFirst.outs.length == 2 && txFirst.outs[1].value && txFirst.outs[1].script)
    {   
        const redeemScript = common.GetP2SH(
            swapInfoBuyer.publicGetBTC, txs.publicRefundBTC,  //for signatures
            txs.adaptor_context.hashSecret,
            network
        );    
        
        const sharedMoneroAddress = monero.GetAddressFromPublicKeysAB(
            swapInfoBuyer.privBuyerViewKey, swapInfoBuyer.pubBuyerSpentKey, 
            txs.adaptor_context.privSellerViewKey, txs.adaptor_context.pubSellerSpentKey
        )
    
        if (sharedMoneroAddress.address != result.sharedMoneroAddress) throw new Error("Error at buyer processing: sharedMoneroAddress mismatch")
              
        if (swapInfoBuyer.sell_amount != txFirst.outs[1].value)
            return {result: false, message: "Bad transaction from seller sell_amount="+txFirst.outs[1].value}
        if (redeemScript.output.toString("hex") != txFirst.outs[1].script.toString("hex"))
            return {result: false, message: "Bad transaction from seller redeemScript failed"}
        
        //First transaction is checked
        common.broadcast(result.rawTX_first, swapInfoBuyer.sell_coin)
        
        WaitConfirmation(txFirst, swapInfoBuyer.swapID, refundXMR)

        return {result: true, message: "TODO more then..."}
    }
    return {result: false, message: "Bad transaction from seller"}
}

async function WaitConfirmation(txFirst, swapID, refundXMR)
{
    /*
        g_Transactions[swapInfo.swapInfoBuyer.swapID] = {
            sell_coin: swapInfo.swapInfoBuyer.sell_coin,
            buy_coin: swapInfo.swapInfoBuyer.buy_coin, 
            buy_amount: swapInfo.swapInfoBuyer.buy_amount,
            publicRefundBTC: sellerDLEQ.publicRefundBTC, //public key for refund
            publicRefundAddress: sellerDLEQ.publicRefundAddress, //address for refund BTC
            sellTx: txs.sellTx, //uncomplete sell transaction
            cancel: txs.cancel, //signed cancel transaction
            t2: swapInfo.getSpentPair().priv, //Buyer private adaptor
            adaptor_context: adaptor_context,
            time: Date.now()
        };
    */

    //if (!g_Transactions[swapID] || !!g_Transactions[swapID]["WaitConfirmation"])
    if (!g_Transactions[swapID])
        return;

    //g_Transactions[swapID]["WaitConfirmation"] = true

    const sell_coin = g_Transactions[swapID].sell_coin;
    const buy_coin = g_Transactions[swapID].buy_coin;
    const buy_amount = g_Transactions[swapID].buy_amount;
    const ctx = g_Transactions[swapID].adaptor_context;

    utils.SwapLog("Wait confirmation for the first BTC transaction: "+txFirst.getHash().reverse().toString("hex"), "b")
    console.log("WaitTransaction "+txFirst.getHash().reverse().toString("hex"));

    common.WaitTransaction(txFirst, sell_coin, async ret => {
        if (!ret.result)
            return console.log(ret.message);

        //Transaction confirmed so buyer send his coins (xmr) to seller
        if (buy_coin == "txmr")
        {
            utils.SwapLog(`Try to send ${buy_amount/100000000} txmr to address ${ctx.sharedMoneroAddress}`, "b")
            
            const ret = await txmr.SendMoney(refundXMR, ctx.sharedMoneroAddress, buy_amount/100000000);
            //ok({result: true, txid: txid[0]});

            if (ret.result == false)
                utils.SwapLog(ret.code ? `SendMoney returned error code ${ret.code}` : ret.message || "SendMoney returned error", "b")
            else
                utils.SwapLog(`SendMoney (txmr) returned without errors! txid=${ret.txid}`, "b")

            /*if (!ret || ret.code == 1) //Not enough funds
            {
                bNeedRefund = false;
                console.log(ret.message);
            }
            if (ret && ret.result == true)
            {
                const ret2 = txmr
            }*/
        }

        setTimeout(WaitRefund, 1000, txFirst, swapID, refundXMR.address)

        setTimeout(getCancel, 1000*60*10, swapID)

    })
}

async function WaitRefund(txFirst, swapID, refundXMR)
{
    console.log("WaitRefund "+txFirst.getHash().reverse().toString("hex"));
    /*
        g_Transactions[swapInfo.swapInfoBuyer.swapID] = {
            sell_coin: swapInfo.swapInfoBuyer.sell_coin,
            buy_coin: swapInfo.swapInfoBuyer.buy_coin, 
            buy_amount: swapInfo.swapInfoBuyer.buy_amount,
            publicRefundBTC: sellerDLEQ.publicRefundBTC, //public key for refund
            publicRefundAddress: sellerDLEQ.publicRefundAddress, //address for refund BTC
            sellTx: txs.sellTx, //uncomplete sell transaction
            cancel: txs.cancel, //signed cancel transaction
            t2: swapInfo.getSpentPair().priv, //Buyer private adaptor
            adaptor_context: adaptor_context,
            time: Date.now()
        };
        const adaptor_context = {
            signatureAdaptorPart: signatureAdaptorPart.substring(64),
            pubSellerSpentKey: sellerDLEQ.pubSellerSpentKey,
            privBuyerViewKey: swapInfo.swapInfoBuyer.privBuyerViewKey,
            privBuyerSpentKey: swapInfo.getSpentPair().priv,
            privSellerViewKey: sellerDLEQ.privSellerViewKey,
            privSellerSpentKey: null //wait the adaptor (t1) from signed refund transaction t1 = orderSeller.swapContext.getSpentPair().priv
        }

    */
    //if (!g_Transactions[swapID] || !!g_Transactions[swapID]["WaitRefund"])
    if (!g_Transactions[swapID])
        return;

    //g_Transactions[swapID]["WaitRefund"] = true
        
    const coin = g_Transactions[swapID].sell_coin;

    const check = await common.CheckSpent(utils.Hash256(txFirst.outs[1].script.toString("hex"), "hex", true), txFirst.getHash().toString("hex"), coin)

    if (!check.result || !check.spent)
        return setTimeout(WaitRefund, 1000*60*1, txFirst, swapID, refundXMR) //not spent
 
    const check2 = await common.GetHistory(utils.Hash256(txFirst.outs[1].script.toString("hex"), "hex", true), coin)
    if (!check2.result || !check2.txs.length)
        return setTimeout(WaitRefund, 1000*60*1, txFirst, swapID, refundXMR) //not spent

    console.log("Seems refunded "+txFirst.getHash().reverse().toString("hex"));

    let txs = [];
    for (let i=0; i<check2.txs.length; i++)
    {
        if (check2.txs[i].tx_hash != txFirst.getHash().reverse().toString("hex") && !txs.length)
            continue;

        txs.push(check2.txs[i].tx_hash)
    }

    if (txs.length <= 1)
        return setTimeout(WaitRefund, 1000*60*1, txFirst, swapID, refundXMR) //seems not refunded yet
    
    //Seems Got REFUND!

    try {
        for (let i=1; i<txs.length; i++)
        {
            const sigs = await common.GetSignatureFromTX(txs[i], coin)
            
            if (!sigs) 
                continue;

            const signature = new BN(sigs.sigBuyer.toString("hex").substring(64), "hex").invm(secp256k1.curve.n);

            const ctx = g_Transactions[swapID].adaptor_context;
            
            const privSellerSpentKey = ctx.signatureAdaptorPart.mul(signature).umod(secp256k1.curve.n).toArrayLike(Buffer, "le", 32)

            const checkAddress = monero.GetAddressFromPrivateKeysAB(
                ctx.privBuyerViewKey, ctx.privBuyerSpentKey, 
                ctx.privSellerViewKey, privSellerSpentKey.toString("hex")) //, ctx.pubBuyerSpentKey, ctx.pubSellerSpentKey)

            if (checkAddress.address != ctx.sharedMoneroAddress) 
                continue;

            utils.SwapLog(`Try refund ${(g_Transactions[swapID].buy_amount/100000000)} txmr to address ${refundXMR}`, "b")
            
            const ret = await common.RefundMonero(checkAddress, refundXMR, g_Transactions[swapID].buy_amount, g_Transactions[swapID].buy_coin)
            
            if (!ret || !ret.result) //Try get refund until success
            {
                utils.SwapLog(`Error${ret.message ? ": "+ret.message : ""} will wait 10 min<br>address: ${checkAddress.address}<br>private view key: ${checkAddress.privViewKey}<br>private spent key: ${checkAddress.privSpentKey}`, "b")
                return setTimeout(WaitRefund, 1000*60*10, txFirst, swapID, refundXMR)
            }

            utils.SwapLog(`Refund success! ${g_Transactions[swapID].buy_amount/100000000} txmr to address ${refundXMR}`, "b")

            if (!!g_Transactions[swapID]) delete g_Transactions[swapID];

            break;
        }
    }
    catch(e) {
        console.log(e)
        utils.SwapLog(e.message, "b")
    }
    return setTimeout(WaitRefund, 1000*60*1, txFirst, swapID)
}

async function getCancel (swapID)
{
/*
        g_Transactions[swapInfo.swapInfoBuyer.swapID] = {
            sell_coin: swapInfo.swapInfoBuyer.sell_coin,
            publicRefundBTC: sellerDLEQ.publicRefundBTC, //public key for refund
            publicRefundAddress: sellerDLEQ.publicRefundAddress, //address for refund BTC
            sellTx: txs.sellTx, //uncomplete sell transaction
            cancel: txs.cancel, //signed cancel transaction
            t2: swapInfo.getSpentPair().priv, //Buyer private adaptor
            adaptor_context: adaptor_context,
            time: Date.now()
        };

*/  
    //if (!g_Transactions[swapID] || !!g_Transactions[swapID] ["getCancel"])
    if (!g_Transactions[swapID])
        return;

    //g_Transactions[swapID] ["getCancel"] = true;
    
    utils.SwapLog(`Try to cancel the BTC transaction`, "b")
        
    const ctx = g_Transactions[swapID];

    const txid = await common.broadcast(ctx.cancel.toHex(), ctx.sell_coin)

    if (txid.length > 50)
    {
        utils.SwapLog(`Sent Cancel transaction for BTC: ${txid}`, "b")

        return; //Cancelation done!
    }

    setTimeout(getCancel, 1000*60*5, swapID)

}