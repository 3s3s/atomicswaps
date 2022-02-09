"use strict";

const mn = require('electrum-mnemonic')
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

function ShowBalances()
{
    const mnemonic = $("#wallet_seed").val();

    require("../wallets/bitcoin_test/utils").GetBalance(mnemonic, balance => {
        $("#txt_balance_bitcointest").text(balance.confirmed || 0);
    })

}  