"use strict";

let windowID = -1;
chrome.browserAction.onClicked.addListener(() => {

  try {
    const oldWindows = chrome.windows.getAll(null, (info) => {
      for (let i=0; i<info.length; i++)
        if (info[i].id == windowID)
        {
          chrome.windows.update(info[i].id, {focused: true})
          return;
        }

      const createData = {
            type: "panel",
            url: "html/popup.html"
      };
      chrome.windows.create(createData, (info) => {
            windowID = info.id;
        }); 
      }); 
  }
  catch(e) {}
});

