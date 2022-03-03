"use strict";
const BN = require('bn.js');
const keccak256 = require('keccak256')
const bs58 = require('bs58')
const utils = require("../utils")

const _sodium = require('libsodium-wrappers-sumo');

const NETWORKS = {
    testnet: 0x35,
    stagenet: 24
}

let sodium;

//this is LE format (010000...0) !!!
const BASE_POINT_G =   new BN("5866666666666666666666666666666666666666666666666666666666666666", 16);

class KeyPair {
    #privateKey = Buffer.alloc(sodium.crypto_core_ed25519_SCALARBYTES);
    #publicKey = Buffer.alloc(sodium.crypto_core_ed25519_SCALARBYTES);
    constructor(privKey)
    {
        if (!privKey)
            return this.GenerateFromRandomPrivate()
        
        //Expecting the private key in LE format (1 = 0100...00)
        this.#privateKey = privKey;

        //The public key will be in LE format too (1 = 0100...00)
        this.#publicKey = KeyPair.getPublicFromInt(new BN(this.#privateKey))
    }

    getPrivateKey(invert = false) 
    {
        if (!invert)
            return this.#privateKey;
        return KeyPair.invertKey(this.#privateKey);
    }
    getPublicKey(invert = false) 
    {
        if (!invert)
            return this.#publicKey;
        return KeyPair.invertKey(this.#publicKey);
    }

    GenerateFromRandomPrivate() 
    {
        this.#privateKey = Buffer.from(sodium.crypto_core_ed25519_scalar_random("hex"), "hex");
        this.#publicKey = KeyPair.getPublicFromInt(new BN(this.#privateKey))
    }
    static getPublicFromInt(bigint, encode = null)
    {
        //bigint is called with LE format (1 = 0100...00) no need to convert
        const pskBuffer = (bigint.toArrayLike(Buffer, 0, 32));
    
        //let tmp = Buffer.alloc(sodium.crypto_core_ed25519_BYTES); 
     
        //sodium.crypto_scalarmult_ed25519_base_noclamp(tmp, pskBuffer)

        let tmp = sodium.crypto_scalarmult_ed25519_base_noclamp(pskBuffer, "hex")

        ////////////////////////CHECK IT HERE
        //let sum_pub = Buffer.alloc(sodium.crypto_core_ed25519_BYTES);
        //sodium.crypto_scalarmult_ed25519_noclamp(sum_pub, pskBuffer, BASE_POINT_G.toArrayLike(Buffer, 0, 32))
        let sum_pub = sodium.crypto_scalarmult_ed25519_noclamp(pskBuffer, BASE_POINT_G.toArrayLike(Buffer, 0, 32), "hex")
        if (sum_pub != tmp) throw new Error("sodium library error")
        ////////////////////////
        
        //tmp is returned in LE format (010000...0).
        if (!encode)
            return Buffer.from(tmp, "hex"); 
        return KeyPair.invertKey(Buffer.from(tmp, "hex")) 
    }
    static invertKey(buffer)
    {
        const bigint = new BN(buffer);
        return bigint.toArrayLike(Buffer, 'le', 32)
    }
}

class MoneroAddress {
    #network = NETWORKS.stagenet;
    #publicSpentKey = null;
    #publicViewKey = null;
    constructor(publicSpent, publicView, network = NETWORKS.stagenet)
    {
        this.#network = network;

        this.#publicSpentKey = publicSpent
        this.#publicViewKey = publicView
    }
    GetAddressHex()
    {
        const addressStart = Buffer.concat([Buffer.from([this.#network]), this.#publicSpentKey, this.#publicViewKey])
        const addressHash = keccak256(addressStart);

        const addressChecksum = Buffer.from([addressHash[0], addressHash[1], addressHash[2], addressHash[3]])

        return addressStart.toString('hex') + addressChecksum.toString('hex');
    }
    GetAddress58()
    {
        return MoneroAddress.b58_encode(this.GetAddressHex());
    }

    static b58_encode(hex)
    {
        const data = Buffer.from(hex, 'hex');
    
        let ret = ""
        for (let i=0; i<64; i+=8)
        {
            let block = bs58.encode(data.subarray(i, i+8));
            while (block.length < 11) 
                block = "1" + block;
    
            ret += block;
        }

        let lastBlock = bs58.encode(data.subarray(64, 69));
        while (lastBlock.length < 7)
            lastBlock = "1" + lastBlock;
    
        return ret + lastBlock;
    }  
    
    static GetAddressFromPairs(pairs, network = NETWORKS.stagenet)
    {
        return new MoneroAddress(pairs.spentPair.getPublicKey(), pairs.viewPair.getPublicKey(), network)
    }
}

exports.GetAddressFromString = async function(str)
{
    await _sodium.ready;
    sodium = _sodium;
     
    let privKey_view = Buffer.from(utils.Hash256(str), "hex");
    let privKey_spent = Buffer.from(utils.Hash256(privKey_view.toString("hex")), "hex");

    privKey_view[31] = 0;
    privKey_spent[31] = 0;

    let objKeyPairs = {viewPair: new KeyPair(privKey_view), spentPair: new KeyPair(privKey_spent)}

    const address = new MoneroAddress(objKeyPairs.spentPair.getPublicKey(), objKeyPairs.viewPair.getPublicKey())

    return {address: address.GetAddress58(), privViewKey: privKey_view.toString("hex"), privSpentKey: privKey_spent.toString("hex")};
}

exports.KeysToJSON = function(keyImages)
{
    let keyImagesJson = [];
    for (let keyImage of keyImages) 
    {
        keyImage["toJson"] = keyImage["toJson"].toString()

        keyImagesJson.push(keyImage);
    }
    return JSON.stringify(keyImagesJson);
}
exports.KeysFromJSON = function(keyImages_str)
{
    try {
        const keyImages = JSON.parse(keyImages_str);
        for (let keyImage of keyImages)
            keyImage["toJson"] = new Function("return function " + keyImage["toJson"])()

        return keyImages
    }
    catch(e) {
        console.log(e)
    }
    return [];
}

//Object.getPrototypeOf