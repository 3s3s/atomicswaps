'use strict';

const g_crypto = require('crypto');
const sodium = require('sodium-universal')
const dh = require('diffie-hellman/browser')
const g_constants = require("./constants")

const customP2P = require("./server/p2p/custom")


exports.Hash160 = function(arg, encode = "hex")
{
  const str = arg+"";
  
  const buffer = encode == "hex" ? Buffer.from(str, "hex") : Buffer.from(str);

  return g_crypto.createHash("ripemd160").update(buffer).digest('hex')
}
exports.Hash256 = function(arg, encode = "hex", reverse = false)
{
  const str = arg+"";
  
  const buffer = encode == "hex" ? Buffer.from(str, "hex") : Buffer.from(str);

  if (reverse)
    return g_crypto.createHash("sha256").update(buffer).digest().reverse().toString("hex")
    
  return g_crypto.createHash("sha256").update(buffer).digest('hex')
}

exports.Encrypt = function(text, password)
{
  if (password.length < 2) throw new Error("too short password");
  
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES, 0);   
  const MESSAGE = Buffer.from(text);
  let key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);

  sodium.crypto_generichash(key, Buffer.from(password));

  let ciphertext = Buffer.alloc(MESSAGE.length + sodium.crypto_secretbox_MACBYTES);

  sodium.crypto_secretbox_easy(ciphertext, MESSAGE, nonce, key);
  ////////////////////////////////////////////////////////////////////////////
  /*let message = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES);

  sodium.crypto_secretbox_open_easy(message, ciphertext, nonce, key);*/
  ////////////////////////////////////////////////////////////////////////////

  if (exports.Decrypt(ciphertext.toString('hex'), password) != text) throw new Error("Encrypt error")

  return ciphertext.toString('hex');
}

exports.Decrypt = function(text, password)
{
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES, 0);  
  const ciphertext = Buffer.from(text, 'hex');
  let key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES); 

  sodium.crypto_generichash(key, Buffer.from(password));
  
  let message = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES);

  sodium.crypto_secretbox_open_easy(message, ciphertext, nonce, key);

  return message.toString();
}

