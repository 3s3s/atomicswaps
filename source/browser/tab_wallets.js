"use strict";

const bip39 = require("bip39")
const utils = require("../utils")
const $ = require('jquery');

let g_modal = null;
exports.Init = function()
{
    bip39.setDefaultWordlist('english')
    
    g_modal = new bootstrap.Modal(document.getElementById('wallet_oldpassword_dialog'))
    g_modal.show();  

    setInterval(ShowBalances, 60*1000);
}

function AlertFail(text = "Invalid BIP39 mnemonic! Checksum failed.")
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

    const mnemonic = bip39.generateMnemonic();
    $("#wallet_seed").text(mnemonic)
})

$("#submit_seed").on("click", e => {
    $("#alert_container").empty();

    const newSeed = $("#wallet_seed").text();

    if (!bip39.validateMnemonic(newSeed))
        return AlertFail();

    g_modal = new bootstrap.Modal(document.getElementById('wallet_setpassword_dialog'))
    g_modal.show();  
    
})

$("#new_password").on("click", e => {
    const newSeed = $("#wallet_seed").text();
    const password = $("#set_password_confirm").val();

    if (password != $("#set_password").val())
        return $("#set_password_confirm").addClass("is-invalid")
        
    $("#set_password_confirm").removeClass("is-invalid")
    g_modal.hide();

    const oldSeed = GetSavedSeedFromPassword(password);
    if (bip39.validateMnemonic(oldSeed))
        return AlertFail("Wallet with this password already saved.");
    
    try {
        const seedHEX = bip39.mnemonicToEntropy(newSeed);

        utils.storage.setItem("bitcoin_seed_"+utils.Hash160(password), utils.Encrypt(seedHEX, password));

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
        if (!bip39.validateMnemonic(seed))
            return AlertFail();

        $("#wallet_seed").text(seed);
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
        
        const seedHEX = utils.Decrypt(encryptedSeed, password);
        return bip39.entropyToMnemonic(seedHEX)
    }
    catch(e) {
        AlertFail(e.message);
        return "";
    }
}

function ShowBalances()
{
    const mnemonic = $("#wallet_seed").text();

    require("../wallets/bitcoin_test/utils").GetBalance(mnemonic, balance => {
        $("#txt_balance_bitcointest").text(balance);
    })

}  