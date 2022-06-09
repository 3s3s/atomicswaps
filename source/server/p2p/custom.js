// @ts-nocheck
'use strict';

const utils = require("../../utils")
const orders = require("./orders.js")

exports.SendMessage = p2p.SendMessage;

p2p.on("electrum", async params => 
{
    let answer = null;
    if (params["coin"] == "tbtc")
        answer = await require("../../wallets/bitcoin_test/utils").Electrum(params)

    return p2p.ProcessAnswer(params, answer)
})

p2p.on("monerod", async params => 
{
    let answer = null;
    if (params["coin"] == "txmr")
        answer = await require("../../wallets/monero_test/utils").Wallet(params)

    return p2p.ProcessAnswer(params, answer)
})

p2p.on("usdxd", async params => 
{
    let answer = null;
    if (params["coin"] == "usdx")
        answer = await require("../../wallets/usdx/utils").Wallet(params)

    return p2p.ProcessAnswer(params, answer)
})

p2p.on("new_order", async params => 
{
    let answer = null;
    if (params["coin"] == "tbtc")
        answer = await require("../../wallets/bitcoin_test/orders").HandleCreateOrder(params)
    if (params["coin"] == "txmr")
        answer = await require("../../wallets/monero_test/orders").HandleCreateOrder(params)

    return p2p.ProcessAnswer(params, answer)
})

p2p.on("listOrders", async params => 
{
    return p2p.ProcessAnswer(params, await utils.HandleListOrders(params))
})

p2p.on("InviteBuyer", async params => 
{
    return p2p.ProcessAnswer(params, await utils.HandleInviteBuyer(params))
})

p2p.on("deleteOrder", async params => 
{
    return p2p.ProcessAnswer(params, await utils.DeleteOrderFromDB(params))
})

p2p.on("refreshOrder", async params => 
{
    return p2p.ProcessAnswer(params, await utils.RefreshOrderInDB(params))
})

p2p.on("InitBuyOrder", async params => 
{
    return p2p.ProcessAnswer(params, await utils.InitBuyOrder(params))
})

p2p.on("getAdaptorSignatureFromBuyer", params => 
{
    return p2p.ProcessAnswer(params, orders.getAdaptorSignatureFromBuyer(params))
})


p2p.on("getSwapTransactionFromBuyer", async params => 
{
    return p2p.ProcessAnswer(params, await orders.getSwapTransactionFromBuyer(params))
})

p2p.on("answer", params => 
{
    if (params.values)
    {
        params.values = params.serverKey && params.serverKey == require("../../constants").clientDHkeys.server_pub ? 
            require("../../utils").ClientDH_Decrypt(params.values) : params.values;
    }
    
    return p2p.ProcessAnswer(params)
})
