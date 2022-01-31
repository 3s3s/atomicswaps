"use strict";

document.addEventListener('DOMContentLoaded', async () => {

    require("./server/database").Init();
    require("./popup.js").Init();

}, false);

