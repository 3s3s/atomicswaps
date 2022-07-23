// @ts-nocheck
"use strict";
const BN = require('bn.js');
const keccak256 = require('keccak256')
const bs58 = require('bs58')
const utils = require("../utils")

const elliptic = require('elliptic');
const EC = elliptic.ec
const EdDSA = elliptic.eddsa;
const ed25519 = new EdDSA('ed25519');
const secp256k1 = new EC('secp256k1');

const NETWORKS = {
    testnet: 0x35,
    stagenet: 24,
    main: 0x12,
    usdx: 0xb4
}

const _sodium = require('libsodium-wrappers-sumo');
let sodium = null;

exports.initSodium = async function()
{
    if (!sodium)
    {
        await _sodium.ready;
        sodium = _sodium;
    }
}()

let g_CurrentNetwork = NETWORKS.stagenet;

exports.getNetwork = function()
{
    return g_CurrentNetwork;
}
exports.setNetwork = function(network)
{
    if (network == NETWORKS.testnet || 
        network == NETWORKS.stagenet ||
        network == NETWORKS.main ||
        network == NETWORKS.usdx)
    {
        g_CurrentNetwork = network;
    }
}


//this is LE format (010000...0) !!!
const BASE_POINT_G =   new BN("5866666666666666666666666666666666666666666666666666666666666666", 16);

