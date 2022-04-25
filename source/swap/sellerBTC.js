"use strict";
const utils = require("../utils")
const multicoin = require("multicoinjs-lib");
const bitcoin = require("bitcoinjs-lib")
const tbtc_utils = require("../wallets/bitcoin_test/utils")
const monero = require("../wallets/monero")
const customP2P = require("../server/p2p/custom")
const common = require("./common")
const BN = require('bn.js');
const EC = require('elliptic').ec
const EdDSA = require('elliptic').eddsa;
const txmr = require("../wallets/monero_test/utils")

const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

let g_Transactions = {}

//Init by seller (who sell BTC and buy XMR)
exports.InitBuyOrder = async function(orderSeller, swapInfoBuyer)
{
/*
    orderSeller  = {order: order, addressBTC: addressBTC, swapContext: swapContext};

    const order = {
        sell_amount: sell_amount, 
        buy_amount: buy_amount, 
        sell_coin: sell_coin, 
        seller_pubkey: addressBTC.p2pkh.hash.toString("hex"),
        time: Date.now(),
        buy_coin: buy_coin,
        active: 1
    }

*/
    /*
    const swapInfoBuyer = {
        uid: orderUID,
        swapID: orderMnemonic,
        sell_coin: sell_coin,
        sell_amount: sell_amount,
        seller_pubkey: seller_pubkey,
        privBuyerViewKey: g_Swaps[orderMnemonic].getViewPair().priv, //private view XMR key: v_2 
        pubBuyerAdaptorKey: g_Swaps[orderMnemonic].getSpentPair().pubBTC, //adaptor public: T_2 = t_2 G
        pubBuyerAdaptorKey_y: g_Swaps[orderMnemonic].getSpentPair().pubBTC_y,
        pubBuyerSpentKey: g_Swaps[orderMnemonic].getSpentPair().pub,  //public spent XMR key: t_2 M
        addressBuyerBTC: addressBuyerBTC.p2pkh.address,
        publicGetBTC: addressBuyerBTC.publicKey, //P_2
        DLEQ: {s: keys.s, c: keys.c}
    }
    keys = {
        pubKeyBTC: pubKeyBTC, pubKeyBTC_y: pubKeyBTC_y,
        pubKeyXMR: pubKeyXMR, 
        s: s.toString("hex"), c: c.toString("hex")}

    */

    //if (!!g_InitOrders[swapInfoBuyer.orderUID]) throw new Error("Error: order already init")

    ///////////CHECK DLEQ////////////////////////////
    //if (swapInfoBuyer.pubBuyerAdaptorKey_y != swapInfoBuyer.DLEQ.pubKeyBTC_y) throw new Error("Error: bad DLEQ info received from buyer!")
  
    //const pubXMR_y = new BN(swapInfoBuyer.pubBuyerSpentKey, "hex", "le").toString("hex")
    const keys = {
        pubKeyBTC: swapInfoBuyer.pubBuyerAdaptorKey.substring(2), pubKeyBTC_y: swapInfoBuyer.pubBuyerAdaptorKey_y, 
        pubKeyXMR: swapInfoBuyer.pubBuyerSpentKey, 
        s: swapInfoBuyer.DLEQ.s, c: swapInfoBuyer.DLEQ.c
    }

    if (!utils.checkKeysDLEQ(keys)) throw new Error("Error initial check DLEQ (2)")
    ///////////////////////////////////////

    const fee = common.getFee(common.NETWORK[swapInfoBuyer.sell_coin]);

    const list = (swapInfoBuyer.sell_coin == "tbtc") ? await tbtc_utils.listunspent(orderSeller.addressBTC) : false;

    if (!list) return {result: false, message: "listunspent failed"};

    const publicRefundBTC = orderSeller.addressBTC.publicKey;

    const redeemScript = common.GetP2SH(
        swapInfoBuyer.publicGetBTC, publicRefundBTC,  //for signatures
        common.NETWORK[swapInfoBuyer.sell_coin]
    );

    const privSellerViewKey = orderSeller.swapContext.getViewPair().priv;
    const pubSellerSpentKey = orderSeller.swapContext.getSpentPair().pub;

    const sharedMoneroAddress = monero.GetAddressFromPublicKeysAB(
        swapInfoBuyer.privBuyerViewKey, swapInfoBuyer.pubBuyerSpentKey, 
        privSellerViewKey, pubSellerSpentKey
    )

    const balance = await txmr.GetBalance(sharedMoneroAddress);

    const ecPair = multicoin.ECPair.fromPrivateKey(orderSeller.addressBTC.privateKey, { network: common.NETWORK[swapInfoBuyer.sell_coin] })
    if (!ecPair) return {result: false, message: "ecPair failed"};

    try {
        const txb = new multicoin.TransactionBuilder(common.NETWORK[swapInfoBuyer.sell_coin]) 
        txb.setVersion(1)
           
        let sum = 0;
        let needToSign = 0;
        for (let i=0; i<list.length; i++)
        {
            txb.addInput(Buffer.from(list[i].tx_hash, "hex").reverse(), list[i].tx_pos);
            sum += list[i].value;

            needToSign++;

            if (sum - orderSeller.order.sell_amount - fee > 0)
                break;
        }
        
        const change = sum - orderSeller.order.sell_amount - fee;

        if (change < 0) return {result: false, message: "insufficient funds"};

        txb.addOutput(orderSeller.addressBTC.p2pkh.address, change.toFixed(0)*1);
        txb.addOutput(redeemScript.address, orderSeller.order.sell_amount.toFixed(0)*1);

        //const signatureHash = tx.hashForSignature(0, redeemScript, bitcoin.Transaction.SIGHASH_ALL);
        //const signature = bitcoin.script.signature.encode(ecPair.sign(signatureHash), bitcoin.Transaction.SIGHASH_ALL);
        
        for (let i=0; i<needToSign; i++)
            txb.sign(i, ecPair)

        const firstTransaction = txb.build();

        const swapTransactions = await getRefundAndSellTransactions(
            firstTransaction, redeemScript, orderSeller, swapInfoBuyer, sharedMoneroAddress, common.NETWORK[swapInfoBuyer.sell_coin])
        
        /*swapTransactions =  {
                result: true, 
                refundTx: txs.refundTx, 
                adaptor_context: {
                    privBuyerViewKey: swapInfoBuyer.privBuyerViewKey, 
                    privBuyerSpentKey: null, //wait the adaptor (t2) from signed sell transaction
                    privSellerViewKey: sellerDLEQ.privSellerViewKey,
                    privSellerSpentKey: orderSeller.swapContext.getSpentPair().priv,
                }
        }
        */
    
        if (!swapTransactions.result) throw new Error(swapTransactions.message)

        //g_InitOrders[swapInfoBuyer.orderUID]["rawTX_refund"] = swapTransactions.refundTx.toHex();
        //g_InitOrders[swapInfoBuyer.orderUID]["adaptor_context"] = swapTransactions.adaptor_context;

        g_Transactions[swapInfoBuyer.swapID] = {
            sell_coin: swapInfoBuyer.sell_coin,
            rawTX_refund: swapTransactions.refundTx.toHex(),
            adaptor_context: swapTransactions.adaptor_context,
            time: Date.now()
        }

        //WaitSellTransaction(g_Transactions[swapInfoBuyer.swapID], swapInfoBuyer.sell_coin)
        setTimeout(getRefund, 1000*60, swapInfoBuyer.swapID)

        return {
            result: true, 
            rawTX_first: firstTransaction.toHex(), 
            sharedMoneroAddress: sharedMoneroAddress.address,
        }
    }
    catch(e){
        return {result: false, message: e.message}
    }
}

