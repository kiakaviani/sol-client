


export function getSolPrice(asyncProc:any) {
    let SOL_PRICE = 0;
    var url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

    global.XMLHttpRequest = require("xhr2");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);

    xhr.setRequestHeader("accept", "application/json");
    if (asyncProc) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                SOL_PRICE = Number(JSON.parse(xhr.responseText).solana.usd);
                asyncProc(SOL_PRICE);
            }
        };
    }

    xhr.send();
}