class KeyPair {
    #privateKey = Buffer.alloc(sodium.crypto_core_ed25519_SCALARBYTES);
    #publicKey = Buffer.alloc(sodium.crypto_core_ed25519_SCALARBYTES);
    constructor(privKey, convertToLE = false)
    {
        if (!privKey)
            return this.GenerateFromRandomPrivate()
       
        //Expecting the private key in LE format (1 = 0100...00)
        this.#privateKey = convertToLE ? KeyPair.invertKey(privKey) : privKey;

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
        /*const pskBuffer = (bigint.toArrayLike(Buffer, 0, 32));
    
        let tmp = sodium.crypto_scalarmult_ed25519_base_noclamp(pskBuffer, "hex")
        //const tmp = exports.mulBase(bigint).getY().toString("hex")

        ////////////////////////CHECK IT HERE
        let sum_pub = sodium.crypto_scalarmult_ed25519_noclamp(pskBuffer, BASE_POINT_G.toArrayLike(Buffer, 0, 32), "hex")
        if (sum_pub != tmp) throw new Error("sodium library error")*/
        ////////////////////////
        
        const pskBuffer = (bigint.toArrayLike(Buffer, "le", 32));
        const tmp = elliptic.utils.toHex(ed25519.encodePoint(ed25519.curve.g.mul(new BN(pskBuffer))))
        //const tmp = exports.mulBase(new BN(pskBuffer))
 
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
exports.KeyPair = function(privateKeyHex)
{
    return new KeyPair(privateKeyHex)
}

/*exports.mulBase = function(bigint)
{
    const pskBuffer = (bigint.toArrayLike(Buffer, "le", 32));
    const tmpY = new BN(sodium.crypto_scalarmult_ed25519_base_noclamp(pskBuffer, "hex"), "hex")

    return tmpY.toString("hex")
}*/

class MoneroAddress {
    #network = exports.getNetwork();
    #publicSpentKey = null;
    #publicViewKey = null;
    constructor(publicSpent, publicView)
    {
        this.#publicSpentKey = publicSpent
        this.#publicViewKey = publicView
    }
    GetAddressHex()
    {
        const addressStart = this.#network < 0x80 ? 
            Buffer.concat([Buffer.from([this.#network]), this.#publicSpentKey, this.#publicViewKey]) :
            Buffer.concat([Buffer.from([this.#network]), Buffer.from([1]), this.#publicSpentKey, this.#publicViewKey]);
        
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

        const lastBytes = data.subarray(64);

        let lastBlock = bs58.encode(lastBytes);
        while (lastBlock.length < (lastBytes.length == 5 ? 7 : 9))
            lastBlock = "1" + lastBlock;
    
        return ret + lastBlock;
    }  
    
    static GetAddressFromPairs(pairs)
    {
        return new MoneroAddress(pairs.spentPair.getPublicKey(), pairs.viewPair.getPublicKey())
    }
}
exports.MoneroAddress = function(publicSpent, publicView)
{
    return new MoneroAddress(publicSpent, publicView);
}

exports.GetAddressFromPublicKeysAB = function(privAliceView, pubAliceSpent, privBobView, pubBobSpent)
{
    const viewPairA = new KeyPair(Buffer.from(privAliceView, "hex"));
    const viewPairB = new KeyPair(Buffer.from(privBobView, "hex"));
 
    const sumPrivView = sodium.crypto_core_ed25519_scalar_add(viewPairA.getPrivateKey(), viewPairB.getPrivateKey(), "hex"); //sumPrivateView = s_a + s_b
    //const sumPublicView = sodium.crypto_core_ed25519_scalar_add(viewPairA.getPublicKey(), viewPairB.getPublicKey(), "hex"); //sumPublicView = S_a + S_b
    /*const sumPublicView = ed25519.curve.pointFromY(viewPairA.getPublicKey(true)).add(ed25519.curve.pointFromY(viewPairB.getPublicKey(true)))
                            .getY().toArrayLike(Buffer, "le", 32).toString("hex");*/
    const sumPublicView = elliptic.utils.toHex(
        ed25519.encodePoint(
            ed25519.decodePoint(elliptic.utils.parseBytes(viewPairA.getPublicKey().toString("hex")))
            .add(
            ed25519.decodePoint(elliptic.utils.parseBytes(viewPairB.getPublicKey().toString("hex"))) 
            )
        )
    )
    
    const checkView = new KeyPair(Buffer.from(sumPrivView, "hex"));
    if (checkView.getPublicKey().toString("hex") != sumPublicView) throw new Error("shared address generator - failed (viewkey checking)")
  
    //const sumPublicSpent = sodium.crypto_core_ed25519_scalar_add(Buffer.from(pubAliceSpent, "hex"), Buffer.from(pubBobSpent, "hex"), "hex"); //sumPublicSpent

    /*const sumPublicSpent = ed25519.curve.pointFromY(Buffer.from(pubAliceSpent, "hex").reverse()).add(ed25519.curve.pointFromY(Buffer.from(pubBobSpent, "hex").reverse()))
                            .getY().toArrayLike(Buffer, "le", 32).toString("hex");*/


    const sumPublicSpent = elliptic.utils.toHex(
        ed25519.encodePoint(
            ed25519.decodePoint(elliptic.utils.parseBytes(pubAliceSpent))
            .add(
            ed25519.decodePoint(elliptic.utils.parseBytes(pubBobSpent)) 
            )
        )
    )


    const address = new MoneroAddress(Buffer.from(sumPublicSpent, "hex"), Buffer.from(sumPublicView, "hex"))

    return {
        address: address.GetAddress58(), 
        privViewKey: sumPrivView, 
        pubViewKey:  sumPublicView, 
        pubSpentKey: sumPublicSpent
    };
}

exports.GetAddressFromPrivateKeysAB = function(privAliceView, privAliceSpent, privBobView, privBobSpent)//, pubBuyerSpentKey, pubSellerSpentKey)
{
    const viewPairA = new KeyPair(Buffer.from(privAliceView, "hex"));
    const viewPairB = new KeyPair(Buffer.from(privBobView, "hex"));
    
    const spentPairA = new KeyPair(Buffer.from(privAliceSpent, "hex"));
    const spentPairB = new KeyPair(Buffer.from(privBobSpent, "hex"));
 
    const sumPrivView = sodium.crypto_core_ed25519_scalar_add(viewPairA.getPrivateKey(), viewPairB.getPrivateKey(), "hex"); //sumPrivateView = s_a + s_b
    //const sumPublicView = sodium.crypto_core_ed25519_add(viewPairA.getPublicKey(), viewPairB.getPublicKey(), "hex"); //sumPublicView = S_a + S_b

    //const sumPublicView = ed25519.curve.pointFromY(viewPairA.getPublicKey(true)).add(ed25519.curve.pointFromY(viewPairB.getPublicKey(true)))
    //                        .getY().toArrayLike(Buffer, "le", 32).toString("hex");
    const sumPublicView = elliptic.utils.toHex(
        ed25519.encodePoint(
            ed25519.decodePoint(elliptic.utils.parseBytes(viewPairA.getPublicKey().toString("hex")))
            .add(
            ed25519.decodePoint(elliptic.utils.parseBytes(viewPairB.getPublicKey().toString("hex"))) 
            )
        )
    )
    
    const checkView = new KeyPair(Buffer.from(sumPrivView, "hex"));
    if (checkView.getPublicKey().toString("hex") != sumPublicView) throw new Error("shared address generator - failed (viewkey checking)")
    
    const sumPrivSpent = sodium.crypto_core_ed25519_scalar_add(spentPairA.getPrivateKey(), spentPairB.getPrivateKey(), "hex"); //sumPrivateSpent
    //const sumPublicSpent = sodium.crypto_core_ed25519_add(spentPairA.getPublicKey(), spentPairB.getPublicKey(), "hex"); //sumPublicSpent 

    //const sumPublicSpent = ed25519.curve.pointFromY(spentPairA.getPublicKey(true)).add(ed25519.curve.pointFromY(spentPairB.getPublicKey(true)))
    //                        .getY().toArrayLike(Buffer, "le", 32).toString("hex");

    const sumPublicSpent = elliptic.utils.toHex(
        ed25519.encodePoint(
            ed25519.decodePoint(elliptic.utils.parseBytes(spentPairA.getPublicKey().toString("hex")))
            .add(
            ed25519.decodePoint(elliptic.utils.parseBytes(spentPairB.getPublicKey().toString("hex"))) 
            )
        )
    )
    const checkSpent = new KeyPair(Buffer.from(sumPrivSpent, "hex"));
    if (checkSpent.getPublicKey().toString("hex") != sumPublicSpent) throw new Error("shared address generator - failed (spentkey checking)")
    ////
    //const sumPublicSpent_check = sodium.crypto_core_ed25519_scalar_add(Buffer.from(pubBuyerSpentKey, "hex"), Buffer.from(pubSellerSpentKey, "hex"), "hex"); //sumPublicSpent
    ////
    const address = new MoneroAddress(Buffer.from(sumPublicSpent, "hex"), Buffer.from(sumPublicView, "hex"))

    return {
        address: address.GetAddress58(), 
        privViewKey: sumPrivView, 
        pubViewKey:  sumPublicView, 
        privSpentKey: sumPrivSpent,
        pubSpentKey: sumPublicSpent
    };
}

exports.GetAddressFromString = function(str, network = null)
{ 
    if (network == null)  
        return null;

    if (network == "stagenet" || network == "txmr")
        exports.setNetwork(NETWORKS.stagenet)
    if (network == "main" || network == "xmr" || network == "mainnet")
        exports.setNetwork(NETWORKS.main)
    if (network == "usdx")
        exports.setNetwork(NETWORKS.usdx)
        
    let privKey_view = Buffer.from(utils.Hash256(str), "hex");
    let privKey_spent = Buffer.from(utils.Hash256(privKey_view.toString("hex")), "hex");

    privKey_view[31] = 0;
    privKey_spent[31] = 0;
    //privKey_view[30] = 0;
    //privKey_spent[30] = 0;

    let objKeyPairs = {viewPair: new KeyPair(privKey_view), spentPair: new KeyPair(privKey_spent)}

    const address = new MoneroAddress(objKeyPairs.spentPair.getPublicKey(), objKeyPairs.viewPair.getPublicKey())

    return {
        address: address.GetAddress58(), 
        privViewKey: privKey_view.toString("hex"), 
        pubViewKey: objKeyPairs.viewPair.getPublicKey().toString("hex"), 
        privSpentKey: privKey_spent.toString("hex"),
        pubSpentKey: objKeyPairs.viewPair.getPublicKey().toString("hex")
    };
}

exports.KeyPairFromPrivate = function(privKey)
{
    return new KeyPair(privKey);
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