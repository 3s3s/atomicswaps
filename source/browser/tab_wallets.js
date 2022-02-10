"use strict";

const mn = require('electrum-mnemonic')
const p2p = require("p2plib");
const tbtc = require("../wallets/bitcoin_test/utils")
const utils = require("../utils")
const $ = require('jquery');

let g_modal = null;
exports.Init = function()
{
    g_modal = new bootstrap.Modal(document.getElementById('wallet_oldpassword_dialog'))
    g_modal.show();  

    setInterval(ShowBalances, 60*1000);
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
        utils.storage.setItem("bitcoin_seed_"+utils.Hash160(password), utils.Encrypt(newSeed, password));

        if (GetSavedSeedFromPassword(password) != newSeed) throw new Error("Something wrong when trying to save encrypted mnemonic seed")
                
        AlertSuccess();
        ShowBalances();
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
        ShowBalances();
    }
    catch(e) {
        return AlertFail(e.message);
    }
})

$("#btn_bitcointest_deposit").on("click", e => {
    $("#alert_container").empty();

    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return AlertFail();

    $("#deposit_address").empty().val(tbtc.GetAddress(mnemonic).address);

    g_modal = new bootstrap.Modal(document.getElementById('wallet_depositaddress_dialog'))
    g_modal.show();  

})
$("#btn_bitcointest_withdraw").on("click", e => {
    $("#alert_container").empty();

    $("#id_withdraw_coin").empty().text("tbtc")
    g_modal = new bootstrap.Modal(document.getElementById('wallet_withdraw_dialog'))
    g_modal.show();  

})

$("#withdraw_ok").on("click", async e => {
    $("#alert_container").empty();

    const coin = $("#id_withdraw_coin").text()

    const mnemonic = $("#wallet_seed").val();

    if (!mn.validateMnemonic(mnemonic, mn.PREFIXES.standard))
        return AlertFail();

    if (coin == "tbtc")
    {
        const txid = await tbtc.withdraw(mnemonic, address_to, amount);
        return;
    }
})

function GetSavedSeedFromPassword(password)
{
    try {
        const encryptedSeed = utils.storage.getItem("bitcoin_seed_"+utils.Hash160(password));
        
        return utils.Decrypt(encryptedSeed, password);
    }
    catch(e) {
        AlertFail(e.message);
        return "";
    }
}

let g_offline = false;
function ShowBalances()
{
    const connected = p2p.GetConnectedPeers();
    if (!connected.length)
    {
        $("#txt_balance_bitcointest").empty().append($("<span class='text-danger'>Offline</span>"))

        if (!g_offline)
        {
            g_offline = true;
            return setTimeout(ShowBalances, 5000)
        }
        return;
    }
    g_offline = false;

    const mnemonic = $("#wallet_seed").val();

    $("#txt_balance_bitcointest").empty().append($("<span class='text-warning'>wait update...</span>"))

    tbtc.GetBalance(mnemonic, balance => {
        $("#txt_balance_bitcointest").empty().text((balance.confirmed / 100000000).toFixed(8)*1.0 || 0);
    })

}  