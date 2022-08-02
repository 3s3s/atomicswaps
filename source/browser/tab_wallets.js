// @ts-nocheck
"use strict";

const mn = require('electrum-mnemonic')
//const p2p = require("p2plib");
const txmr = require("../wallets/monero_test/utils")
const xmr = require("../wallets/monero_main/utils")
const usdx = require("../wallets/usdx/utils")
const tbtc = require("../wallets/bitcoin_test/utils")
const btc = require("../wallets/bitcoin_main/utils")
const p2p_orders = require("../server/p2p/orders")
const utils = require("../utils")
const common = require("./common")
const main = require("./main")
const $ = require('jquery');

const orders = require("./tab_orders")

let g_modal = null;
exports.Init = function()
{
    g_modal = new bootstrap.Modal(document.getElementById('wallet_oldpassword_dialog'))
    g_modal.show();  

    $("#btn_bitcointest_withdraw").prop('disabled', true);

    setInterval(exports.ShowBalances, 60*1000);  
}

$("#generate_seed").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = mn.generateMnemonic({ prefix: mn.PREFIXES.standard });
    $("#wallet_seed").val(mnemonic)
})

$("#submit_seed").on("click", e => {
    $("#alert_container").empty();

    const newSeed = utils.getMnemonic();

    if (!mn.validateMnemonic(newSeed, mn.PREFIXES.standard))
        return common.AlertFail();

    g_modal = new bootstrap.Modal(document.getElementById('wallet_setpassword_dialog'))
    g_modal.show();  
    
})

$("#new_password").on("click", e => {
    const newSeed = utils.getMnemonic();
    const password = $("#set_password_confirm").val();

    if (password != $("#set_password").val())
        return $("#set_password_confirm").addClass("is-invalid")

    utils.setPassword(password);
        
    $("#set_password_confirm").removeClass("is-invalid")
    g_modal.hide();

    const oldSeed = GetSavedSeedFromPassword(password);
    if (mn.validateMnemonic(oldSeed, mn.PREFIXES.standard))
        return common.AlertFail("Wallet with this password already saved.");
    
    try {
        utils.storage.setItem("bitcoin_seed_"+utils.Hash160(password), utils.Encrypt(newSeed, password));

        if (GetSavedSeedFromPassword(password) != newSeed) throw new Error("Something wrong when trying to save encrypted mnemonic seed")
                
        common.AlertSuccess();
        exports.ShowBalances();
    }
    catch(e) {
        return common.AlertFail(e.message);
    }
})

$('#restore_seed').on("click", e => {
    $("#alert_container").empty();

    g_modal = new bootstrap.Modal(document.getElementById('wallet_oldpassword_dialog'))
    g_modal.show();  
})

$("#old_password_button").on("click", e => {
    g_modal.hide();
    const password = $("#old_password").val();

    utils.setPassword(password);

    try {
        const seed = GetSavedSeedFromPassword(password);
        if (!mn.validateMnemonic(seed, mn.PREFIXES.standard))
            return common.AlertFail();

        $("#wallet_seed").val(seed);
        common.AlertSuccess("The wallet was restored successfully");
        exports.ShowBalances();

        orders.InitSavedOrders()
    }
    catch(e) {
        return common.AlertFail(e.message);
    }
})

