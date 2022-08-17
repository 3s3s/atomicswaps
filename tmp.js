
const utils = require("./source/utils")

const ret = utils.GenerateDH_keys("a;ljg@$BFB")

console.log(ret);


//const _sodium = require('libsodium-wrappers-sumo');
/*const monero = require("./source/wallets/monero")
const utils = require("./source/utils")
const EC = require('elliptic').ec

const multicoin = require("multicoinjs-lib");
const bitcoin = require("bitcoinjs-lib")*/

//const secp256k1 = new EC('secp256k1');//secp256k1.curve


//const BASE_POINT_M =   new BN("5866666666666666666666666666666666666666666666666666666666666666", 16);
//const M = ed25519.curve.pointFromY(ed25519.curve.g.y)
//const G = secp256k1.curve.pointFromX(secp256k1.curve.g.x)
//const n_BITCOIN = new BN("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", "hex")
//const n_MONERO =  new BN("1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed", "hex")

//const B_M_CHECK = new BN("46316835694926478169428394003475163141307993866256225615783033603165251855960", 10)

/*const BN = require('bn.js');
const EdDSA = require('elliptic').eddsa;
const ed25519 = new EdDSA('ed25519');
const _sodium = require('libsodium-wrappers-sumo');*/

/*monero.initSodium.then(ok => {
    const privKeyHex = "6220f3affaa568f554ca850f9374e7112c09af219976bb779f4fd8f297294900"
    const pair = monero.KeyPairFromPrivate(Buffer.from(privKeyHex, "hex"))
    // Create key pair from secret
    var key = ed25519.keyFromSecret('0000000000000000000000000000000000000000000000000000000000000001'); // hex string, array or Buffer
    var pub = key.getPublic()

    var yRecovered = ed25519.encodeInt(
        ed25519.decodePoint(key.pubBytes()).getY());

    console.log(pair.getPublicKey().toString("hex"))
})*/

/*(async() => {
  await _sodium.ready;
  const sodium = _sodium;
  
  const privKeyHex = "430b1e5999845a7f5434945d6b3ccf9724dad8181fc7cc26bd1d4bcffec6c30d"; //"6220f3affaa568f554ca850f9374e7112c09af219976bb779f4fd8f297294900"
  const tmp1 = sodium.crypto_scalarmult_ed25519_base_noclamp(Buffer.from(privKeyHex, "hex"), "hex")
  const tmp2 = ed25519.curve.g.mul(new BN(privKeyHex, "hex", "le")).getY().toArrayLike(Buffer, "le", 32).toString("hex")
  const tmp3 = require('elliptic').utils.toHex(ed25519.encodePoint(ed25519.curve.g.mul(new BN(privKeyHex, "hex", "le"))))
  const tmp4 = monero.KeyPairFromPrivate(Buffer.from(privKeyHex, "hex")).getPublicKey().toString("hex")

  console.log(tmp1)
  console.log(tmp2)
  console.log(tmp3)
  console.log(tmp4)
})()*/


