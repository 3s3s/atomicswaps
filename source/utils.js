'use strict';

const g_crypto = require('crypto');
const sodium = require('sodium-universal')
const dh = require('diffie-hellman/browser')
const g_constants = require("./constants")

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