$("#createorder_sell_ok").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const sell_amount = $("#sell_amount").val();
    const buy_amount = $("#buy_amount").val();
    const sell_coin = $("#coin_to_sell").text();
    const buy_coin = $('#cointobuy').find(":selected").text();

    let result = {status: false};
    
    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    common.ShowProgressDialog(() => {
        common.AlertFail("Something wrong: timeout");
    });

    result = await p2p_orders.CreateOrder(mnemonic, (sell_amount*100000000).toFixed(0)*1, (buy_amount*100000000).toFixed(0)*1, sell_coin, buy_coin);

    common.HideProgressDialog();
    
    if (result && result.result == false)
        return common.AlertFail(result.message);

    if (result.sell_coin != sell_coin)
        return common.AlertFail("Sell coin mismatch "+result.sell_coin);

    if (result && result.result == true)
    {
        orders.UpdateOrders(result.orders, result.sell_coin, true);

        if (result.orders.length)
            return common.AlertSuccess("Orders updated!"); 
        else
            return common.AlertFail("Orders NOT updated!");  
    }       
})
/////////////////////////////////////////////////////////////////////
///                       TXMR                                     //
/////////////////////////////////////////////////////////////////////
//on click sell txmr
$("#btn_monerotest_sell").on("click", e => {
    $("#alert_container").empty();

    $("#sell_amount").empty();
    $("#buy_amount").empty();

    $("#coin_to_buy").text("tbtc")
    $("#cointobuy").val("tbtc")

    $("#coin_to_buy2").hide();
    $("#coin_to_sell").text("txmr")

    g_modal = new bootstrap.Modal(document.getElementById('createorder_sell_dialog'))
    g_modal.show();  
})

//on click txmr deposit
$("#btn_monerotest_deposit").on("click", async e => {
    $("#alert_container").empty();

    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    const moneroAddress = await txmr.GetAddress(mnemonic);

    $("#deposit_address").empty().val(moneroAddress.address);
    $("#priv_view_key").empty().val(moneroAddress.privViewKey);
    $("#priv_spent_key").empty().val(moneroAddress.privSpentKey);

    $("#accordionPrivKeys").show()

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  
})

//on click txmr withdraw
$("#btn_monerotest_withdraw").on("click", async e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text("txmr")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})
/////////////////////////////////////////////////////////////////////
///                       XMR                                     //
/////////////////////////////////////////////////////////////////////
//on click sell xmr
$("#btn_monero_sell").on("click", e => {
    $("#alert_container").empty();

    $("#sell_amount").empty();
    $("#buy_amount").empty();

    $("#coin_to_buy").text("btc")
    $("#cointobuy").val("btc")

    $("#coin_to_buy2").hide();
    $("#coin_to_sell").text("xmr")

    g_modal = new bootstrap.Modal(document.getElementById('createorder_sell_dialog'))
    g_modal.show();  
})

//on click xmr deposit
$("#btn_monero_deposit").on("click", async e => {
    $("#alert_container").empty();

    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    const moneroAddress = await xmr.GetAddress(mnemonic);

    $("#deposit_address").empty().val(moneroAddress.address);
    $("#priv_view_key").empty().val(moneroAddress.privViewKey);
    $("#priv_spent_key").empty().val(moneroAddress.privSpentKey);

    $("#accordionPrivKeys").show()

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  
})

//on click xmr withdraw
$("#btn_monero_withdraw").on("click", async e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text("xmr")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})
/////////////////////////////////////////////////////////////////////
///                       USDX                                     //
/////////////////////////////////////////////////////////////////////

//on click sell usdx
$("#btn_usdx_sell").on("click", e => {
    $("#alert_container").empty();

    $("#sell_amount").empty();
    $("#buy_amount").empty();

    $("#coin_to_buy").text("btc")
    $("#cointobuy").val("btc")

    $("#coin_to_buy2").hide();
    $("#coin_to_sell").text("usdx")

    g_modal = new bootstrap.Modal(document.getElementById('createorder_sell_dialog'))
    g_modal.show();  
})

//on click usdx deposit
$("#btn_usdx_deposit").on("click", async e => {
    $("#alert_container").empty();

    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    const moneroAddress = await usdx.GetAddress(mnemonic);

    $("#deposit_address").empty().val(moneroAddress.address);
    $("#priv_view_key").empty().val(moneroAddress.privViewKey);
    $("#priv_spent_key").empty().val(moneroAddress.privSpentKey);

    $("#accordionPrivKeys").show()

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  
})

//on click usdx withdraw
$("#btn_usdx_withdraw").on("click", async e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text("usdx")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})

/////////////////////////////////////////////////////////////////////
///                       TBTC                                     //
/////////////////////////////////////////////////////////////////////