/*
let sodium = null;
const initSodium = async function()
{
    if (!sodium)
    {
        await _sodium.ready;
        sodium = _sodium;
    }
    genKeysDLEQ("3190f957fd52b47a2ae5c28749baf3089684d7904cbbddbbcf276cf9cb942400")
}()

function genKeysDLEQ (privKey)
{
    const privateKey = new BN(privKey, "hex", "le")

    const pubKeyBTC = secp256k1.curve.g.mul(privateKey).getX().toString("hex");
    const pubKeyBTC_y = secp256k1.curve.g.mul(privateKey).getY().toString("hex");
    const pubKeyXMR = ed25519.curve.g.mul(privateKey).getY().toString("hex");
    const pubKeyXMR_x = ed25519.curve.g.mul(privateKey).getX().toString("hex");
    
    const k = secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n)

    const A = secp256k1.curve.g.mul(k).getX().toString("hex");
    const B = ed25519.curve.g.mul(k).getY().toString("hex");

    const c = new BN(utils.Hash256(A + B + pubKeyBTC + pubKeyXMR), "hex");

    const s = k.sub(c.mul(privateKey));

    const keys = {pubBTC: pubKeyBTC, pubBTC_y: pubKeyBTC_y, pubXMR: pubKeyXMR, pubXMR_x: pubKeyXMR_x, s: s.toString("hex"), c: c.toString("hex")}

    const s1 = (new BN(keys.s, "hex")).umod(secp256k1.curve.n)
    const s2 = (new BN(keys.s, "hex")).umod(ed25519.curve.n)

    const pointBTC = secp256k1.curve.point(new BN(keys.pubBTC, "hex"), new BN(keys.pubBTC_y, "hex"))
    const pointXMR = ed25519.curve.point(new BN(keys.pubXMR_x, "hex"), new BN(keys.pubXMR, "hex"))

    const cY = pointBTC.mul(new BN(keys.c, "hex"));
    const cZ = pointXMR.mul(new BN(keys.c, "hex"));

    const A_ = secp256k1.curve.g.mul(s1).add(cY).getX().toString("hex")
    const B_ = ed25519.curve.g.mul(s2).add(cZ).getY().toString("hex")

    return (keys.c == (new BN(utils.Hash256(A_ + B_ + keys.pubBTC + keys.pubXMR), "hex")).toString("hex"));
}


function getPublicFromInt(bigint, encode = null)
{
        //bigint is called with LE format (1 = 0100...00) no need to convert
        const pskBuffer = (bigint.toArrayLike(Buffer, 0, 32));
        const pskBuffer2 = (bigint.toArrayLike(Buffer, "le", 32));
    
        //let tmp = Buffer.alloc(sodium.crypto_core_ed25519_BYTES); 
        //let ttt = ed25519.curve.g.mul(new BN(pskBuffer2)).getY().toArrayLike(Buffer, "le", 32).toString("hex")
     
        //sodium.crypto_scalarmult_ed25519_base_noclamp(tmp, pskBuffer)

        let tmp = sodium.crypto_scalarmult_ed25519_base_noclamp(pskBuffer, "hex")

        //if (tmp != ttt.toString("hex")) throw new Error("Error at generating XMR public key ")

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

function genKeys(privKey)
{
    const privateKey = new BN(privKey, "hex")

    const pubKeyBTC = secp256k1.curve.g.mul(privateKey).getX().toString("hex");
    const pubKeyXMR = ed25519.curve.g.mul(privateKey).getY().toString("hex");
    
    const k = secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n)

    const A = secp256k1.curve.g.mul(k).getX().toString("hex");
    const B = ed25519.curve.g.mul(k).getY().toString("hex");

    const c = new BN(utils.Hash256(A + B + pubKeyBTC + pubKeyXMR), "hex");

    const s = k.sub(c.mul(privateKey)).toString("hex");

    return {pubBTC: pubKeyBTC, pubXMR: pubKeyXMR, s: s, c: c.toString("hex")}
}

function checkKeys(keys)
{
    const s1 = (new BN(keys.s, "hex")).umod(secp256k1.curve.n)
    const s2 = (new BN(keys.s, "hex")).umod(ed25519.curve.n)

    const pointBTC = secp256k1.curve.pointFromX(new BN(keys.pubBTC, "hex"))
    const pointXMR = ed25519.curve.pointFromY(new BN(keys.pubXMR, "hex"))

    const cY = pointBTC.mul(new BN(keys.c, "hex"));
    const cZ = pointXMR.mul(new BN(keys.c, "hex"));

    const A_ = secp256k1.curve.g.mul(s1).add(cY).getX().toString("hex")
    const B_ = ed25519.curve.g.mul(s2).add(cZ).getY().toString("hex")

    return (new BN(utils.Hash256(A_ + B_ + keys.pubBTC + keys.pubXMR), "hex")).toString("hex");
}

exports.GetAddressFromPublicKeysAB = function(privAliceView, pubAliceSpent, privBobView, pubBobSpent)
{
    const sumPrivView = sodium.crypto_core_ed25519_scalar_add(Buffer.from(privAliceView, "hex"), Buffer.from(privBobView, "hex"), "hex"); //sumPrivateView = s_a + s_b
    const sumPubView = sodium.crypto_core_ed25519_scalar_add(Buffer.from(pubAliceSpent, "hex"), Buffer.from(pubBobSpent, "hex"), "hex"); //sumPrivateView = s_a + s_b
 
    return {
        privViewKey: sumPrivView, 
        pubSpentKey: sumPubView
    };
}


const pr1 = "9cd1876fa33a257c03973e95191abd98f9d68b7d4e49178942065d55b1915a0a"
const pr2 = "9cd1876fa33a257c03973e95191abd98f9d68b7d4e49178942065d55b1915a0a"
const pr3 = "9cd1876fa33a257c03973e95191abd98f9d68b7d4e49178942065d55b1915a0a"
const pr4 = "9cd1876fa33a257c03973e95191abd98f9d68b7d4e49178942065d55b1915a0a"

monero.initSodium.then( ok => {
    //const addr = monero.GetAddressFromPrivateKeysAB(pr1, pr2, pr3, pr4)
    //const pair = monero.KeyPairFromPrivate(Buffer.from("6220f3affaa568f554ca850f9374e7112c09af219976bb779f4fd8f297294900", "hex"))

    require('libsodium-wrappers-sumo').ready.then(ok => {
        let tmp = sodium.crypto_scalarmult_ed25519_base_noclamp(Buffer.from("6220f3affaa568f554ca850f9374e7112c09af219976bb779f4fd8f297294900", "hex"), "hex")
    })
    console.log(pair.getPublicKey().toString("hex"))
});



function GetBitcoinPublic(x)
{
//    const keyPairBTC = new multicoin.ECPair.fromPrivateKey(Buffer.from(x, "hex"));
//    return keyPairBTC.publicKey.toString("hex").substring(2);
    const point = secp256k1.curve.g.mul(new BN(x, "hex"));
    return point.getX().toString("hex")
}
async function GetMoneroPublic(x)
{
    //if (!M.eq(ed25519.curve.g)) throw new Error("GetMoneroPublic failed because M != ed25519.curve.g")
    //const keyPairXMR = await monero.KeyPairFromPrivate(Buffer.from(x, "hex").reverse());
    //const check =  keyPairXMR.getPublicKey().reverse().toString("hex")
    const point = ed25519.curve.g.mul(new BN(x, "hex"));

    //if (check != point.y.toString("hex")) throw new Error("GetMoneroPublic failed")
    return point.getY().toString("hex")
}

//const k = "017e6e0ca17acf3f5f0a522c35fbabc2f59e8029bf5bab76d0611c48276a8700"
const priv1 = "005c99e13bcf1d8651fc37ea134a9fb02310883c92532e0ad859511510311100"
const priv2 = "005c88e13bcf1d8651fc37ea134a9fb02310883c92532e0ad859511510314f00"
const priv3 = "005c88e13bcf1d8651fc37ea134a9fb02310883c92532e0a1159511510314f00"

//const ONE = "0000000000000000000000000000000000000000000000000000000000000003"

//let estimate = 0;
async function test()
{
    //const t = B_M_CHECK.toString("hex")
    //const t2 = BASE_POINT_M.toString("hex")
    if (!sodium)
    {
        await _sodium.ready;
        sodium = _sodium;
    }

    let x = priv2;
    
    const keys = genKeys(x);
    const check = checkKeys(keys);

    if (keys.c == check)
        console.log("Proved!")

    let Y = GetBitcoinPublic(x);
    const Y_pointBTC = secp256k1.curve.pointFromX(Y)

    let Z = await GetMoneroPublic(x);
    const Z_pointXMR = ed25519.curve.pointFromY(Z)

    console.log("x = " + x);
    console.log("xG = Y = " + Y);

    console.log("xM = Z = " + Z +"\r\n***************")

    let k = secp256k1.genKeyPair().getPrivate().umod(ed25519.curve.n).toString("hex");

    let A = GetBitcoinPublic(k);
 
    let B = await GetMoneroPublic(k);

    let c = utils.Hash256(A+B+Y+Z); 
    
    const k_BN = new BN(k, "hex");
    const c_BN = new BN(c, "hex");
    const x_BN = new BN(x, "hex");

    const cx = c_BN.mul(x_BN)

    let s_BN = (k_BN.sub(cx)).umod(secp256k1.curve.n)
    let s2_BN = (k_BN.sub(cx)).umod(ed25519.curve.n)

    console.log("c = " + c)

    console.log("*****************************")

    const cY = Y_pointBTC.mul(c_BN);
    const cZ = Z_pointXMR.mul(c_BN);

    const A_ = secp256k1.curve.g.mul(s_BN).add(cY).getX().toString("hex")
    const B_ = ed25519.curve.g.mul(s2_BN).add(cZ).getY().toString("hex")

    let c_ = utils.Hash256(A_+B_+Y+Z); 
    console.log("c_ = " + c_)
 }

 function test2()
 {
    const m = "Message!";
    const H = (new BN(utils.Hash256(m), "hex")); //.umod(secp256k1.curve.n)

    const k = priv1; //new BN(priv1, "hex").toString("hex");
    const x = priv2; //new BN(priv2, "hex").toString("hex");

    const kx = new BN(k, "hex").mul(new BN(x, "hex")).umod(secp256k1.curve.n)

    const K = secp256k1.curve.g.mul(new BN(k, "hex"));

    const P1 = secp256k1.curve.g.mul(new BN(x, "hex"));
    const P2 = K.mul(new BN(x, "hex"));

    const P2_check = secp256k1.curve.g.mul(kx.toBuffer())

    if (P2.getX().toString("hex") != P2_check.getX().toString("hex")) throw new Error("Error: kxG != xK")

    const pairX = multicoin.ECPair.fromPrivateKey(Buffer.from(x, "hex"));
    const pairKX = multicoin.ECPair.fromPrivateKey(kx.toBuffer());

    const signatureX = pairX.sign(H.toBuffer())
    const signatureKX = pairKX.sign(H.toBuffer())

    const r = signatureX.slice(0, 31);
    const s = signatureX.slice(32, 63);
    const t = signatureKX.slice(0, 31);
    const s_ = signatureKX.slice(32, 63);

    //////////////////////////////////////
    /////(G t)_x mod n k ?= (G tk)_x mod n
    const c1 = secp256k1.curve.g.mul(new BN(t)).x.umod(secp256k1.curve.n).mul(new BN(k, "hex"))
    const c2 = secp256k1.curve.g.mul(new BN(t).mul(new BN(k, "hex"))).x.umod(secp256k1.curve.n)
    console.log("c1 = " + c1.toString("hex"))
    console.log("c2 = " + c2.toString("hex"))
    //////////////////////////////////////


    const tk = (new BN(t, "hex").mul(new BN(k, "hex"))).umod(secp256k1.curve.n)

    console.log("r = " + r.toString("hex"))
    console.log("tk = " + tk.toString("hex"))

/////////////////////////////////////////////////////////////////////////////////////////
    const pairX_check = multicoin.ECPair.fromPublicKey(Buffer.concat([Buffer.from("02", "hex"), P1.getX().toBuffer()]));
    const pairKX_check = multicoin.ECPair.fromPublicKey(Buffer.concat([Buffer.from("02", "hex"), P2.getX().toBuffer()]));
    
    const b1 = pairX_check.verify(H.toBuffer(), signatureX)

    console.log("b1 = "+b1)

    const b2 = pairKX_check.verify(H.toBuffer(), signatureKX)

    console.log("b2 = "+b2)

}

function test3()
{
    const m = "Message!";
    const H = new BN(utils.Hash256(m), "hex");

    const r = priv1;
    const t = priv2;

    const r_BN = new BN(r, "hex").umod(secp256k1.curve.n)
    const t_BN = new BN(t, "hex").umod(ed25519.curve.n)

    const rt = r_BN.mul(t_BN)

    const T = secp256k1.curve.g.mul(t_BN)
    const rT = T.mul(r_BN)

    const rtG = secp256k1.curve.g.mul(rt);

    console.log("rT_x = " + rT.getX().toString("hex"))
    console.log("rtG_x = " + rtG.getX().toString("hex"))

    /////////////////////////////SIGNATURE s_a = (H + (rG)_x a) r^-1///////////////////////////////////////////////
    const a = priv3;
    const R_a = secp256k1.curve.g.mul(r_BN);
    
    const s_a = (R_a.getX().umod(secp256k1.curve.n).mul(new BN(a, "hex")).add(H)).mul(r_BN.invm(secp256k1.curve.n)).umod(secp256k1.curve.n)
    const sig_a = Buffer.alloc(64);
    R_a.getX().toBuffer().copy(sig_a)
    s_a.toBuffer().copy(sig_a, 32)

    const pairX = multicoin.ECPair.fromPrivateKey(Buffer.from(a, "hex"));
    const s_a_check = pairX.verify(H.toBuffer(), sig_a)

    console.log("s_a_check = " + s_a_check)

    /////////////////////////////ADAPTOR SIGNATURE s_adaptor = (H + (r(tG))_x a) r^-1 ///////////////////////////////////////////////////
    const bracket = (rT.getX().umod(secp256k1.curve.n).mul(new BN(a, "hex")).add(H))
    const bracket_r = bracket.mul(r_BN.invm(secp256k1.curve.n));

    const s_adaptor = bracket_r.umod(secp256k1.curve.n);

    const s = s_adaptor.mul(t_BN.invm(secp256k1.curve.n)).umod(secp256k1.curve.n);
    const sig = Buffer.alloc(64);
    rT.getX().toBuffer().copy(sig)
    s.toBuffer().copy(sig, 32)

    const s_check = pairX.verify(H.toBuffer(), sig)

    console.log("s_check = " + s_check)

    //////////////////////////////DECODE ADAPTOR t = s_adaptor s^-1///////////////////////////////////////////////////
    const t_decoded = s_adaptor.mul(s.invm(secp256k1.curve.n))

    console.log("t = " + t_BN.toString("hex"))
    console.log("t_decoded = " + t_decoded.umod(secp256k1.curve.n).toString("hex"))
}

test3()

/*try {
    const TX = new bitcoin.Transaction(bitcoin.networks.testnet)
    TX.version = 2;
    TX.addInput(tx.getHash(), 1)
    TX.addOutput(bitcoin.address.toOutputScript(address, bitcoin.networks.testnet), tx.outs[1].value-fee);

    //const TX = txb.buildIncomplete();

    const signatureHash = TX.hashForSignature(0, p2sh.redeem.output, bitcoin.Transaction.SIGHASH_ALL);

    const redeemScriptSig = bitcoin.payments.p2sh({
        network: bitcoin.networks.testnet,
        redeem: {
            network: bitcoin.networks.testnet,
            input: bitcoin.script.compile([
                bitcoin.script.signature.encode(keyPair.sign(signatureHash), bitcoin.Transaction.SIGHASH_ALL),
                Buffer.from('00', 'hex'),
                Buffer.from('00', 'hex')
            ]),
            output: p2sh.redeem.output
        }
      }).input;

    TX.setInputScript(0, redeemScriptSig);

    return {result: true, txFirst: tx, txSecond: TX}
}
catch(e) {
    return {result: false, message: e.message}
}

/*const monerojs = require("monero-javascript");
const utils = require("./source/utils")
const monero = require("./source/wallets/monero")

if (monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("C:") == 0 && monerojs.LibraryUtils.WORKER_DIST_PATH.indexOf("file://") == -1)
    monerojs.LibraryUtils.WORKER_DIST_PATH = "file://"+monerojs.LibraryUtils.WORKER_DIST_PATH;

async function test()
{
    const walletNameView = "ViewWallet"
    //const walletNameOffline = "OfflineWallet"
    const primaryAddress = "535xp3D6VXzNS7dzoVeoyPhTJX17TTwtNJ3SLsyBa1B8Xqmo8z6RcULYQ6KVtLq3TJ4szc1AEZi98H8fLXDekkn7KDJKnHs";

    const privateViewKey = "a15a2245c51fcb50f2bad06a05af68926e4a730efc0cc8b42e9e06a430a84100";
    const privateSpendKey = "cf663c0dc88f4577f7757b58c1cc2ca9e912401c00e64b37bb59e1c90db79a00";

    try {
        const RPC = require("./source/private").RPC.txmr || false;
        if (!RPC) throw new Error("RPC not found")
                
        const daemon = await monerojs.connectToDaemonRpc(RPC.host, RPC.user, RPC.password);
        if (!daemon.isConnected) throw new Error("Daemon not connected!");
 
        const height = await daemon.getHeight();   
        
        let viewOnlyWallet = await monerojs.MoneroWalletFull.walletExists(walletNameView) ?
            await monerojs.openWalletFull({
                path: walletNameView,
                networkType: "stagenet",
                password: "supersecretpassword123",
                server: {uri: RPC.host, username: RPC.user, password: RPC.password}
            }) :
            await monerojs.createWalletFull({
                path: walletNameView,
                networkType: "stagenet",
                password: "supersecretpassword123",
                primaryAddress: primaryAddress,
                privateViewKey: privateViewKey,
                restoreHeight: height - 1000,
                server: {uri: RPC.host, username: RPC.user, password: RPC.password}
            });

        if (! await viewOnlyWallet.isConnectedToDaemon()) throw new Error("wallet not connected to daemon")

        if (! await viewOnlyWallet.isSynced())
            await viewOnlyWallet.sync(); 

        // create offline wallet
        let offlineWallet = await monerojs.createWalletFull({
            networkType: "stagenet",
            password: "supersecretpassword123",
            primaryAddress: primaryAddress,
            privateViewKey: privateViewKey,
            privateSpendKey: privateSpendKey
        });

        const balance = await viewOnlyWallet.getBalance();
        console.log(balance.toJSValue());

        // export outputs from view-only wallet
        const outputsHex = await viewOnlyWallet.exportOutputs(true);
        console.log("outputsHex.length = "+outputsHex.length)

        // import outputs to offline wallet
        let numOutputsImported = await offlineWallet.importOutputs(outputsHex);
        console.log("numOutputsImported = " + numOutputsImported)

        // export key images from offline wallet
        let keyImages = await offlineWallet.exportKeyImages(true);
        console.log("keyImages.length = "+keyImages.length)

        const str_test = monero.KeysToJSON(keyImages)
        const parsed = monero.KeysFromJSON(str_test);

        await viewOnlyWallet.importKeyImages(parsed);

        // create unsigned tx using view-only wallet
        ret = await viewOnlyWallet.createTx({
            accountIndex: 0,
            address: primaryAddress,
            amount: "100"
        });

        const for_sign = ret.getTxSet().getUnsignedTxHex();

        let unsignedTx = ret.toJson();//JSON.stringify(ret);
        unsignedTx["unsignedTxHex"] = ret.getTxSet().getUnsignedTxHex();
        
        const signedTxHex = await offlineWallet.signTxs(unsignedTx.fullHex);

        await viewOnlyWallet.close(true);
    }
    catch(e) {
        console.log(e);
    }   
}

test();

/*const fs = require('fs')

const text = fs.readFileSync('monero_web_worker.js')

fs.writeFile("./source/wallets/monero_common/monero_web_worker_2.js", "exports.STR= '"+escape(text)+"'", ret => {
    console.log(ret)
})

/*const fetchIntercept = require('fetch-intercept')
const { default: fetch } = require("node-fetch");
const LibraryUtils = require("./source/wallets/monero_common/js/common/LibraryUtils")
const MoneroWalletFull = require("./source/wallets/monero_common/js/wallet/MoneroWalletFull")

if (LibraryUtils.WORKER_DIST_PATH.indexOf("C:") == 0 && LibraryUtils.WORKER_DIST_PATH.indexOf("file://") == -1)
    LibraryUtils.WORKER_DIST_PATH = "file://"+LibraryUtils.WORKER_DIST_PATH;

const unregister = fetchIntercept.register({
        request: function (url, config) {
            // Modify the url or config here
            console.log(url)
            return [url, config];
        },
    
        requestError: function (error) {
            // Called when an error occured during another 'request' interceptor call
            return Promise.reject(error);
        },
    
        response: function (response) {
            // Modify the reponse object
            return response;
        },
    
        responseError: function (error) {
            // Handle an fetch error
            return Promise.reject(error);
        }
});
    
// Call fetch to see your interceptors in action.
fetch('http://google.com');

async function test()
{
    let offlineWallet = await MoneroWalletFull.createWallet({
        //path: address.address,
        networkType: "stagenet",
        password: "supersecretpassword123",
        primaryAddress: "58xgBuuMYGFWnwkBNHZRUn4s613XhQCNx2eMkoqgPJfuZWnXH4HMh9WYQ6KVtLq3TJ4szc1AEZi98H8fLXDekkn7KGgVTMz",
        privateViewKey: "a15a2245c51fcb50f2bad06a05af68926e4a730efc0cc8b42e9e06a430a84100",
    });
    
}

LibraryUtils.loadFullModule = async function() {
        
    // use cache if suitable, full module supersedes keys module because it is superset
    if (monerojs.LibraryUtils.WASM_MODULE && monerojs.LibraryUtils.FULL_LOADED) return monerojs.LibraryUtils.WASM_MODULE;
    
    // load module
    delete monerojs.LibraryUtils.WASM_MODULE;
    var bytes = Buffer.from(require("./source/wallets/monero_common/monero_wallet_full_2").STR, "hex");

    return new Promise(function(resolve, reject) {
        WebAssembly.instantiate(bytes).then(module => {
            monerojs.LibraryUtils.WASM_MODULE = module;
            delete monerojs.LibraryUtils.WASM_MODULE.then;
            monerojs.LibraryUtils.FULL_LOADED = true;
            monerojs.LibraryUtils._initWasmModule(LibraryUtils.WASM_MODULE);
            resolve(monerojs.LibraryUtils.WASM_MODULE);
        })
    })
    /*monerojs.LibraryUtils.WASM_MODULE = require("../../../node_modules/monero-javascript/dist/monero_wallet_full.wasm")();
    return new Promise(function(resolve, reject) {
        monerojs.LibraryUtils.WASM_MODULE.then(module => {
            monerojs.LibraryUtils.WASM_MODULE = module
            delete monerojs.LibraryUtils.WASM_MODULE.then;
            monerojs.LibraryUtils.FULL_LOADED = true;
            monerojs.LibraryUtils._initWasmModule(LibraryUtils.WASM_MODULE);
            resolve(monerojs.LibraryUtils.WASM_MODULE);
        });
    });*/