exports.ClientDH_Encrypt = function(message)
{
  const diffiehellman = dh.createDiffieHellman(exports.Hash160(g_constants.clientDHkeys.G, ""), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(g_constants.clientDHkeys.sec, "hex")
  diffiehellman.setPublicKey(g_constants.clientDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(g_constants.clientDHkeys.server_pub, "hex")).toString("hex");

  return exports.Encrypt(message, password);  
}

exports.ClientDH_Decrypt = function(message)
{
  const diffiehellman = dh.createDiffieHellman(exports.Hash160(g_constants.clientDHkeys.G, ""), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(g_constants.clientDHkeys.sec, "hex")
  diffiehellman.setPublicKey(g_constants.clientDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(g_constants.clientDHkeys.server_pub, "hex")).toString("hex");

  return exports.Decrypt(message, password);  
}

exports.ServerDH_Encrypt = function(message)
{
  if (typeof window !== 'undefined') return;

  const serverDHkeys = require("./private").serverDHkeys;

  const diffiehellman = dh.createDiffieHellman(exports.Hash160(serverDHkeys.G, ""), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(serverDHkeys.sec, "hex")
  diffiehellman.setPublicKey(serverDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(serverDHkeys.client_pub, "hex")).toString("hex");

  return exports.Encrypt(message, password);  
}

exports.ServerDH_Decrypt = function(message)
{
  if (typeof window !== 'undefined') return;

  const serverDHkeys = require("./private").serverDHkeys;

  const diffiehellman = dh.createDiffieHellman(exports.Hash160(serverDHkeys.G, ""), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(serverDHkeys.sec, "hex")
  diffiehellman.setPublicKey(serverDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(serverDHkeys.client_pub, "hex")).toString("hex");

  return exports.Decrypt(message, password);  
}

exports.GenerateDH_keys = function(seed)
{
  const diffiehellman1 = crypto.createDiffieHellman(utils.Hash160(seed, ""), "hex", Buffer.from("02", "hex"));
  const diffiehellman2 = crypto.createDiffieHellman(utils.Hash160(seed, ""), "hex", Buffer.from("02", "hex"))
    
  // Generating keys
  diffiehellman1.generateKeys("hex");
  diffiehellman2.generateKeys("hex");

  const keys1 = {pub: diffiehellmangrp1.getPublicKey("hex"), priv: diffiehellmangrp1.getPrivateKey("hex")}
  const keys2 = {pub: diffiehellmangrp2.getPublicKey("hex"), priv: diffiehellmangrp2.getPrivateKey("hex"), prime: diffiehellmangrp1.getPrime("hex"), gen: diffiehellmangrp1.getGenerator("hex")}

  return {keys1: keys1, keys2: keys2}
}

exports.SignObject = function(object, privateSeed)
{
  let sig = Buffer.alloc(sodium.crypto_sign_BYTES)
  let pk = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  let sk = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  
  sodium.crypto_sign_seed_keypair(pk, sk, privateSeed)

  object["publicKey"] = pk.toString("hex");
  
  const message = JSON.stringify(object);

  sodium.crypto_sign_detached(sig, Buffer.from(message), sk)

  return {message: message, signature: sig.toString("hex")}    
}

exports.VerifySignature = function(message, signature)
{
  try {
    const object = JSON.parse(message);
    const pk = Buffer.from(object.publicKey, "hex");

    return sodium.crypto_sign_verify_detached(Buffer.from(signature, "hex"), Buffer.from(message), pk)
  }
  catch(e) {
    console.log(e)
    return false;
  }
}

/*exports.dbTables = [
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
]; */

exports.SaveOrderToDB = function(order, uid, insertonly = false)
{
  if (typeof window !== 'undefined')
    return SaveOrderToBrowserDB(order, uid);

  g_constants.dbTables["orders"].Delete("time<"+(Date.now() - 10*60*1000))

  return new Promise(async ok => {
    const exist = await g_constants.dbTables["orders"].Select("*", "uid='"+escape(uid)+"' AND sell_coin='"+escape(order.sell_coin)+"'")
    if (exist && exist.length)
      return insertonly ? ok() : ok({result: true, orders: await exports.GetOrdersFromDB(order.sell_coin), sell_coin: order.sell_coin, uid: uid});

    g_constants.dbTables["orders"].Insert(
        uid, 
        Date.now(), 
        order.sell_amount, 
        order.buy_amount, 
        order.sell_coin, 
        order.seller_pubkey,
        order.buy_coin,
        JSON.stringify(order),
        1, 
        async ret => {
          return insertonly ? ok() : ok({result: true, orders: await exports.GetOrdersFromDB(order.sell_coin), sell_coin: order.sell_coin, uid: uid});
        })
  })

  function SaveOrderToBrowserDB(order, uid)
  {
    return {result: true, orders: [], sell_coin: order.sell_coin}
  }
}

exports.DeleteOrderFromDB = async function(params)
{
  if (typeof window !== 'undefined')  return null;

  try {
      const check = exports.VerifySignature(params.request, params.sign)
      if (!check)
          return {result: false, message: "Signature error"};

      const order = JSON.parse(params.request);

      g_constants.dbTables["orders"].Update("active=0", `seller_pubkey='${escape(order.seller_pubkey)}' AND uid='${escape(order.uid)}'`);

      return {result: true, orders: await exports.GetOrdersFromDB(order.sell_coin), sell_coin: order.sell_coin};
  }
  catch(e) {
      console.log(e);
      return null;
  }
}

exports.RefreshOrderInDB = async function(params)
{
  if (typeof window !== 'undefined')  return null;

  try {
      const check = exports.VerifySignature(params.request, params.sign)
      if (!check)
          return {result: false, message: "Signature error"};

      const order = JSON.parse(params.request);

      g_constants.dbTables["orders"].Update(`time=${Date.now()}`, `seller_pubkey='${escape(order.seller_pubkey)}' AND uid='${escape(order.uid)}' AND active=1`);

      return {result: true, orders: await exports.GetOrdersFromDB(order.sell_coin), sell_coin: order.sell_coin};
  }
  catch(e) {
      console.log(e);
      return null;
  }

}

exports.getOrdersFromP2P = function(coin)
{
    return new Promise(ok => {
        return customP2P.SendMessage({
            command: "listOrders", 
            coin: coin}, result => 
        {
            try { ok( result ) }
            catch(e) { ok({result: false, message: e.message}) }
        });
    })
}

exports.SaveOrdersToDB = function(objOrders, sell_coin)
{
  if (typeof window !== 'undefined')
    return SaveOrdersToBrowserDB(objOrders, sell_coin);

  for (let key in objOrders)
    exports.SaveOrderToDB(objOrders[key], objOrders[key].uid, true)

  function SaveOrdersToBrowserDB(objOrders, sell_coin)
  {
    exports.storage.setItem("orders_"+sell_coin, objOrders);
  }
}

exports.GetOrdersFromDB = async function(sell_coin)
{
  if (typeof window !== 'undefined')
    return GetOrdersFromBrowserDB(sell_coin);

  g_constants.dbTables["orders"].Delete("time<"+(Date.now() - 10*60*1000));

  const rows = await g_constants.dbTables["orders"].Select("*", "sell_coin='"+escape(sell_coin)+"' AND active=1", "ORDER BY sell_amount DESC LIMIT 100")

  return rows;

  function GetOrdersFromBrowserDB(sell_coin)
  {
    let ret = {};

    const orders = exports.storage.getItem("orders_"+sell_coin);
    if (!orders) return ret;

    for (let key in orders)
    {
      if (orders[key].time < Date.now() - 60*10*1000)
        continue;

      ret[key] = orders[key];
    }

    return ret;
  }
}

/*exports.UpdateOrderTime = async function(orderID)
{
  if (typeof window !== 'undefined')
    return;

  const exist = await g_constants.dbTables["orders"].Select("*", "uid='"+escape(orderID)+"'")
  if (!exist || exist.length != 1)
    return;

  g_constants.dbTables["orders"].Insert(
        exist[0].uid, 
        Date.now(), 
        exist[0].sell_amount, 
        exist[0].buy_amount, 
        exist[0].sell_coin, 
        exist[0].seller_pubkey,
        exist[0].buy_coin,
        exist[0].json,
        exist[0].active, 
        async ret => {})
}

/*exports.DeleteOrder = async function(orderID)
{
  if (typeof window !== 'undefined')
    return;

  const exist = await g_constants.dbTables["orders"].Select("*", "uid='"+escape(orderID)+"'")
  if (!exist || exist.length != 1)
    return;

  g_constants.dbTables["orders"].Insert(
        exist[0].uid, 
        Date.now(), 
        exist[0].sell_amount, 
        exist[0].buy_amount, 
        exist[0].sell_coin, 
        exist[0].seller_pubkey,
        exist[0].buy_coin,
        exist[0].json,
        0, 
        async ret => {})
}*/

exports.storage = {
  getItem : function(key) {
      var stor;
      if (window.content != undefined)
          stor = window.content.localStorage;
      else
          stor = localStorage;
  
      var str = stor.getItem(key);
      if (str == undefined)
          return null;
      
      try {
          return JSON.parse(str);
      }
      catch(e) {
          return null;
      }
  },
  setItem : function(key, value) {
      var stor;
      if (window.content != undefined)
          stor = window.content.localStorage;
      else
          stor = localStorage;
  
    stor.setItem(key, JSON.stringify(value));
  }
};