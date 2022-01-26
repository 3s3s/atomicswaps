"use strict";

chrome.webRequest.onBeforeRequest.addListener(
  redirect,
  {urls: ["http://tbtc/*"]},
  ["blocking"]
);

function redirect(requestDetails) {
  console.log("Redirecting: " + requestDetails.url);
  
  const txid = requestDetails.url.split('/')[3];
  const ext = chrome.runtime.getURL("html/index.html#"+txid);
  
  return {
    redirectUrl: ext
  };
}

chrome.browserAction.onClicked.addListener(() => {
    
  const createData = {
    type: "panel",
    url: "html/popup.html"
  };
  const creating = chrome.windows.create(createData); 
});