/*}

test();

/*const fs = require('fs')

const binary = fs.readFileSync('./source/wallets/monero_wallet_full.wasm')

fs.writeFile("./source/wallets/monero_wallet_full_2.js", binary.toString("hex"), ret => {
    console.log(ret)
})
/*const monerojs = require("monero-javascript");

/** @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
* @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
* @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
* @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
* @param {string} config.privateViewKey - private view key of the wallet to create (optional)
* @param {string} config.privateSpendKey - private spend key of the wallet to create (optional)*/

/*async function test()
{
    monerojs.LibraryUtils.LOG_LEVEL = 1
    monerojs.LibraryUtils.WORKER_DIST_PATH = "file://"+monerojs.LibraryUtils.WORKER_DIST_PATH;

    // create keys-only wallet
    let wallet = await monerojs.createWalletKeys({
       networkType: "stagenet",
       primaryAddress: "58xgBuuMYGFWnwkBNHZRUn4s613XhQCNx2eMkoqgPJfuZWnXH4HMh9WYQ6KVtLq3TJ4szc1AEZi98H8fLXDekkn7KGgVTMz",
       privateViewKey: "a15a2245c51fcb50f2bad06a05af68926e4a730efc0cc8b42e9e06a430a84100"
    });
    
    let daemon = await monerojs.connectToDaemonRpc("http://82.118.22.155:38081", "superuser", "abctesting123");
    let height = await daemon.getHeight();            // 1523651

    let viewOnlyWallet = await monerojs.MoneroWalletFull.walletExists("my_view_only_wallet4") ?
        await monerojs.openWalletFull({
            path: "my_view_only_wallet4",
            networkType: "stagenet",
            password: "supersecretpassword123",
            server: {uri: "http://82.118.22.155:38081"}//, username: "superuser", password: "abctesting123"}
        }) :
        await monerojs.createWalletFull({
            path: "my_view_only_wallet4",
            networkType: "stagenet",
            password: "supersecretpassword123",
            primaryAddress: "58xgBuuMYGFWnwkBNHZRUn4s613XhQCNx2eMkoqgPJfuZWnXH4HMh9WYQ6KVtLq3TJ4szc1AEZi98H8fLXDekkn7KGgVTMz",
            privateViewKey: "a15a2245c51fcb50f2bad06a05af68926e4a730efc0cc8b42e9e06a430a84100",
            restoreHeight: height - 100,
            server: {uri: "http://82.118.22.155:38081"}//, username: "superuser", password: "abctesting123"}
        });

    if (await viewOnlyWallet.isConnectedToDaemon() && ! await viewOnlyWallet.isSynced())
    {
        //let prevHeight = await viewOnlyWallet.getHeight();
        await viewOnlyWallet.sync();
    }
    let balance = await viewOnlyWallet.getBalance();

    await viewOnlyWallet.save();
    await viewOnlyWallet.close();
          
    
    // create and sync view-only wallet without spend key
 
    // create offline wallet
    let offlineWallet = await monerojs.createWalletFull({
    path: "my_offline_wallet",
    password: "supersecretpassword123",
    networkType: "stagenet",
    mnemonic: "spying swept ashtray going hence jester swagger cease spying unusual..."
    });

}

test();
  

/*const BN = require('bn.js');
const keccak256 = require('keccak256')
const bs58 = require('bs58')
const utils = require("./source/utils")

const _sodium = require('libsodium-wrappers-sumo');

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
        sodium.crypto_core_ed25519_scalar_random(this.#privateKey);
        this.#publicKey = KeyPair.getPublicFromInt(new BN(this.#privateKey))
    }
    static getPublicFromInt(bigint, encode = null)
    {
        //bigint is called with LE format (1 = 0100...00) no need to convert
        const pskBuffer = (bigint.toArrayLike(Buffer, 0, 32));
    
        //let tmp = Buffer.alloc(sodium.crypto_core_ed25519_BYTES); 
     
        let tmp = sodium.crypto_scalarmult_ed25519_base_noclamp(pskBuffer, "hex")

        ////////////////////////CHECK IT HERE
        //let sum_pub = Buffer.alloc(sodium.crypto_core_ed25519_BYTES);
        //sodium.crypto_scalarmult_ed25519_noclamp(sum_pub, pskBuffer, BASE_POINT_G.toArrayLike(Buffer, 0, 32))
        let sum_pub = sodium.crypto_scalarmult_ed25519_noclamp(pskBuffer, BASE_POINT_G.toArrayLike(Buffer, 0, 32), "hex")
        if (sum_pub != tmp) throw new Error("library failed!")
        ////////////////////////
        
        //tmp is returned in LE format (010000...0).
        if (!encode)
            return tmp; 
        return KeyPair.invertKey(tmp) 
    }
    static invertKey(buffer)
    {
        const bigint = new BN(buffer);
        return bigint.toArrayLike(Buffer, 'le', 32)
    }
}

class MoneroAddress {
    #network = 0x35;
    #publicSpentKey = null;
    #publicViewKey = null;
    constructor(publicSpent, publicView, network = 0x35)
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
    
    static GetAddressFromPairs(pairs, network = 0x35)
    {
        return new MoneroAddress(pairs.spentPair.getPublicKey(), pairs.viewPair.getPublicKey(), network)
    }
}

exports.GetAddressFromString = async function(str)
{
    await _sodium.ready;
    sodium = _sodium;
     
    const privKey_view = Buffer.from(utils.Hash256(str), "hex");
    const privKey_spent = Buffer.from(utils.Hash256(privKey_view), "hex");

    let objKeyPairs = {viewPair: new KeyPair(privKey_view), spentPair: new KeyPair(privKey_spent)}

    const address = new MoneroAddress(objKeyPairs.spentPair.getPublicKey(), objKeyPairs.viewPair.getPublicKey())

    return address.GetAddress58();
}

exports.GetAddressFromString("123")

/*"use strict";

const sodium = require('sodium-native')
const multicoin = require("multicoinjs-lib");

const ecPair = multicoin.ECPair.makeRandom()

const message = Buffer.from("Hello sodium!")

let sig = Buffer.alloc(sodium.crypto_sign_BYTES)
let pk = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
let sk = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

sodium.crypto_sign_seed_keypair(pk, sk, ecPair.privateKey)

sodium.crypto_sign_detached(sig, message, sk)

console.log(sig.toString("hex"))


const ret = sodium.crypto_sign_verify_detached(sig, Buffer.from("Hello sodium!"), pk)

console.log(ret)


// Node.js program to demonstrate the 
// crypto.getDiffieHellman() method
   
// Including crypto module
/*const crypto = require('crypto');
const utils = require("./source/utils")

const encypted_c = utils.ClientDH_Encrypt("Hello word from client")
const decrypted_c = utils.ClientDH_Decrypt(encypted_c)

console.log(decrypted_c);

const decrypted_s = utils.ServerDH_Decrypt(encypted_c)

console.log(decrypted_s);

const encrypted_s = utils.ServerDH_Encrypt("Hello word from server")
const decrypted_s2 = utils.ServerDH_Decrypt(encrypted_s)

console.log(decrypted_s2)

const decrypted_c2 = utils.ClientDH_Decrypt(encrypted_s);

console.log(decrypted_c2)

// Calling two getDiffieHellman method
// with its parameter, groupName
/*const diffiehellmangrp1 = crypto.createDiffieHellman(utils.Hash160("a;ljg@$BFB", ""), "hex", 2);
const diffiehellmangrp2 = crypto.createDiffieHellman(utils.Hash160("a;ljg@$BFB", ""), "hex", 2)
   
// Generating keys
diffiehellmangrp1.generateKeys("hex");
diffiehellmangrp2.generateKeys("hex");

const keys1 = {pub: diffiehellmangrp1.getPublicKey("hex"), priv: diffiehellmangrp1.getPrivateKey("hex")}
const keys2 = {pub: diffiehellmangrp2.getPublicKey("hex"), priv: diffiehellmangrp2.getPrivateKey("hex"), prime: diffiehellmangrp1.getPrime("hex"), gen: diffiehellmangrp1.getGenerator("hex")}

console.log(keys1)
console.log(keys2)
   
// Computing secret
const diffiehellmangrp1sc = diffiehellmangrp1.computeSecret(keys2.pub, "hex", "hex");

const diffiehellmangrp2sc = diffiehellmangrp2.computeSecret(keys1.pub, "hex", "hex");

console.log(diffiehellmangrp1sc == diffiehellmangrp2sc)

const diffiehellmangrp1_c = crypto.createDiffieHellman(utils.Hash160("a;ljg@$BFB", ""), "hex", 2);
const diffiehellmangrp2_c = crypto.createDiffieHellman(utils.Hash160("a;ljg@$BFB", ""), "hex", 2)

diffiehellmangrp1_c.setPrivateKey(keys1.priv, "hex")
diffiehellmangrp1_c.setPublicKey(keys1.pub, "hex")

diffiehellmangrp2_c.setPrivateKey(keys2.priv, "hex")
diffiehellmangrp2_c.setPublicKey(keys2.pub, "hex")

const keys1_c = {pub: diffiehellmangrp1_c.getPublicKey("hex"), priv: diffiehellmangrp1_c.getPrivateKey("hex")}
const keys2_c = {pub: diffiehellmangrp2_c.getPublicKey("hex"), priv: diffiehellmangrp2_c.getPrivateKey("hex"), prime: diffiehellmangrp1_c.getPrime("hex"), gen: diffiehellmangrp1_c.getGenerator("hex")}

console.log(keys1_c)
console.log(keys2_c)

const diffiehellmangrp1sc_c = diffiehellmangrp1_c.computeSecret(keys2_c.pub, "hex", "hex");

const diffiehellmangrp2sc_c = diffiehellmangrp2_c.computeSecret(keys1_c.pub, "hex", "hex");

console.log(diffiehellmangrp1sc_c == diffiehellmangrp2sc_c)

/*
{
  pub: 'd67d160ed53224dbbdb62775650ebc5ae2269af9ff41ffa4ed3eb10ea9fc1020',
  sec: '652f93d0030270b912910f01178cc612d3c8a84ace14c4e4851565ceb4de11dd'
}
{
  pub: 'a2fb9f88ac426c26fab5d6dff5898521f19f55c0fca9efd8f70e310b50ccf83b',
  sec: '9e5af4fa2151a1368cecbebe16008c10b90b90443755175b1d671cc47484a955'
}
*/
   
