"use strict";

const $ = require('jquery');
const popup = require("./popup.js")
const utils = require("./utils.js")

let g_LastHash = "";
document.addEventListener('DOMContentLoaded', async () => {

	if (window.location.href.indexOf("index.html") == -1)
	{
	    popup.UpdateSavedData();
	    SetDefaults();
	}
	else
	{
	    await SetDefaults();
	    OnSiteChanged(window.location.hash.slice(1)); 
	}

}, false);

async function OnSiteChanged(txID)
{
    $('#loader').show();
    const obj = await utils.GetObjectFromBlockchain(txID);
    $('#loader').hide();
    
    
    if (obj.type == 'text')
    {
        document.open('text/html');
        document.write(Buffer.from(obj.base64, 'base64').toString('utf8'));
        document.close();
    }
    else
    {
        const img = $('<img src="data:image/jpeg;base64,'+obj.base64+'"/>');
        $('#image').append(img); 
    }
}


// handle input changes
$('#rpc_address').change(e => {
    OnRPCChange();
})
$('#rpc_user').change(e => {
    OnRPCChange();
})
$('#rpc_passsword').change(e => {
    OnRPCChange();
})

function OnRPCChange()
{
    utils.SetSettings({rpc_address: $('#rpc_address').val()});
    utils.SetSettings({rpc_user: $('#rpc_user').val()});
    utils.SetSettings({rpc_passsword: $('#rpc_passsword').val()});
    
    SetDefaults();
}

async function SetDefaults()
{
    return new Promise(async ok => {
        const network = utils.getNetwork();
        
        const url = await utils.GetSettings('rpc_address') || network.url;
        const user = await utils.GetSettings('rpc_user') || network.user;
        const password = await utils.GetSettings('rpc_password') || network.password;
        
        utils.updateNetwork(url, user, password);
        
        if (window.location.href.indexOf("index.html") == -1)
        {
            $('#rpc_address').val(url);
            $('#rpc_user').val(user);
            $('#rpc_passsword').val(password);
            
            const balance = await utils.getbalance();
            const address = await utils.getwalletaddress();
            
            $('#balance').val(balance && !balance.error ?  balance.result : "0.0");
            $('#address').val(address);
        }
    
        ok();
    })
}

$('#file_form').submit(e => {
    e.preventDefault();
    
    if (!$('#the-file-input')[0].files.length)
        return alert('Please select a file!');
    
    $("html, body").animate({ scrollTop: 0 }, "slow");
    try {
        OnRPCChange()
        
        popup.saveFile($('#the-file-input')[0].files[0])
    }
    catch(e) {
        alert(e.message);
    }
})