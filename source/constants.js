'use strict';

exports.SSL_options = typeof window === 'undefined' ? {
    key: require("fs").readFileSync(__dirname+"/server/ssl_cert/privkey.pem"),
    cert: require("fs").readFileSync(__dirname+"/server/ssl_cert/fullchain.pem")    
} : {}

exports.clientDHkeys = {
    pub: '16895966b80e97b23ee286076e1029bea10628ff', 
    sec: '478b23f2685c4e3693752614a90b51cdd98e2354',
    server_pub: '9c3bb3b99924a6207a1c5495e474da487226eb1d',
    G: "a;ljg@$BFB"
}

exports.SQLITE_PATH = __dirname+"/server/sqlite.db";


/*const order = {
    sell_amount: sell_amount, 
    buy_amount: buy_amount, 
    sell_coin: "tbtc", 
    p2pkh: address.p2pkh.hash.toString("hex"),
    buy_coin: buy_coin}*/

exports.dbTables = [
    {
       'name' : 'orders',
       'cols' : [
           ['uid', 'TEXT UNIQUE PRIMARY KEY'],
           ['time', 'INTEGER'],
           ['sell_amount', 'TEXT'],
           ['buy_amount', 'TEXT'],
           ['sell_coin', 'TEXT'],
           ['seller_pubkey', 'TEXT'],
           ['buy_coin', 'TEXT'],
           ['json', 'TEXT'],
           ['active', 'INTEGER']
         ]
    },
]; 

