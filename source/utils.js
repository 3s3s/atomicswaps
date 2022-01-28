'use strict';

const g_crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const fetch = require('node-fetch');
const Buffer = require('buffer').Buffer;
const code = bitcoin.opcodes;

let g_wsip = {};

exports.IsBockedAddress = function(ip)
{
  deleteOld();

  if (!g_wsip[ip]) 
    g_wsip[ip] = {lastTime: 0};
        
  if (Date.now() - g_wsip[ip].lastTime < 1000)
    return true; //Block the IP because to many requests. Should by no more than one request per second
            
  g_wsip[ip].lastTime = Date.now();

  return false; 

  function deleteOld()
  {
    //Clear memory from unused IP
    let newObject = {};
    for (let ip in g_wsip) 
    {
      if (Date.now() - g_wsip[ip].lastTime < 3600*1000)
        newObject[ip] = g_wsip[ip]
    }
    g_wsip = newObject;
  }
}

exports.Hash160 = function(arg)
{
  const str = arg+"";
  
  const buffer = str.length % 2 != 0 ? Buffer.from(str) : Buffer.from(str, "hex");
  return g_crypto.createHash("ripemd160").update(buffer).digest('hex')
}
exports.createUID = function()
{
  return exports.Hash160(Math.random()+Date.now())
}

let networks = {
  'tBTC' : {
      url: 'http://127.0.0.1:18332',
      user: 'rpc_btc_test',
      password: 'rpc_btc_password_test',
      name: 'Bitcoin',
      NETWORK: bitcoin.networks.testnet,
      segwit: true
  },
};

exports.getNetwork = function(network = "tBTC")
{
  return networks[network];
}
exports.updateNetwork = function(url, user, password, network = "tBTC")
{
  networks[network].url = url;
  networks[network].user = user;
  networks[network].password = password;
}

exports.sendRPC = function(method, params, network = "tBTC")
{
  const headers = {
      'Content-Type': 'text/plain',
      'Authorization': 'Basic ' + Buffer.from(networks[network].user + ':' + networks[network].password).toString('base64')
  }

  const body = '{"jsonrpc": "1.0", "id":"curltest", "method": "'+method+'", "params": '+params+' }';

  try {
    return fetch(networks[network].url, {
        method: 'post',
        headers: headers,
        body: body})
        .then(res => {
          if (res.status*1 < 400 || res.status*1 >= 500)
            return res.json();
          throw new Error("Connection error: "+res.statusText);
        })
        .catch(err => { return {error: true, message: err.message}});
  }
  catch(e) {
    return {error: true, message: e.message};
  }
        
  

}

exports.importaddress = function(address, label = "", network = "tBTC")
{
    return exports.sendRPC('importaddress', '["'+address+'", "'+label+'", false]', network);
}

exports.broadcast = function(hex, network = "tBTC")
{
    return exports.sendRPC('sendrawtransaction', '["'+hex+'"]', network);
}

exports.getrawtransaction = function(txid, network = "tBTC")
{
    return exports.sendRPC('getrawtransaction', '["'+txid+'", true]', network);
}

exports.listsinceblock = function(hash, network = "tBTC")
{
    return exports.sendRPC('listsinceblock', '["'+hash+'", 1, true]', network);
}

exports.unspents = function(address = "", conf = 0, maxconf = 9999999, network = "tBTC")
{
    const filter = address.length ? ', ["'+address+'"]' : "";

    return exports.sendRPC('listunspent', '['+conf+', '+maxconf+filter+']', network);
}

exports.height = function(network = "tBTC")
{
    return exports.sendRPC('getblockcount', '[]', network);
}

exports.getblockhash = function(height, network = "tBTC")
{
    return exports.sendRPC('getblockhash', '['+height+']', network);
}

exports.getwalletaddress = function(network = "tBTC")
{
  return new Promise(async ok => {
    const array = await exports.sendRPC("getaddressesbylabel", '["wallet"]', network);
    if (array && !array.error && array.result)
    {
      for (let key in array.result)
        return ok(key);
    }
    
    const address = await exports.getnewaddress("wallet");
    if (address && !address.error)
      return ok(address.result);
      
    return ok("");
    
  })
}

////////////////////////////////

exports.getbalance = function(network = "tBTC")
{
    return exports.sendRPC('getbalance', '["*"]', network);
}
exports.sendtoaddress = function(address, amount, network = "tBTC")
{
    return exports.sendRPC('sendtoaddress', '["'+address+'", '+1*amount.toFixed(7)+']', network);
}
exports.getnewaddress = function(label = "", type = "legacy", network = "tBTC")
{
    return exports.sendRPC('getnewaddress', '["'+label+'", "'+type+'"]', network);
}
exports.importprivkey = function(privkey, network = "tBTC")
{
    return exports.sendRPC('importprivkey', '["'+privkey+'", "generated", false]', network);
}

exports.GetSettings = function(key)
{
  return new Promise(ok => {

    chrome.storage.local.get([key], items => {
        ok(items[key])});

  });
}
exports.SetSettings = function(keyval)
{
  chrome.storage.local.set(keyval);
}