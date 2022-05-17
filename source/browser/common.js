// @ts-nocheck
"use strict";

exports.AlertFail = function(text = "Invalid mnemonic! Checksum failed.")
{
    $("#alert_container").empty();
    const alertFailMnemonic = `                    
        <div id="alert_mnemonic_error" class="alert alert-danger alert-dismissible fade show" role="alert">
            <span id="alert_error_text">${text}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`

    $("#alert_container").append($(alertFailMnemonic));    
}
exports.AlertSuccess = function(text = "The mnemonic seed was encrypted and saved successfully")
{
    $("#alert_container").empty();

    const alertSuccessMnemonic = `                    
        <div id="alert_mnemonic_error" class="alert alert-success alert-dismissible fade show" role="alert">
            <span>${text}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

    $("#alert_container").append($(alertSuccessMnemonic)); 
}

let g_modal = null;
let g_interval = 0;

exports.HideProgressDialog = function()
{
    if (g_modal) g_modal.hide();

    clearInterval(g_interval);
    $("#id_progress_static").hide();
}
exports.ShowProgressDialog = function(callback = null)
{
    exports.HideProgressDialog();

    // @ts-ignore
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

    g_interval = setInterval(() => {

        const currPos = (180 - (Date.now() - now)/1000);

        if (currPos < 0)
        {
            clearInterval(g_interval);
            g_modal.hide();
            $("#id_progress_static").hide();

            if (callback) callback();
            return;
        }

        // @ts-ignore
        const showPos = ((100*currPos)/180).toFixed(0)*1

        $("#id_progress").attr("aria-valuenow", currPos);
        $("#id_progress").css("width", showPos+"%");
        $("#id_progress").text(currPos.toFixed(0))

        $("#id_progress_static").attr("aria-valuenow", currPos);
        $("#id_progress_static").css("width", showPos+"%");
        $("#id_progress_static").text(currPos.toFixed(0))
    
    }, 1000)

    return g_interval;
}
