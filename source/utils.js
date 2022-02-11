'use strict';

const g_crypto = require('crypto');
const sodium = require('sodium-universal')

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