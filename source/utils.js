'use strict';

const g_crypto = require('crypto');
const Buffer = require('buffer').Buffer;

let g_wsip = {};

exports.IsBockedAddress = function(ip)
{
  deleteOld();

  if (!g_wsip[ip]) 
    g_wsip[ip] = {lastTime: 0};
        
  if (Date.now() - g_wsip[ip].lastTime < 1000)
    return true; //Block the IP because to many requests. Should by no more than one request per second
            
  if (ip.indexOf("127.0.0.1") > 0 || ip.indexOf(require("ip").address()) > 0)
      return true;
  
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