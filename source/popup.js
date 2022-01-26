"use strict";

const utils = require("./utils.js");
const $ = require('jquery');

exports.saveFile = function(file)
{
  $('#loader').show();

  // generate a new FileReader object
  const reader = new FileReader(); 
  const isText = (file.type.indexOf('text/') == 0);
  
  if (isText)
    reader.readAsBinaryString(file);
  else
    reader.readAsArrayBuffer(file);
  
  reader.onload = async function(e) {
    try {
      const ret = isText ? 
        await utils.SaveTextToBlockchain(e.target.result) :
        await utils.SaveFileToBlockchain(e.target.result);
        
      $('#loader').hide();
      
      if (ret.result == true)
      {
        alert('saved! txid='+ret.txid);
        const savedDataString = await utils.GetSettings('saved_data') || JSON.stringify([]);
        const savedData = JSON.parse(savedDataString);
        
        savedData.push(ret.txid);
        
        exports.UpdateSavedData(savedData);
        
        utils.SetSettings({saved_data: JSON.stringify(savedData)});
      }
      else
        alert(ret.message);
    }
    catch(e) {
      $('#loader').hide();
      alert(e.message);
    }
  };
}

exports.UpdateSavedData = async function(savedData)
{
  if (!savedData)
  {
    const savedDataString = await utils.GetSettings('saved_data') || JSON.stringify([]);
    savedData = JSON.parse(savedDataString);
  }
  
  $('#saved-data-table').empty();
  for (let i = 0; i < savedData.length; i++)
  {
    const txid = savedData[i];
    
    const X = $("<span id='close'>X</span>");
    X.on('click', e => {
      DeleteData(txid);
    })
    
    const tr = $("<tr></tr>");
    const td1 = $("<td><a href='http://tbtc/"+txid+"' target='_blank'>http://tbtc/"+txid+"</a></td>");
    const td2 = $("<td></td>").append(X);
    
    $('#saved-data-table').append(tr.append(td1).append(td2));
  }
}

async function DeleteData(txid)
{
  const savedDataString = await utils.GetSettings('saved_data') || JSON.stringify([]);
  const savedData = JSON.parse(savedDataString);
  
  let tmp = [];
  for (let i = 0; i < savedData.length; i++)
  {
    if (savedData[i] == txid)
      continue;
      
    tmp.push(savedData[i]);
  }
  
  utils.SetSettings({saved_data: JSON.stringify(tmp)});
  
  exports.UpdateSavedData(tmp);
}