/*const sodium = require('sodium-universal')

let clientPk = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES, 0)
let clientSk = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES, 0)

sodium.crypto_kx_keypair(clientPk, clientSk)

///////////////////////////////////
let serverPk = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES, 0)
let serverSk = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES, 0)

sodium.crypto_kx_keypair(serverPk, serverSk)
////////////////////////////////////

let decryptKey1 = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey1 = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_client_session_keys(decryptKey1, encryptKey1, clientPk, clientSk, serverPk)
////////////////////////////////////

let decryptKey2 = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey2 = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_server_session_keys(decryptKey2, encryptKey2, serverPk, serverSk, clientPk)

const client = {pub: clientPk.toString("hex"), sec: clientSk.toString("hex")}
const server = {pub: serverPk.toString("hex"), sec: serverSk.toString("hex")}

console.log(client);
console.log(server);

console.log(encryptKey1.toString("hex"))
console.log(decryptKey1.toString("hex"))
console.log(encryptKey2.toString("hex"))
console.log(decryptKey2.toString("hex"))

///////////////////////////////Check
console.log("Check")

let decryptKey1_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey1_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_client_session_keys(decryptKey1_c, encryptKey1_c, Buffer.from(client.pub, "hex"), Buffer.from(client.sec, "hex"), Buffer.from(server.pub, "hex"))

let decryptKey2_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey2_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_server_session_keys(decryptKey2_c, encryptKey2_c, Buffer.from(server.pub, "hex"), Buffer.from(server.sec, "hex"), Buffer.from(client.pub, "hex"))

console.log(encryptKey1_c.toString("hex"))
console.log(decryptKey1_c.toString("hex"))
console.log(encryptKey2_c.toString("hex"))
console.log(decryptKey2_c.toString("hex"))

*/
/*const sodium = require('sodium-universal')
const client = require("./source/constants").clientDHkeys;
const server = require("./source/private").serverDHkeys;

let decryptKey1_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey1_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_client_session_keys(decryptKey1_c, encryptKey1_c, Buffer.from(client.pub, "hex"), Buffer.from(client.sec, "hex"), Buffer.from(client.server_pub, "hex"))

let decryptKey2_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)
let encryptKey2_c = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES, 0)

sodium.crypto_kx_server_session_keys(decryptKey2_c, encryptKey2_c, Buffer.from(server.pub, "hex"), Buffer.from(server.sec, "hex"), Buffer.from(server.client_pub, "hex"))

console.log(encryptKey1_c.toString("hex"))
console.log(decryptKey1_c.toString("hex"))
console.log(encryptKey2_c.toString("hex"))
console.log(decryptKey2_c.toString("hex"))*/
