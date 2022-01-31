'use strict';

const g_crypto = require('crypto');
const Buffer = require('buffer').Buffer;
const g_constants = require('./constants')

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

exports.GetPeersFromDB = function(WHERE)
{
  return new Promise(async ok => {
    if (typeof window === 'undefined')
      return ok(await g_constants.dbTables["peers"].Select("*", WHERE, "ORDER BY time DESC LIMIT 20"));

    let peers = exports.storage.getItem("saved_peers");
    if (!peers) peers = [];

    peers.sort((a, b) => {return b.time - a.time})

    ok(peers);
  })  
}

let g_LastSavedTime = 0;
exports.SavePeer = async function(peer, connected = true)
{
  if (Date.now() - g_LastSavedTime < 1000)
    return setTimeout(exports.SavePeer, 1000, peer, connected);

  g_LastSavedTime = Date.now();
  
  let peers = await exports.GetPeersFromDB();
  for (let i=0; i<peers.length; i++)
  {
    if (peers[i].address == peer)
    {
      if (connected)
        peers[i].time = g_LastSavedTime;

      if (typeof window === 'undefined')
        return g_constants.dbTables["peers"].Insert(peer, peers[i].time, err => {});
      else
        return exports.storage.setItem("saved_peers", peers);
    }
  }

  if (typeof window === 'undefined')
    return g_constants.dbTables["peers"].Insert(peer, g_LastSavedTime, err => {});

  peers.push({address: peer, time: g_LastSavedTime});

  peers.sort((a, b) => {return b.time - a.time})

  exports.storage.setItem("saved_peers", peers);
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
  }
};
