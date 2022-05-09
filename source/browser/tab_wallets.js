"use strict";

const mn = require('electrum-mnemonic')
const p2p = require("p2plib");
const txmr = require("../wallets/monero_test/utils")
const tbtc = require("../wallets/bitcoin_test/utils")
const p2p_orders = require("../server/p2p/orders")
const utils = require("../utils")
const common = require("./common")
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

function ShowProgressDialog(callback = null)
{
    if (g_modal) g_modal.hide();

    g_modal = new bootstrap.Modal(document.getElementById('progress_await_dialog'))
    $("#id_progress").attr("aria-valuenow", 180);
    $("#id_progress").css("width", "100%");
    $("#id_progress").text("180")
    g_modal.show();  

    $("#id_progress_static").attr("aria-valuenow", 180);
    $("#id_progress_static").css("width", "100%");
    $("#id_progress_static").text("180");
    $("#id_progress_static").show();

    const now = Date.now();

    const nIntervalID = setInterval(() => {

        const currPos = (180 - (Date.now() - now)/1000);

        if (currPos < 0)
        {
            clearInterval(nIntervalID);
            g_modal.hide();
            $("#id_progress_static").hide();

            if (callback) callback();
            return;
        }

        const showPos = ((100*currPos)/180).toFixed(0)*1

        $("#id_progress").attr("aria-valuenow", currPos);
        $("#id_progress").css("width", showPos+"%");
        $("#id_progress").text(currPos.toFixed(0))

        $("#id_progress_static").attr("aria-valuenow", currPos);
        $("#id_progress_static").css("width", showPos+"%");
        $("#id_progress_static").text(currPos.toFixed(0))
    
    }, 1000)

    return nIntervalID;
}

$("#generate_seed").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = mn.generateMnemonic({ prefix: mn.PREFIXES.standard });
    $("#wallet_seed").val(mnemonic)
})

$("#submit_seed").on("click", e => {
    $("#alert_container").empty();

    const newSeed = $("#wallet_seed").val();

    if (!mn.validateMnemonic(newSeed, mn.PREFIXES.standard))
        return common.AlertFail();

    g_modal = new bootstrap.Modal(document.getElementById('wallet_setpassword_dialog'))
    g_modal.show();  
    
})

$("#new_password").on("click", e => {
    const newSeed = $("#wallet_seed").val();
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

$("#btn_bitcointest_sell").on("click", e => {
    $("#alert_container").empty();

    $("#sell_amount").empty();
    $("#buy_amount").empty();

    $("#id_sell_coin").empty().text("tbtc")

    g_modal = new bootstrap.Modal(document.getElementById('createorder_sell_dialog'))
    g_modal.show();  
})

$("#createorder_sell_ok").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const sell_amount = $("#sell_amount").val();
    const buy_amount = $("#buy_amount").val();
    const sell_coin = $("#id_sell_coin").text();

    let result = {status: false};
    
    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    result = await p2p_orders.CreateOrder(mnemonic, (sell_amount*100000000).toFixed(0)*1, (buy_amount*100000000).toFixed(0)*1, sell_coin);
    
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
///////////////////////////////////////////////////////////////////////////////btn_monerotest_deposit
$("#btn_monerotest_deposit").on("click", async e => {
    $("#alert_container").empty();

    const mnemonic = $("#wallet_seed").val();

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
$("#btn_monerotest_withdraw").on("click", async e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text("txmr")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})

$("#btn_bitcointest_deposit").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return common.AlertFail();

    $("#deposit_address").empty().val(tbtc.GetAddress(mnemonic).p2pkh.address);

    $("#accordionPrivKeys").hide()

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  

})
$("#btn_bitcointest_withdraw").on("click", e => {
    $("#alert_container").empty();

    $("#withdraw_address").empty();
    $("#withdraw_address_amount").empty();

    $("#id_withdraw_coin").empty().text("tbtc")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})

$("#withdraw_ok").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const coin = $("#id_withdraw_coin").text()

    const mnemonic = $("#wallet_seed").val();

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
    if (coin == "txmr")
    {
        const timer = ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });
        const ret = await txmr.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        clearInterval(timer);
        g_modal.hide();
        $("#id_progress_static").hide();

        if (ret.message) return common.AlertFail(ret.message);

        ConfirmTransaction("txmr", ret.amount, ret.address_to, ret.raw, ret.fee);
    }

    function ConfirmTransaction(coin, amount, address_to, rawTX, fee = 0)
    {
        $("#alert_container").empty();
        g_modal.hide();

        $("#id_withdraw_tx").text(rawTX);
        $("#id_withdraw_coin").text(coin);
        $("#withdraw_address_c").val(address_to);
        $("#withdraw_address_amount_c").val((amount/100000000).toFixed(8)*1);
    
        g_modal = new bootstrap.Modal(document.getElementById('confirm_withdraw_dialog'));
        g_modal.show();  
    }
})

$("#withdraw_confirm").on("click", async e => {
    $("#alert_container").empty();
    g_modal.hide();

    const coin = $("#id_withdraw_coin").text();
    const rawTX = $("#id_withdraw_tx").text();

    const mnemonic = $("#wallet_seed").val();

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
    if (coin == "txmr")
    {
        const timer = ShowProgressDialog(() => {
            common.AlertFail("Something wrong: timeout");
        });

        const tx = await txmr.broadcast(mnemonic, rawTX);

        clearInterval(timer);
        g_modal.hide();
        $("#id_progress_static").hide();

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
        $("#btn_bitcointest_withdraw").prop('disabled', true);

        $("#txt_balance_monero").empty().append($("<span class='text-danger'>Offline</span>"))
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

    const mnemonic = $("#wallet_seed").val();

    $("#txt_balance_bitcointest").empty().append($("<span class='text-warning'>wait update...</span>"))
    $("#txt_balance_monero").empty().append($("<span class='text-warning'>wait update...</span>"))

    tbtc.GetBalance(mnemonic, balance => {
        $("#txt_balance_bitcointest").empty().text((balance.confirmed / 100000000).toFixed(8)*1.0 || 0);
    })
    
    const addressTXMR = await txmr.GetAddress(mnemonic)
    txmr.GetBalance(addressTXMR, balance => {
        $("#txt_balance_monero").empty().text((balance.confirmed / 1000000000000).toFixed(8)*1.0 || 0);
    })

}  