//on click sell tbtc
$("#btn_bitcointest_sell").on("click", e => {
    $("#alert_container").empty();

    $("#sell_amount").empty();
    $("#buy_amount").empty();

    if (main.BLOCKCHAIN == "testnet")
    {
        $("#coin_to_sell").text("tbtc")

        $("#coin_to_buy").text("txmr")
        $("#cointobuy").val("txmr")

        $("#coin_to_buy2").hide()
    }
    else
    {
        $("#coin_to_sell").text("btc");

        $("#coin_to_buy2").text("usdx");
        $("#coin_to_buy").text("xmr");
        $("#cointobuy").val("xmr")
        
        $("#coin_to_buy2").show(); //.hide();//.show()
    }

    g_modal = new bootstrap.Modal(document.getElementById('createorder_sell_dialog'))
    g_modal.show();  
})

//on click tbtc deposit
$("#btn_bitcointest_deposit").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    $("#deposit_address").empty().val(tbtc.GetAddress(mnemonic).p2pkh.address);

    $("#accordionPrivKeys").hide()

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  

})

//on click tbtc withdraw
$("#btn_bitcointest_withdraw").on("click", e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text(main.BLOCKCHAIN == "testnet" ? "tbtc" : "btc")

    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})

$("#withdraw_ok").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const coin = $("#id_withdraw_coin").text()

    const mnemonic = utils.getMnemonic();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    if (coin == "tbtc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const ret = await tbtc.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        ConfirmTransaction("tbtc", ret.amount, ret.address_to, ret.raw);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");

    }
    if (coin == "btc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const ret = await btc.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        ConfirmTransaction("btc", ret.amount, ret.address_to, ret.raw);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");

    }
    if (coin == "txmr")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });
        const ret = await txmr.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        common.HideProgressDialog();

        if (ret.message) return common.AlertFail(ret.message);

        ConfirmTransaction("txmr", ret.amount, ret.address_to, ret.raw, ret.fee);
    }
    if (coin == "xmr")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });
        const ret = await xmr.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        common.HideProgressDialog();

        if (ret.message) return common.AlertFail(ret.message);

        ConfirmTransaction("xmr", ret.amount, ret.address_to, ret.raw, ret.fee);
    }

    if (coin == "usdx")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });
        const ret = await usdx.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        common.HideProgressDialog();

        if (ret.message) return common.AlertFail(ret.message);

        ConfirmTransaction("usdx", ret.amount, ret.address_to, ret.raw, ret.fee);
    }

    function ConfirmTransaction(coin, amount, address_to, rawTX, fee = 0)
    {
        $("#alert_container").empty();
        g_modal.hide();

        $("#id_withdraw_tx").text(rawTX);
        $("#id_withdraw_coin").text(coin);
        $("#withdraw_address_c").val(address_to);

        const full_amount = amount + fee;
        $("#withdraw_address_amount_c").val((full_amount/100000000).toFixed(8)*1);
    
        g_modal = new bootstrap.Modal(document.getElementById('confirm_withdraw_dialog'));
        g_modal.show();  
    }
})

$("#withdraw_confirm").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const coin = $("#id_withdraw_coin").text();
    const rawTX = $("#id_withdraw_tx").text();

    const mnemonic = utils.getMnemonic();

    if (coin == "tbtc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const txid = await tbtc.broadcast(rawTX);

        if (txid.length > 50)
            common.AlertSuccess("txid: "+txid)
        else
            common.AlertFail(txid);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");
        return;
    }
    if (coin == "btc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const txid = await btc.broadcast(rawTX);

        if (txid.length > 50)
            common.AlertSuccess("txid: "+txid)
        else
            common.AlertFail(txid);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");
        return;
    }
    if (coin == "txmr")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });

        const tx = await txmr.broadcast(mnemonic, rawTX);

        common.HideProgressDialog();

        if (!tx.result) return common.AlertFail(tx.message);
        
        return common.AlertSuccess("txid: "+tx.txid)
    }
    if (coin == "xmr")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });

        const tx = await xmr.broadcast(mnemonic, rawTX);

        common.HideProgressDialog();

        if (!tx.result) return common.AlertFail(tx.message);
        
        return common.AlertSuccess("txid: "+tx.txid)
    }
    if (coin == "usdx")
    {
        common.ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });

        const tx = await usdx.broadcast(mnemonic, rawTX);

        common.HideProgressDialog();

        if (!tx.result) return common.AlertFail(tx.message);
        
        return common.AlertSuccess("txid: "+tx.txid)
    }
})
/////////////////////////////////////////////////////////////////////////////////////////////////

