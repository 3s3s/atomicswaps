// @ts-nocheck
'use strict';

const utils = require("../../utils")
const orders = require("./orders.js")

const P2P = typeof p2p !== 'undefined' ? p2p : {on: function(){}, SendMessage: null}

exports.SendMessage = P2P.SendMessage;

P2P.on("electrum", async params => 
{
    let answer = null;
    if (params["coin"] == "tbtc")
        answer = await require("../../wallets/bitcoin_test/utils").Electrum(params)
    if (params["coin"] == "btc")
        answer = await require("../../wallets/bitcoin_main/utils").Electrum(params)

    return P2P.ProcessAnswer(params, answer)
})

P2P.on("monerod", async params => 
{
    let answer = null;
    if (params["coin"] == "txmr")
        answer = await require("../../wallets/monero_test/utils").Wallet(params)
    if (params["coin"] == "xmr")
        answer = await require("../../wallets/monero_main/utils").Wallet(params)

    return P2P.ProcessAnswer(params, answer)
})

P2P.on("usdxd", async params => 
{
    let answer = null;
    if (params["coin"] == "usdx")
        answer = await require("../../wallets/usdx/utils").Wallet(params)

    return P2P.ProcessAnswer(params, answer)
})

P2P.on("new_order", async params => 
{
    let answer = null;
    if (params["coin"] == "tbtc")
        answer = await require("../../wallets/bitcoin_test/orders").HandleCreateOrder(params)
    if (params["coin"] == "btc")
        answer = await require("../../wallets/bitcoin_main/orders").HandleCreateOrder(params)
    if (params["coin"] == "txmr")
        answer = await require("../../wallets/monero_test/orders").HandleCreateOrder(params)
    if (params["coin"] == "xmr")
        answer = await require("../../wallets/monero_main/orders").HandleCreateOrder(params)
    if (params["coin"] == "usdx")
        answer = await require("../../wallets/usdx/orders").HandleCreateOrder(params)

    return P2P.ProcessAnswer(params, answer)
})

P2P.on("listOrders", async params => 
{
    return P2P.ProcessAnswer(params, await utils.HandleListOrders(params))
})

P2P.on("InviteBuyer", async params => 
{
    return P2P.ProcessAnswer(params, await utils.HandleInviteBuyer(params))
})

P2P.on("deleteOrder", async params => 
{
    return P2P.ProcessAnswer(params, await utils.DeleteOrderFromDB(params))
})

P2P.on("refreshOrder", async params => 
{
    return P2P.ProcessAnswer(params, await utils.RefreshOrderInDB(params))
})

P2P.on("InitBuyOrder", async params => 
{
    return P2P.ProcessAnswer(params, await utils.InitBuyOrder(params))
})

P2P.on("getAdaptorSignatureFromBuyer", params => 
{
    return P2P.ProcessAnswer(params, orders.getAdaptorSignatureFromBuyer(params))
})


P2P.on("getSwapTransactionFromBuyer", async params => 
{
    return P2P.ProcessAnswer(params, await orders.getSwapTransactionFromBuyer(params))
})

P2P.on("answer", params => 
{
    if (params.values)
    {
        params.values = params.serverKey && params.serverKey == require("../../constants").clientDHkeys.server_pub ? 
            require("../../utils").ClientDH_Decrypt(params.values) : params.values;
    }
    
    return P2P.ProcessAnswer(params)
})
