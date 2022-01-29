'use strict';

const g_crypto = require('crypto');
const Buffer = require('buffer').Buffer;

let g_ipMessageSpeed = {}
exports.UpdateSpeed = function(ip)
{
  if (!g_ipMessageSpeed[ip])
    g_ipMessageSpeed[ip] = {firstTime: Date.now(), count: 1.0}

  g_ipMessageSpeed[ip].count++;
 
  //////////////////////////////////////////////////////////////////
  //Clear memory from old data
  let newest = {}
  for (let key in g_ipMessageSpeed)
  {
    if (g_ipMessageSpeed[key].prevTime > Date.now() - 3600*1000)
      newest[key] = g_ipMessageSpeed[key];
  }
  g_ipMessageSpeed = newest;
  //////////////////////////////////////////////////////////////////
}
exports.GetSpeed = function(ip)
{
  if (!g_ipMessageSpeed[ip])
    g_ipMessageSpeed[ip] = {firstTime: Date.now()-2000, count: 1.0}

  //Calculate average speed for messages (messages / sec)
  const speed = (1000.0*g_ipMessageSpeed[ip].count) / (Math.max(1, Date.now() - g_ipMessageSpeed[ip].firstTime));

  return speed;
}

exports.IsBockedAddress = function(ip)
{
  if (ip.indexOf("127.0.0.1") > 0 || ip.indexOf(require("ip").address()) > 0)
    return true;

  if (exports.GetSpeed(ip) > 100)
    return true;
  
  return false; 
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