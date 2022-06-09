// @ts-nocheck
'use strict';
const BN = require('bn.js');
const tbtc_utils = require("../../wallets/bitcoin_test/utils")
const txmr_utils = require("../../wallets/monero_test/utils")
const usdx_utils = require("../../wallets/usdx/utils")
const monero = require("../../wallets/monero")
const utils = require("../../utils")
const customP2P = require("./custom")
const swap = require("../../wallets/common")
const buyerBTC = require("../../swap/buyerBTC")

let g_myOrders = {}

exports.getMyOrder = function(uid)
{
    if (!g_myOrders[uid])
        return null;

    return g_myOrders[uid];
}

exports.CreateOrder = async function(mnemonic, sell_amount, buy_amount, sell_coin = "tbtc", buy_coin = "txmr")
{    
    const addressBTC = tbtc_utils.GetAddress(mnemonic);
    const addressMonero = await txmr_utils.GetAddress(mnemonic)
    const orderMnemonic = utils.Hash160(mnemonic+Math.random());

    const swapContext = swap.InitContext(buy_coin, orderMnemonic);


    const order = {
        sell_amount: sell_amount, 
        buy_amount: buy_amount, 
        sell_coin: sell_coin, 
        seller_pubkey: addressBTC.p2pkh.hash.toString("hex"),
        time: Date.now(),
        buy_coin: buy_coin,
        addressMonero: {address: addressMonero.address, privViewKey: addressMonero.privViewKey},
        active: 1
    }

    const sign = utils.SignObject(order, addressBTC.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "new_order", 
            request: sign.message,
            sign: sign.signature,
            coin: sell_coin}, result => 
        {
            try { 
                result["seller_pubkey"] = order.seller_pubkey;

                g_myOrders[result.uid] = {order: order, addressBTC: addressBTC, swapContext: swapContext};

                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

exports.DeleteOrder = function(uid, coin = "tbtc")
{
    const myOrder = exports.getMyOrder(uid);
    if (!myOrder)   
        return;

    //const address = myOrder.address;
    //const seller_pubkey = address.p2pkh.hash.toString("hex");

    const order = {
        seller_pubkey: myOrder.order.seller_pubkey,
        uid: uid,
        active: 0
    }

    const sign = utils.SignObject(order, myOrder.addressBTC.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "deleteOrder", 
            request: sign.message,
            sign: sign.signature,
            coin: coin}, result => 
        {
            try { 
                if (result.result == true)
                {
                    utils.DeleteOrderFromDB({uid: uid, sell_coin: coin})
                    if (!!g_myOrders[uid])
                        delete g_myOrders[uid]
                }
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

exports.RefreshOrder = function(uid)
{
    const myOrder = exports.getMyOrder(uid);
    if (!myOrder)   
        return;

    //const address = myOrder.address;
    const orderOld = myOrder.order;

    const order = {
        sell_amount: orderOld.sell_amount, 
        buy_amount: orderOld.buy_amount, 
        sell_coin: orderOld.sell_coin, 
        seller_pubkey: orderOld.seller_pubkey,
        time: Date.now(),
        uid: uid,
        buy_coin: orderOld.buy_coin,
        active: 1
    }
    
    const sign = utils.SignObject(order, myOrder.addressBTC.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "refreshOrder", 
            request: sign.message,
            sign: sign.signature,
            coin: orderOld.sell_coin}, result => 
        {
            try { 
                if (!!g_myOrders[uid])
                    g_myOrders[uid].order.time = Date.now();
                    
                return ok( result )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

//Seller (who sell BTC and buy XMR)

exports.InviteBuyer = function(orderUID, orderUID_buyer)
{
    const myOrder = exports.getMyOrder(orderUID);
    if (!myOrder)   
        return {result: false, message: "Error: invalid orderUID"};

    let _order = myOrder.order;
    if (!!_order["publicKey"])
        delete _order["publicKey"];

    _order["orderUID"] = orderUID;
    _order["orderUID_buyer"] = orderUID_buyer;
 
    const sign = utils.SignObject(_order, myOrder.addressBTC.privateKey)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "InviteBuyer", 
            request: sign.message,
            sign: sign.signature}, async result => 
        {
            try { 
                return ok (result);
            }
            catch(e) { ok({result: false, message: e.message}) }
        });
    })
}

//Buyer (who buy BTC and sell XMR) init the order

let g_Swaps = {}

exports.InitBuyOrder = async function(mnemonic, orderUID, sell_coin, seller_pubkey, sell_amount, buy_amount, buy_coin)
{   
    const orderMnemonic = utils.Hash160(mnemonic+orderUID);

    if (!!g_Swaps[orderMnemonic]) return {result: false, message: "The order is already init"}
    
    g_Swaps[orderMnemonic] = swap.InitContext(buy_coin, orderMnemonic);
    
    const addressBuyerBTC = tbtc_utils.GetAddress(mnemonic);

    const keys = utils.genKeysDLEQ(g_Swaps[orderMnemonic].getSpentPair().priv); 
   
    //DEBUG CHECK//
    const pubKey1 = new BN(g_Swaps[orderMnemonic].getSpentPair().pub, "hex")
    const pubKey2 = new BN(keys.pubKeyXMR, "hex")
    if (g_Swaps[orderMnemonic].getSpentPair().pubBTC.substring(2) != keys.pubKeyBTC ||
        !pubKey1.eq(pubKey2)) throw new Error("Error at adaptor signature generation")

    if (!utils.checkKeysDLEQ(keys)) throw new Error("Error initial check DLEQ")

    //////////////

    let addressXMR = null;
    if (buy_coin == "txmr")
        addressXMR = (await txmr_utils.GetAddress(mnemonic))
    if (buy_coin == "xmr")
        addressXMR = (await xmr_utils.GetAddress(mnemonic))
    if (buy_coin == "usdx")
        addressXMR = (await usdx_utils.GetAddress(mnemonic))

    if (!addressXMR)
        return {result: false, message: "XMR network undefined"}

    const swapInfoBuyer = {
        uid: orderUID,
        swapID: orderMnemonic,
        sell_coin: sell_coin,
        sell_amount: sell_amount,
        buy_coin: buy_coin, 
        buy_amount, buy_amount,
        seller_pubkey: seller_pubkey,
        balanceCheck: {privViewKey: addressXMR.privViewKey, address: addressXMR.address},
        privBuyerViewKey: g_Swaps[orderMnemonic].getViewPair().priv, //private view XMR key: v_2 
        pubBuyerAdaptorKey: g_Swaps[orderMnemonic].getSpentPair().pubBTC, //adaptor public: T_2 = t_2 G
        pubBuyerAdaptorKey_y: g_Swaps[orderMnemonic].getSpentPair().pubBTC_y,
        pubBuyerSpentKey: g_Swaps[orderMnemonic].getSpentPair().pub,  //public spent XMR key: t_2 M
        addressBuyerBTC: addressBuyerBTC.p2pkh.address,
        publicGetBTC: addressBuyerBTC.publicKey, //P_2
        status: 10,
        DLEQ: {s: keys.s, c: keys.c}
    }
    g_Swaps[orderMnemonic]["swapInfoBuyer"] = swapInfoBuyer;
    g_Swaps[orderMnemonic]["addressBuyerBTC"] = addressBuyerBTC;
    
    const sign = utils.SignObject(swapInfoBuyer, g_Swaps[orderMnemonic].getSpentPair().priv)

    utils.SwapLog(`Init order: ${sell_coin} <=> ${buy_coin}`, "b", swapInfoBuyer.swapID, swapInfoBuyer)

    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "InitBuyOrder", 
            request: sign.message,
            sign: sign.signature,
            orderUID: orderUID}, result => 
        {
            /*
                return {
                    result: true, 
                    rawTX_first: firstTransaction.toHex(), 
                    sharedMoneroAddress: sharedMoneroAddress.address,
                }
            */
            try { 
                if (!result || result.result == false)
                    return ok (result);

                if (sell_coin == "tbtc")
                {
                    const ret = buyerBTC.ProcessBuyOrder(result, swapInfoBuyer, addressXMR)
                    return ok(ret);
                }
                return ok( {result: false, message: "bad sell coin: "+sell_coin} )
            }
            catch(e) { ok({result: false, message: e.message}) }
        });

    })
}

exports.getAdaptorSignatureFromBuyer = function(params)
{
  try {
    const check = utils.VerifySignature(params.request, params.sign)
    if (!check)
        return {result: false, message: "Signature error"};

    let _order = JSON.parse(params.request);
    _order["request"] = params.request;
    _order["sign"] = params.sign;

    const infoDLEQ = _order;

    if (!g_Swaps[params.swapID] || !g_Swaps[params.swapID].swapInfoBuyer) return null;

    if (g_Swaps[params.swapID].swapInfoBuyer.sell_coin == "tbtc")
    {
        const ret = buyerBTC.getAdaptorSignatureFromBuyer(infoDLEQ, g_Swaps[params.swapID]);
        if (ret.result == false && !!ret.stop)
        {
            if (g_Swaps[params.swapID])
                delete g_Swaps[params.swapID];
            utils.SwapLog("Swap stopped", "e", params.swapID)           
        }
        return ret;
    }

    return {result: true};
  }
  catch(e) {
      console.log(e);
      return null;
  }
}

exports.getSwapTransactionFromBuyer = function(params)
{
    try {
        const check = utils.VerifySignature(params.request, params.sign)
        if (!check)
            return {result: false, message: "Signature error"};
    
        let _order = JSON.parse(params.request);
        _order["request"] = params.request;
        _order["sign"] = params.sign;
    
        const infoAdaptor = _order;
    
        //if (!g_Swaps[params.swapID] || !g_Swaps[params.swapID].swapInfoBuyer) return null;
    
        //if (g_Swaps[params.swapID].swapInfoBuyer.sell_coin == "tbtc")
          return buyerBTC.getSwapTransactionFromBuyer(infoAdaptor, params.swapID); //g_Swaps[params.swapID]);
    
        //return {result: true};
      }
      catch(e) {
          console.log(e);
          return null;
      }
    
}
