

// Check coingecko.com for live solana token price
export async function getSolPrice(callback: (price: number) => void) {
    var url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    global.XMLHttpRequest = require("xhr2");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.setRequestHeader("accept", "application/json");
    if (callback) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                let SOL_PRICE = Number(JSON.parse(xhr.responseText).solana.usd);
                callback(SOL_PRICE);
            }
        };
    }

    xhr.send();
}

// Check rugcheck.xyz for additional information about token situation
export function rugcheck(mint: string): Promise<any> {
    var url = `https://api.rugcheck.xyz/v1/tokens/${mint}/report`;
    global.XMLHttpRequest = require("xhr2");
    return new Promise<any>(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.setRequestHeader("accept", "application/json");
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                try {
                    const json = JSON.parse(xhr.responseText);
                    const topHolders = json.topHolders;
                    var topHoldersPercent = 0;
                    const RAYDIUM_POOL_AUTHORITY = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
                    topHolders.forEach((topHolder: any) => {
                        if (topHolder.owner != RAYDIUM_POOL_AUTHORITY) {
                            topHoldersPercent += Number(topHolder.pct);
                            if (Number(topHolder.pct) >= 9)
                                console.log('Wale detected: ', topHolder.address, ' (', Number(topHolder.pct).toFixed(2), '%)');
                        }
                    });
                    const jsonResult = { 'markets': json.markets, 'topHoldersPercent': topHoldersPercent.toFixed(1) };
                    resolve(jsonResult);
                } catch { reject('api.rugcheck.xyz FAILED.'); }
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = function () {
            reject(xhr.statusText);
        };
        xhr.send();
    });
}
