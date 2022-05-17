// @ts-nocheck
'use strict';

const g_crypto = require('crypto');
const sodium = require('sodium-universal')
const dh = require('diffie-hellman/browser')
const g_constants = require("./constants")
const monero = require("./wallets/monero")

const BN = require('bn.js');
const elliptic = require('elliptic');
const EC = elliptic.ec
const EdDSA = elliptic.eddsa;
const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

const customP2P = require("./server/p2p/custom")
const p2p_orders = require("./server/p2p/orders")
const tab_orders = require("./browser/tab_orders")
const tbtc_utils = require("./wallets/bitcoin_test/utils")
const sellerBTC = require("./swap/sellerBTC")

let g_PASSWORD = "123";
exports.setPassword = function(password)
{
  g_PASSWORD = password;
}
exports.getPassword = function()
{
  return g_PASSWORD;
}

exports.getMnemonic = function()
{
  if (typeof window === 'undefined') return;

  const $ = require('jquery');

  return $("#wallet_seed").val();
}

exports.Hash160 = function(arg, encode = null)
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
  const diffiehellman = dh.createDiffieHellman(exports.Hash160(g_constants.clientDHkeys.G), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(g_constants.clientDHkeys.sec, "hex")
  diffiehellman.setPublicKey(g_constants.clientDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(g_constants.clientDHkeys.server_pub, "hex")).toString("hex");

  return exports.Encrypt(message, password);  
}

