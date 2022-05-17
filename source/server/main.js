"use strict";
const g_constants = require("../constants")
const utils = require("../utils")

const customHandlers = {
    custom: require("./p2p/custom"),
    SSL_options: g_constants.SSL_options,
    seeders: ["82.118.22.155:10443"]
}

require("./database").Init();
// @ts-ignore
require("p2plib").StartServer(customHandlers);    

setInterval(() => {
    const sell_coins = ["tbtc"];

    for (let i=0; i<sell_coins.length; i++)
    {
        utils.getOrdersFromP2P(sell_coins[i], async result => {
            if (!result || result.result != true || result.sell_coin != sell_coins[i])
                return;

            utils.SaveOrdersToDB(result.orders, result.sell_coin)
        });
    }
}, 60*1000)