function GetSavedSeedFromPassword(password)
{
    try {
        const encryptedSeed = utils.storage.getItem("bitcoin_seed_"+utils.Hash160(password));
        
        return utils.Decrypt(encryptedSeed, password);
    }
    catch(e) {
        common.AlertFail(e.message);
        return "";
    }
}

let g_offline = false;
exports.ShowBalances = async function(force = true)
{
    const connected = p2p.GetConnectedPeers();
    if (!connected.length)
    {
        $("#txt_balance_bitcointest").empty().append($("<span class='text-danger'>Offline</span>"))
        $("#txt_balance_btc").empty().append($("<span class='text-danger'>Offline</span>"))
        
        $("#btn_bitcointest_withdraw").prop('disabled', true);


        $("#txt_balance_monerotest").empty().append($("<span class='text-danger'>Offline</span>"))
        $("#txt_balance_xmr").empty().append($("<span class='text-danger'>Offline</span>"))

        $("#txt_balance_usdx").empty().append($("<span class='text-danger'>Offline</span>"))

        if (!g_offline)
        {
            g_offline = true;
            return setTimeout(exports.ShowBalances, 5000)
        }

        return;
    }
    if (!force && !g_offline)
        return;

    g_offline = false;

    if ($("#btn_bitcointest_withdraw").text() == "Withdraw")
        $("#btn_bitcointest_withdraw").prop('disabled', false);

    const mnemonic = utils.getMnemonic();

    const addressTXMR = await txmr.GetAddress(mnemonic)
    const addressXMR = await xmr.GetAddress(mnemonic)
    const addressUSDX = await usdx.GetAddress(mnemonic)

    if (main.BLOCKCHAIN == "testnet")
    {
        $("#txt_balance_bitcointest").empty().append($("<span class='text-warning'>wait update...</span>"))
        tbtc.GetBalance(mnemonic, balance => {
            $("#txt_balance_bitcointest").empty().text((balance.confirmed / 100000000).toFixed(8)*1.0);
        })
        
        $("#txt_balance_monerotest").empty().append($("<span class='text-warning'>wait update...</span>"))
        txmr.GetBalance(addressTXMR, balance => {
            $("#txt_balance_monerotest").empty().text((balance.confirmed / 1000000000000).toFixed(8)*1.0);
        })
    }
    else
    {
        $("#txt_balance_bitcointest").empty().append($("<span class='text-warning'>wait update...</span>"))
        tbtc.GetBalance(mnemonic, balance => {
            $("#txt_balance_bitcointest").empty().text((balance.confirmed / 100000000).toFixed(8)*1.0);
        })
        
        $("#txt_balance_xmr").empty().append($("<span class='text-warning'>wait update...</span>"))
        xmr.GetBalance(addressXMR, balance => {
            $("#txt_balance_xmr").empty().text((balance.confirmed / 1000000000000).toFixed(8)*1.0);
        })

        $("#txt_balance_usdx").empty().append($("<span class='text-warning'>wait update...</span>"))
        usdx.GetBalance(addressUSDX, balance => {
            $("#txt_balance_usdx").empty().text((balance.confirmed / 100).toFixed(2)*1.0);
        })

    }

}  

$('#sell_amount').on('input', evt => {
    const self = $('#sell_amount');
    self.val(self.val().replace(/[^0-9\.]/g, ''));
    if ((evt.which != 46 || self.val().indexOf('.') != -1) && (evt.which < 48 || evt.which > 57)) 
    {
      evt.preventDefault();
    }
});      
$('#buy_amount').on('keypress', evt => {
    const self = $('#buy_amount');
    self.val(self.val().replace(/[^0-9\.]/g, ''));
    if ((evt.which != 46 || self.val().indexOf('.') != -1) && (evt.which < 48 || evt.which > 57)) 
    {
      evt.preventDefault();
    }
});      