exports.ClientDH_Decrypt = function(message)
{
  const diffiehellman = dh.createDiffieHellman(exports.Hash160(g_constants.clientDHkeys.G), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(g_constants.clientDHkeys.sec, "hex")
  diffiehellman.setPublicKey(g_constants.clientDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(g_constants.clientDHkeys.server_pub, "hex")).toString("hex");

  return exports.Decrypt(message, password);  
}

exports.SwapLog = function(text, level, id, ctx)
{
  if (typeof window === 'undefined') return;

  tab_orders.SwapLog(text, level, id, ctx);
}

exports.ServerDH_Encrypt = function(message)
{
  if (typeof window !== 'undefined') return;

  const serverDHkeys = require("./private").serverDHkeys;

  const diffiehellman = dh.createDiffieHellman(exports.Hash160(serverDHkeys.G), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(serverDHkeys.sec, "hex")
  diffiehellman.setPublicKey(serverDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(serverDHkeys.client_pub, "hex")).toString("hex");

  return exports.Encrypt(message, password);  
}

exports.ServerDH_Decrypt = function(message)
{
  if (typeof window !== 'undefined') return;

  const serverDHkeys = require("./private").serverDHkeys;

  const diffiehellman = dh.createDiffieHellman(exports.Hash160(serverDHkeys.G), "hex", Buffer.from("02", "hex"));
  
  diffiehellman.setPrivateKey(serverDHkeys.sec, "hex")
  diffiehellman.setPublicKey(serverDHkeys.pub, "hex")
  
  const password = diffiehellman.computeSecret(Buffer.from(serverDHkeys.client_pub, "hex")).toString("hex");

  return exports.Decrypt(message, password);  
}

exports.GenerateDH_keys = function(seed)
{
  const diffiehellman1 = crypto.createDiffieHellman(utils.Hash160(seed), "hex", Buffer.from("02", "hex"));
  const diffiehellman2 = crypto.createDiffieHellman(utils.Hash160(seed), "hex", Buffer.from("02", "hex"))
    
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

  if (!!object["publicKey"]) 
  {
    console.log("Invalid object")
    throw new Error("SignObject failed: property publicKey already exist")
  }

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

exports.SaveOrderToDB = function(_order, uid, insertonly = false)
{
  if (uid == 'undefined' || typeof uid === 'undefined')
    return {result: false, message: "undefined message uid"}

  if (typeof window !== 'undefined')
    return SaveOrderToBrowserDB(_order, uid);

  g_constants.dbTables["orders"].Delete("time<"+(Date.now() - 10*60*1000))

  if (!_order.json)
    _order.json = JSON.stringify(_order)

  try {
    const check = JSON.parse(unescape(_order.json))
    if (!check.request || !check.sign)
      return {result: false, message: "Signature not found"};

    if (!exports.VerifySignature(check.request, check.sign))
        return {result: false, message: "Signature error"};
  }
  catch(e) {
    console.log(e);
    return {result: false, message: e.message};
  }

  const order = _order;

  return new Promise(async ok => {
    const exist = await g_constants.dbTables["orders"].Select("*", "uid='"+escape(uid)+"' ")
    if (exist && exist.length)
      return insertonly ? ok() : ok({result: true, orders: await exports.GetOrdersFromDB(), sell_coin: order.sell_coin, uid: uid});

    g_constants.dbTables["orders"].Insert(
        uid, 
        order.time, 
        order.sell_amount, 
        order.buy_amount, 
        order.sell_coin, 
        order.seller_pubkey,
        order.buy_coin,
        JSON.stringify(order),
        1, 
        async ret => {
          return insertonly ? ok() : ok({result: true, orders: await exports.GetOrdersFromDB(), sell_coin: order.sell_coin, uid: uid});
        })
  })

  function SaveOrderToBrowserDB(order, uid)
  {
    return {result: true, orders: [], sell_coin: order.sell_coin}
  }
}

exports.HandleListOrders = async function(params)
{
    try {
        return {result: true, orders: await exports.GetOrdersFromDB(), sell_coin: params.coin};
    }
    catch(e) {
        console.log(e);
        return null;
    }
}

exports.HandleInviteBuyer = async function(params)
{
  try {
    const check = exports.VerifySignature(params.request, params.sign)
    if (!check)
        return {result: false, message: "Signature error"};

    let _order = JSON.parse(params.request);
    _order["request"] = params.request;
    _order["sign"] = params.sign;
    
    const myOrder = p2p_orders.getMyOrder(_order["orderUID_buyer"]);

    if (myOrder == null) return null;

    const ret = await p2p_orders.InitBuyOrder(exports.getMnemonic(), _order.orderUID, _order.sell_coin, _order.seller_pubkey, _order.sell_amount, _order.buy_amount, _order.buy_coin) 

    await p2p_orders.DeleteOrder(_order["orderUID_buyer"], _order.buy_coin);

    return ret;
  }
  catch(e){
    console.log(e)
    return {result: false, message: e.message};
  }

}

exports.DeleteOrderFromDB = async function(params)
{
  if (typeof window !== 'undefined')
    return DeleteOrderFromBrowserDB(params)

  try {
      const check = exports.VerifySignature(params.request, params.sign)
      if (!check)
      {
          console.log("ERROR: DeleteOrderFromDB Signature error")
          return {result: false, message: "Signature error"};
      }

      const order = JSON.parse(params.request);

      g_constants.dbTables["orders"].Update("active=0", `uid='${escape(order.uid)}'`);

      return {result: true, orders: await exports.GetOrdersFromDB(), sell_coin: order.sell_coin};
  }
  catch(e) {
      console.log(e);
      return null;
  }

  async function DeleteOrderFromBrowserDB(params)
  {
    const orders = await exports.GetOrdersFromDB();

    if (!orders[params.uid])
      return;

    orders[params.uid].active = 0;

    exports.SaveOrdersToDB(orders, params.sell_coin)

    tab_orders.UpdateOrdersTable()
  }
}

exports.RefreshOrderInDB = async function(params)
{
  if (typeof window !== 'undefined')  return null;

  try {
      const check = exports.VerifySignature(params.request, params.sign)
      if (!check)
          return {result: false, message: "Signature error"};

      let _order = JSON.parse(params.request);
      _order["request"] = params.request;
      _order["sign"] = params.sign;

      const order = _order;

      const exist = await g_constants.dbTables["orders"].Select("*", "uid='"+escape(order.uid)+"' ")
      if (!exist || !exist.length)
        return exports.SaveOrderToDB(order, order.uid, true);

      g_constants.dbTables["orders"].Update(`time=${escape(order.time)}, json='${escape(JSON.stringify(order))}'`, `seller_pubkey='${escape(order.seller_pubkey)}' AND uid='${escape(order.uid)}' AND active=1`);

      return {result: true, orders: await exports.GetOrdersFromDB(), sell_coin: order.sell_coin};
  }
  catch(e) {
      console.log(e);
      return null;
  }

}

/*    const order = {
        uid: orderUID,
        sell_coin: sell_coin,
        sell_amount: sell_amount,
        seller_pubkey: seller_pubkey,
        privViewKey: address.privViewKey,
        pubSpentKey: address.pubSpentKey,
        keys: keys
    }
}*/

exports.InitBuyOrder = function(params)
{
  try {
    const check = exports.VerifySignature(params.request, params.sign)
    if (!check)
        return {result: false, message: "Signature error"};

    let _order = JSON.parse(params.request);
    _order["request"] = params.request;
    _order["sign"] = params.sign;

    const swapInfo = _order;

    const myOrder = p2p_orders.getMyOrder(swapInfo.uid);

    if (myOrder == null) return null;

    if (swapInfo.sell_coin == "tbtc")
      return sellerBTC.InitBuyOrder(myOrder, swapInfo);

    return {result: true};
  }
  catch(e) {
      console.log(e);
      return null;
  }

}

exports.getOrdersFromP2P = function(coin, callback)
{
  return customP2P.SendMessage({
        command: "listOrders", 
        coin: coin}, callback);
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

exports.GetOrdersFromDB = async function()
{
  if (typeof window !== 'undefined')
    return GetOrdersFromBrowserDB();

  g_constants.dbTables["orders"].Delete("time<"+(Date.now() - 10*60*1000));

  const rows = await g_constants.dbTables["orders"].Select("*", `active=1`, "ORDER BY sell_amount DESC LIMIT 100")

  return rows;

  function GetOrdersFromBrowserDB()
  {
    let ret = {};

    let allOrders = {};
    for(let key in localStorage) 
    {
        if (key.indexOf("orders_") == 0)
        {
          const orders = exports.storage.getItem(key);
          for (let k in orders)
            allOrders[k] = orders[k]
        }
    }  

    const orders = allOrders; //exports.storage.getItem("orders_"+sell_coin);
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

exports.genKeysDLEQ = function(privKey)
{
    const privateKey = new BN(privKey, "hex", "le")

    const pubKeyBTC = secp256k1.curve.g.mul(privateKey).getX().toString("hex");
    const pubKeyBTC_y = secp256k1.curve.g.mul(privateKey).getY().toString("hex");
    const pubKeyXMR = elliptic.utils.toHex(ed25519.encodePoint(ed25519.curve.g.mul(privateKey)))

    const k = secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n)

    const A = secp256k1.curve.g.mul(k).getX().toString("hex");
    const B = elliptic.utils.toHex(ed25519.encodePoint(ed25519.curve.g.mul(k)));
    
    const c = new BN(exports.Hash256(A + B + pubKeyBTC + pubKeyXMR), "hex");

    const s = k.sub(c.mul(privateKey));
    
    return {
      pubKeyBTC: pubKeyBTC, pubKeyBTC_y: pubKeyBTC_y,
      pubKeyXMR: pubKeyXMR, 
      s: s.toString("hex"), c: c.toString("hex")}
    
    /*const pubKeyBTC = secp256k1.curve.g.mul(privateKey).getX().toString("hex");
    const pubKeyBTC_y = secp256k1.curve.g.mul(privateKey).getY().toString("hex");
    const pubKeyXMR = ed25519.curve.g.mul(privateKey).getY().toString("hex");
    const pubKeyXMR_x = ed25519.curve.g.mul(privateKey).getX().toString("hex");
    
    const k = secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n)

    const A = secp256k1.curve.g.mul(k).getX().toString("hex");
    const B = ed25519.curve.g.mul(k).getY().toString("hex");

    const c = new BN(exports.Hash256(A + B + pubKeyBTC + pubKeyXMR), "hex");

    const s = k.sub(c.mul(privateKey));

    return {
      pubBTC: pubKeyBTC, pubBTC_y: pubKeyBTC_y, 
      pubXMR: pubKeyXMR, pubXMR_x: pubKeyXMR_x, 
      s: s.toString("hex"), c: c.toString("hex")}*/
}

exports.checkKeysDLEQ = function(keys)
{
    const s1 = (new BN(keys.s, "hex")).umod(secp256k1.curve.n)
    const s2 = (new BN(keys.s, "hex")).umod(ed25519.curve.n)

    const pointBTC = secp256k1.curve.point(new BN(keys.pubKeyBTC, "hex"), new BN(keys.pubKeyBTC_y, "hex"))
    const pointXMR = ed25519.decodePoint(elliptic.utils.parseBytes(keys.pubKeyXMR))
    //const pointBTC = secp256k1.curve.point(new BN(keys.pubBTC, "hex"), new BN(keys.pubBTC_y, "hex"))
    //const pointXMR = ed25519.curve.point(new BN(keys.pubXMR_x, "hex"), new BN(keys.pubXMR, "hex"))

    const cY = pointBTC.mul(new BN(keys.c, "hex"));
    const cZ = pointXMR.mul(new BN(keys.c, "hex"));

    const A_ = secp256k1.curve.g.mul(s1).add(cY).getX().toString("hex")
    const B_ = elliptic.utils.toHex(ed25519.encodePoint(ed25519.curve.g.mul(s2).add(cZ)))
    //const A_ = secp256k1.curve.g.mul(s1).add(cY).getX().toString("hex")
    //const B_ = ed25519.curve.g.mul(s2).add(cZ).getY().toString("hex")

    return (keys.c == (new BN(exports.Hash256(A_ + B_ + keys.pubKeyBTC + keys.pubKeyXMR), "hex")).toString("hex"));
}

exports.SaveObjectToDB = function(jsObject, name)
{
  const text = JSON.stringify(jsObject);
  const encrypted = exports.Encrypt(text, exports.getPassword())

  if (typeof window !== 'undefined')
    return exports.storage.setItem(name, {encrypted: encrypted});

}
exports.GetObjectFromDB = function(name)
{
  if (typeof window !== 'undefined')
  {
    const item = exports.storage.getItem(name);
    if (!item)
      return null;
      
    if (!!item.encrypted)
    {
      try {
        return JSON.parse(exports.Decrypt(item.encrypted, exports.getPassword()))
      }
      catch(e) {
        return null
      }
    }
  }

  return null;
}


exports.DeleteObjectFromDB = function(name)
{
  if (typeof window !== 'undefined')
    return exports.storage.deleteItem(name);

  return null;
}

exports.sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


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
  },
  deleteItem: function(key) {
    var stor;
    if (window.content != undefined)
        stor = window.content.localStorage;
    else
        stor = localStorage;

    stor.removeItem(key)
  }
};