async function getRefundAndSellTransactions(firstTransaction, redeemScript, orderSeller, swapInfoBuyer, sharedMoneroAddress, network)
{
    const fee = common.getFee(network);

    if (firstTransaction.outs[1].value*1 <= fee)
        return {result: false, message: "Too small amount: " + (firstTransaction.outs[1].value/100000000).toFixed(8)}

    const keys = utils.genKeysDLEQ(orderSeller.swapContext.getSpentPair().priv); //{pubBTC: pubKeyBTC, pubBTC_y: pubKeyBTC_y, pubXMR: pubKeyXMR, pubXMR_x: pubKeyXMR_x, s: s.toString("hex"), c: c.toString("hex")}
/*
    keys = {
        pubKeyBTC: pubKeyBTC, pubKeyBTC_y: pubKeyBTC_y,
        pubKeyXMR: pubKeyXMR, 
        s: s.toString("hex"), c: c.toString("hex")}

 */    
    //DEBUG CHECK//
    const pubKey1 = new BN(orderSeller.swapContext.getSpentPair().pub, "hex")
    const pubKey2 = new BN(keys.pubKeyXMR, "hex")
    if (orderSeller.swapContext.getSpentPair().pubBTC.substring(2) != keys.pubKeyBTC ||
        !pubKey1.eq(pubKey2)) throw new Error("Error at adaptor signature generation")

    if (!utils.checkKeysDLEQ(keys)) throw new Error("Error initial check DLEQ")
    //////////////
    
    let sellerDLEQ = {
        firstTransaction: {hash1: firstTransaction.getHash().toString("hex"), out1: firstTransaction.outs[1].value},
        publicRefundBTC: orderSeller.addressBTC.publicKey, // P_1 = <prefix> a G
        publicRefundAddress: orderSeller.addressBTC.p2pkh.address, // address for refund BTC
        pubSellerAdaptorKey: orderSeller.swapContext.getSpentPair().pubBTC, //adaptor public: T_1 = t_1 G
        pubSellerAdaptorKey_y: orderSeller.swapContext.getSpentPair().pubBTC_y,
        pubSellerSpentKey: orderSeller.swapContext.getSpentPair().pub,  //public spent XMR key: t_1 M
        privSellerViewKey: orderSeller.swapContext.getViewPair().priv, //private view XMR key: v_1
        sharedMoneroAddress: sharedMoneroAddress.address,
        DLEQ: {s: keys.s, c: keys.c}
    }

    try {
        const txs = {refundTx: new bitcoin.Transaction(network), sellTx: new bitcoin.Transaction(network)}
        txs.refundTx.version = txs.sellTx.version = 2;
        
        txs.refundTx.addInput(firstTransaction.getHash(), 1, common.REFUND_SEQUENCE);
        txs.sellTx.addInput(firstTransaction.getHash(), 1, common.SELL_SEQUENCE);

        txs.refundTx.addOutput(bitcoin.address.toOutputScript(orderSeller.addressBTC.p2pkh.address, network), firstTransaction.outs[1].value-fee)
        txs.sellTx.addOutput(bitcoin.address.toOutputScript(swapInfoBuyer.addressBuyerBTC, network), firstTransaction.outs[1].value-fee)
  
        const signatureHash_refund = txs.refundTx.hashForSignature(0, redeemScript.redeem.output, bitcoin.Transaction.SIGHASH_ALL);
        const signatureHash_sell = txs.sellTx.hashForSignature(0, redeemScript.redeem.output, bitcoin.Transaction.SIGHASH_ALL);

        sellerDLEQ["signatureHash_refund"] = signatureHash_refund.toString("hex");
        sellerDLEQ["signatureHash_sell"] = signatureHash_sell.toString("hex");


        const pubPointAdaptorT = secp256k1.curve.point(new BN(swapInfoBuyer.pubBuyerAdaptorKey.substring(2), "hex"), new BN(swapInfoBuyer.pubBuyerAdaptorKey_y, "hex"))

        const signatureAdaptorPart = common.CreateAtaptorSignature(signatureHash_sell, orderSeller.addressBTC.privateKey.toString("hex"), pubPointAdaptorT)
        
        ///////////////DEBUG ONLY CHECK//////////////////////////////
        
        /*const t2 = new BN(swapInfoBuyer.t2, "hex", "le"); //Buyer private adaptor

        const signatureAdaptorPart_check = common.CreateAtaptorSignature_check(signatureHash_sell, orderSeller.addressBTC.privateKey.toString("hex"), pubPointAdaptorT, t2)
        
        const _rT_x = new BN(signatureAdaptorPart.substring(0, 64), "hex");

        const _s_adaptor = new BN(signatureAdaptorPart.substring(64), "hex").mul(t2.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
       
        const _sig_a = Buffer.alloc(64);
        _rT_x.toArrayLike(Buffer).copy(_sig_a)        
        _s_adaptor.toArrayLike(Buffer).copy(_sig_a, 32)

        const _ecPair = multicoin.ECPair.fromPublicKey(Buffer.from(sellerDLEQ.publicRefundBTC, "hex"), { network: network })
        
        const _checked = _ecPair.verify(signatureHash_sell, _sig_a)

        if (!_checked) throw new Error("Seller sent invalid adaptor signature for sell transaction!")*/

        /////////////////////////////////////////////        
        sellerDLEQ["signatureAdaptorPart"] = signatureAdaptorPart; //adaptor signature for sell BTC


        const t1 = new BN(orderSeller.swapContext.getSpentPair().priv, "hex", "le"); //Seller private adaptor
        //sellerDLEQ["t1"] = orderSeller.swapContext.getSpentPair().priv

        const sign = utils.SignObject(sellerDLEQ, t1.toString("hex"))

        let adaptorSig = null;
        let lastError = ""
        for (let i=0; i<5; i++)
        {
            adaptorSig = await new Promise(ok => {
                return customP2P.SendMessage({
                    command: "getAdaptorSignatureFromBuyer", 
                    request: sign.message,
                    sign: sign.signature,
                    swapID: swapInfoBuyer.swapID}, ret => 
                {
                    try { 
                        return ok ( ret );
                    }
                    catch(e) { ok({result: false, message: e.message}) }
                });
        
            })
    
            if (!adaptorSig.result) 
            {
                lastError = adaptorSig.message || "Buyer retuned invalid answer for refund transaction!";
                continue;
            }
    
            /////////CHECK RETURNED ADAPTOR SIG//////////////////////////////
            if (signatureHash_refund.toString("hex") != adaptorSig.signatureHash_refund) 
            {
                lastError ="Buyer returned bad hash for refund transaction!"
                continue;
            }
            
    
            const s_adaptor = new BN(adaptorSig.signatureAdaptorPart.substring(64), "hex").mul(t1.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
            if (s_adaptor.gt(secp256k1.curve.n.div(new BN(2))))
            {
                lastError = "Buyer returned bad invalid S value for bitcoin transaction!"
                continue;
            }
            break;    
        }

        /////////CHECK RETURNED ADAPTOR SIG//////////////////////////////
        const s_adaptor = new BN(adaptorSig.signatureAdaptorPart.substring(64), "hex").mul(t1.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
        if (s_adaptor.gt(secp256k1.curve.n.div(new BN(2)))) throw new Error("Buyer returned bad invalid S value for bitcoin transaction!")

        const rT_x = new BN(adaptorSig.signatureAdaptorPart.substring(0, 64), "hex");
        
        const sig_a = Buffer.alloc(64);
        rT_x.toArrayLike(Buffer).copy(sig_a)        
        s_adaptor.toArrayLike(Buffer).copy(sig_a, 32)

        const ecPair = multicoin.ECPair.fromPublicKey(Buffer.from(swapInfoBuyer.publicGetBTC, "hex"), { network: network })
        
        const checked = ecPair.verify(signatureHash_refund, sig_a)

        if (!checked) throw new Error("Buyer returned invalid adaptor signature for refund transaction!")

        const privSellerSpentKey = new BN(adaptorSig.signatureAdaptorPart.substring(64), "hex").mul(new BN(s_adaptor).invm(secp256k1.curve.n)).umod(secp256k1.curve.n).toString("hex")
        if (privSellerSpentKey != t1.toString("hex")) throw new Error("Adaptor signature algorithm error")
        //////////////////////////////////////////////////

        if (sharedMoneroAddress.address != adaptorSig.sharedMoneroAddress)  throw new Error("Error at seller side: shared XMR address mismatch!")
        ////DEBUG CHECK XMR SPENT ADDRESS////////////
        /*const checkAddress = monero.GetAddressFromPrivateKeysAB(
            swapInfoBuyer.privBuyerViewKey, swapInfoBuyer.t2, 
            sellerDLEQ.privSellerViewKey, orderSeller.swapContext.getSpentPair().priv,
            orderSeller.swapContext.getSpentPair().pub, swapInfoBuyer.pubBuyerSpentKey    
        )
        if (checkAddress.address != sharedMoneroAddress.address) throw new Error("Error check address XMR")*/
        /////////////////////////////////////////////

        ///////Sign and compile Refund Transaction/////////////////////////
        const signature = bitcoin.script.signature.encode(sig_a, bitcoin.Transaction.SIGHASH_ALL);

        const redeemScriptSig = bitcoin.payments.p2sh({
            network: network,
            redeem: {
                network: network,
                input: bitcoin.script.compile([
                    signature, //signature for P2 (buyer publicGetBTC) public key
                    bitcoin.opcodes.OP_TRUE,
                    bitcoin.opcodes.OP_FALSE
                ]),
                output: redeemScript.redeem.output
            },
        }).input;

        txs.refundTx.setInputScript(0, redeemScriptSig);
        /////////////////////////////////////////////////////////////////////

        return {
            result: true, 
            refundTx: txs.refundTx, 
            adaptor_context: {
                privBuyerViewKey: swapInfoBuyer.privBuyerViewKey, 
                privBuyerSpentKey: null, //wait the adaptor (t2) from signed sell transaction t2 = swapInfo.getSpentPair().priv
                privSellerViewKey: sellerDLEQ.privSellerViewKey,
                privSellerSpentKey: orderSeller.swapContext.getSpentPair().priv,
            }
        }
      }
    catch(e) {
        return {result: false, message: e.message}
    }
}

async function getRefund (swapID)
{
/*
    g_Transactions[swapInfoBuyer.swapID] = {
        sell_coin: swapInfoBuyer.sell_coin,
        rawTX_refund: swapTransactions.refundTx.toHex(),
        adaptor_context: swapTransactions.adaptor_context,
        time: Date.now()
    }

*/  
    if (!g_Transactions[swapID])
        return;
        
    const ctx = g_Transactions[swapID];

    const txid = await common.broadcast(ctx.rawTX_refund, ctx.sell_coin)

    if (txid.length > 50)
        return; //Refund done

    setTimeout(getRefund, 1000*60*5, swapID)

}