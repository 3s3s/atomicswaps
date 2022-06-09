// @ts-nocheck
"use strict";
const BN = require('bn.js');
const EC = require('elliptic').ec
const EdDSA = require('elliptic').eddsa;

const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

const utils = require("../utils")
const monero = require("./monero")

class SwapContext {
    #KeyPairXMR_view = monero.KeyPair(secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n), true);
    #KeyPairXMR_spent = monero.KeyPair(secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n), true);
    constructor(network, seedString = null) 
    {
        if (seedString == null)
            return;

        const address = monero.GetAddressFromString(seedString, network);

        this.#KeyPairXMR_view = monero.KeyPair(Buffer.from(address.privViewKey, "hex"))
        this.#KeyPairXMR_spent = monero.KeyPair(Buffer.from(address.privSpentKey, "hex"))       
    }
    getViewPair()
    {
        return {
            priv: this.#KeyPairXMR_view.getPrivateKey().toString("hex"), 
            pub: this.#KeyPairXMR_view.getPublicKey().toString("hex")
        }
    }
    getSpentPair()
    {
        const privXMR = this.#KeyPairXMR_spent.getPrivateKey();
        const pubXMR = this.#KeyPairXMR_spent.getPublicKey();
        const pubBTC = secp256k1.curve.g.mul(new BN(privXMR, "le"));

        const preffix_compress = pubBTC.getY().umod(new BN(2)).toString() == "0" ? "02" : "03"

        return {
            priv: privXMR.toString("hex"), 
            pub: pubXMR.toString("hex"),
            pubBTC: preffix_compress + pubBTC.getX().toString("hex"),
            pubBTC_y: pubBTC.getY().toString("hex")
        }
    }
}

exports.InitContext = function(network = null, seedString = null) 
{
    if (network == null) throw new Error("ERROR: Swap context init with bad network")
    
    return new SwapContext(network, seedString);
}

exports.parseParams = function(params)
{
    if (typeof window !== 'undefined')  return null;

    let dhKey = null;
    try{
        dhKey = require("../private").serverDHkeys;
    }
    catch(e) {
    }

    if (!dhKey && (params.publicKey || params.serverKey))
        return null;

    if (params.publicKey && params.publicKey != dhKey.client_pub) return null;
    if (params.serverKey && params.serverKey != dhKey.pub) return null;

    try {
        const request = params.publicKey && params.serverKey ? utils.ServerDH_Decrypt(params.request) : params.request;
        return JSON.parse(request);
    }
    catch(e) {
        console.log(e)
        return null;
    }
}