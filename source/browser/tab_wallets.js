"use strict";

const mn = require('electrum-mnemonic')
const p2p = require("p2plib");
const tbtc = require("../wallets/bitcoin_test/utils")
const tbtc_orders = require("../wallets/bitcoin_test/orders")
const utils = require("../utils")
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

function AlertFail(text = "Invalid mnemonic! Checksum failed.")
{
    $("#alert_container").empty();
    const alertFailMnemonic = `                    
        <div id="alert_mnemonic_error" class="alert alert-danger alert-dismissible fade show" role="alert">
            <span id="alert_error_text">${text}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`

    $("#alert_container").append($(alertFailMnemonic));    
}
function AlertSuccess(text = "The mnemonic seed was encrypted and saved successfully")
{
    $("#alert_container").empty();

    const alertSuccessMnemonic = `                    
        <div id="alert_mnemonic_error" class="alert alert-success alert-dismissible fade show" role="alert">
            <span>${text}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

    $("#alert_container").append($(alertSuccessMnemonic)); 
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
        return AlertFail();

    g_modal = new bootstrap.Modal(document.getElementById('wallet_setpassword_dialog'))
    g_modal.show();  
    
})

$("#new_password").on("click", e => {
    const newSeed = $("#wallet_seed").val();
    const password = $("#set_password_confirm").val();

    if (password != $("#set_password").val())
        return $("#set_password_confirm").addClass("is-invalid")
        
    $("#set_password_confirm").removeClass("is-invalid")
    g_modal.hide();

    const oldSeed = GetSavedSeedFromPassword(password);
    if (mn.validateMnemonic(oldSeed, mn.PREFIXES.standard))
        return AlertFail("Wallet with this password already saved.");
    
    try {
        utils.storage.setItem("bitcoin_seed_"+utils.Hash160(password, ""), utils.Encrypt(newSeed, password));

        if (GetSavedSeedFromPassword(password) != newSeed) throw new Error("Something wrong when trying to save encrypted mnemonic seed")
                
        AlertSuccess();
        exports.ShowBalances();
    }
    catch(e) {
        return AlertFail(e.message);
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

    try {
        const seed = GetSavedSeedFromPassword(password);
        if (!mn.validateMnemonic(seed, mn.PREFIXES.standard))
            return AlertFail();

        $("#wallet_seed").val(seed);
        AlertSuccess("The wallet was restored successfully");
        exports.ShowBalances();
    }
    catch(e) {
        return AlertFail(e.message);
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

    const sell_amount = $("#sell_amount").val();
    const buy_amount = $("#buy_amount").val();
    const sell_coin = $("#id_sell_coin").text();

    let result = {status: false};
    
    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return AlertFail();

    if (sell_coin == "tbtc")
    {
        result = await tbtc_orders.CreateOrder(mnemonic, sell_amount, buy_amount);
    }

    g_modal.hide();
})

$("#btn_bitcointest_deposit").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return AlertFail();

    $("#deposit_address").empty().val(tbtc.GetAddress(mnemonic).p2pkh.address);

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
        return AlertFail();

    if (coin == "tbtc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const ret = await tbtc.withdraw(mnemonic, $("#withdraw_address").val(), $("#withdraw_address_amount").val());

        ConfirmTransaction("tbtc", ret.amount, ret.address_to, ret.raw);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");

    }

    function ConfirmTransaction(coin, amount, address_to, rawTX)
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

    if (coin == "tbtc")
    {
        $("#btn_bitcointest_withdraw").prop('disabled', true);
        $("#btn_bitcointest_withdraw").text("Processing...");

        const txid = await tbtc.broadcast(rawTX);

        if (txid.length > 50)
            AlertSuccess("txid: "+txid)
        else
            AlertFail(txid);

        $("#btn_bitcointest_withdraw").prop('disabled', false);
        $("#btn_bitcointest_withdraw").text("Withdraw");
        return;
    }
})

function GetSavedSeedFromPassword(password)
{
    try {
        const encryptedSeed = utils.storage.getItem("bitcoin_seed_"+utils.Hash160(password, ""));
        
        return utils.Decrypt(encryptedSeed, password);
    }
    catch(e) {
        AlertFail(e.message);
        return "";
    }
}

let g_offline = false;
exports.ShowBalances = function(force = true)
{
    const connected = p2p.GetConnectedPeers();
    if (!connected.length)
    {
        $("#txt_balance_bitcointest").empty().append($("<span class='text-danger'>Offline</span>"))
        $("#btn_bitcointest_withdraw").prop('disabled', true);

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

    tbtc.GetBalance(mnemonic, balance => {
        $("#txt_balance_bitcointest").empty().text((balance.confirmed / 100000000).toFixed(8)*1.0 || 0);
    })

}  