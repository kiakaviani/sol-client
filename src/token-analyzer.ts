
import * as web3 from "@solana/web3.js";
import * as token from '@solana/spl-token';
import * as mpl_umi from "@metaplex-foundation/umi";
import BN from "bn.js";

import { findInstructionByProgramId } from "./transaction-manager";
import { getPoolKeys, getTokenAccountsByOwner } from "./raydium-pool-manager";
import { getMetaplexDigitalAssetInfo } from "./metaplex-manager";
import { getSolPrice } from "./external-apis";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { OpenOrders } from "@project-serum/serum";

let SOL_PRICE = 0;
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';

export async function analyzeTokenByTxId(connection: web3.Connection, umi: mpl_umi.Umi, signature: string, programId: string) {
    console.log("Fetching transaction data...");
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
        console.log('Failed to fetch transaction with signature ' + signature);
        return;
    }
    const initInstruction = findInstructionByProgramId(tx.transaction.message.instructions, new web3.PublicKey(programId)) as web3.PartiallyDecodedInstruction | null;
    if (!initInstruction) {
        console.log('Failed to find lp init instruction in lp init tx');
        return;
    }
    //initInstruction.accounts[4] is the pool Id
    await analyzeToken(connection, umi, initInstruction.accounts[4]);
}

export async function analyzeTokenByMintAddress(connection: web3.Connection, umi: mpl_umi.Umi, mint: string) {
    console.log("Extracting poolId from the link...");
    const metaplexAsset = await getMetaplexDigitalAssetInfo(umi, new web3.PublicKey(mint));
    console.log(metaplexAsset);
    const poolId = await getAssociatedTokenAddress(new web3.PublicKey(mint), new web3.PublicKey(metaplexAsset.metadata.updateAuthority));
    console.log(poolId);
    await analyzeToken(connection, umi, new web3.PublicKey(poolId));
}

export async function analyzeToken(connection: web3.Connection, umi: mpl_umi.Umi, poolId: web3.PublicKey) {
    await getSolPrice(numCallback);

    const poolInfo = await getPoolKeys(connection, poolId);
    const metaplexAsset = await getMetaplexDigitalAssetInfo(umi, poolInfo.baseMint);

    const baseDenominator = new BN(10).pow(poolInfo.baseDecimal);
    const quoteDenominator = new BN(10).pow(poolInfo.quoteDecimal);
    //Calculate burn percentage=======================================
    const lpReserve = poolInfo.lpReserve.toNumber() / baseDenominator.toNumber();
    const actualSupply = Number(metaplexAsset.mint.supply) / baseDenominator.toNumber();
    const maxLpSupply = Math.max(actualSupply, (lpReserve - 1));
    const burnAmt = (maxLpSupply - actualSupply)
    const burnPercent = (burnAmt / lpReserve) * 100;

    //Calculate Holders Percentage====================================
    const tokenAccount = await getAssociatedTokenAddress(poolInfo.baseMint, new web3.PublicKey(metaplexAsset.metadata.updateAuthority));
    const ownerBalance = await connection.getTokenAccountBalance(tokenAccount);
    const ownerHoldPercent = BigInt(ownerBalance.value.amount) * BigInt(100) / metaplexAsset.mint.supply;

    const openOrders = await OpenOrders.load(connection, poolInfo.openOrders,
        new web3.PublicKey(SERUM_OPENBOOK_PROGRAM_ID) // OPENBOOK_PROGRAM_ID(marketProgramId) of each pool can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
    );

    const baseTokenAmount = await connection.getTokenAccountBalance(poolInfo.baseVault);
    const quoteTokenAmount = await connection.getTokenAccountBalance(poolInfo.quoteVault);

    const basePnl = poolInfo.baseNeedTakePnl.toNumber() / baseDenominator.toNumber();
    const quotePnl = poolInfo.quoteNeedTakePnl.toNumber() / quoteDenominator.toNumber();

    const openOrdersBaseTokenTotal = openOrders.baseTokenTotal.toNumber() / baseDenominator.toNumber();
    const openOrdersQuoteTokenTotal = openOrders.quoteTokenTotal.toNumber() / quoteDenominator.toNumber();

    const base = (baseTokenAmount.value?.uiAmount || 0) + openOrdersBaseTokenTotal - basePnl;
    const quote = (quoteTokenAmount.value?.uiAmount || 0) + openOrdersQuoteTokenTotal - quotePnl;

    const ownerAllTokens = await getTokenAccountsByOwner(connection, new web3.PublicKey(metaplexAsset.metadata.updateAuthority));
    //const tokenLargestAccounts = await connection.getTokenLargestAccounts(poolInfo.baseMint, 'finalized');
    //console.log(tokenLargestAccounts);

    const addedLpAccounts = ownerAllTokens.filter((a) =>
        a.accountInfo.mint.equals(poolInfo.lpMint)
    );
    let totalTokenOwnersAmt = 0;
    addedLpAccounts.forEach(function (a) {
        totalTokenOwnersAmt += a.accountInfo.amount.toNumber();
    });
    const totalTokenOwnersAmtPercent = BigInt(totalTokenOwnersAmt) * BigInt(100) / metaplexAsset.mint.supply;

    const liquidityAmount = Number(Number(quote * SOL_PRICE * 2 / base) * base).toFixed(0);
    const marketCap = Number((quote * SOL_PRICE / base) * actualSupply).toFixed(0)

    console.log("This owner has a total of ", ownerAllTokens.length, " tokens.");
    console.log("Symbol: ", metaplexAsset.metadata.symbol, "(" + metaplexAsset.metadata.name + ")" + " <============================");
    console.log("Actual Supply: " + getFriendlyNumber(actualSupply));
    console.log("MaxLpSupply: ", getFriendlyNumber(maxLpSupply));
    console.log("Balance in LP: ", ((base * 100) / actualSupply).toFixed(1) + "%");
    console.log("Owner Balance:", ownerHoldPercent.toString() + '%' + " (" + ownerBalance.value.uiAmount + ")");
    console.log("Other Owners: " + totalTokenOwnersAmtPercent.toString() + '%' + " (" + totalTokenOwnersAmt + ")");
    console.log("Price in SOLs: " + Number(quote / base).toFixed(12));
    console.log("Price in USDs: ", Number(quote * SOL_PRICE / base).toFixed(12));
    console.log("Market CAP: ", marketCap, "$");
    console.log("Liquidity: ", liquidityAmount, "$");
    console.log("Burn amount: ", burnPercent + '%' + " (" + burnAmt + ")");
    console.log("MintAuthority: ", mpl_umi.unwrapOption(metaplexAsset.mint.mintAuthority));
    console.log("FreezeAuthority: ", mpl_umi.unwrapOption(metaplexAsset.mint.freezeAuthority));
    console.log("UpdateAuthority: ", metaplexAsset.metadata.updateAuthority);
    console.log("IsMutable: ", metaplexAsset.metadata.isMutable);
    console.log("PoolOpenTime: ", new Date(Number(poolInfo.poolOpenTime) * 1000).toLocaleString());
    console.log("Metadata: ", metaplexAsset.metadata.uri);
    console.log("https://dexscreener.com/solana/" + poolInfo.baseMint);
    console.log("https://www.dextools.io/app/en/solana/pair-explorer/" + poolInfo.baseMint);

    var redFlags = 0;
    if (mpl_umi.unwrapOption(metaplexAsset.mint.mintAuthority) !== null || mpl_umi.unwrapOption(metaplexAsset.mint.freezeAuthority) != null) {
        console.log('Mint, Freeze not null');
        redFlags++;
    }
    if (ownerAllTokens.length > 5) {
        console.log('OwnerAllTokens > 5');
        redFlags++;
    }
    if (((base * 100) / actualSupply) < 30) {
        console.log('Balance in LP < 30%');
        redFlags++;
    }
    if (ownerHoldPercent > 80) {
        console.log('ownerHoldPercent > 80%');
        redFlags++;
    }
    if (Number(liquidityAmount) < 900) {
        console.log('Liquidity < 900$');
        redFlags++;
    }
    if (Number(liquidityAmount) > 19000) {
        console.log('Liquidity > 19000$');
        redFlags++;
    }
    if (Number(actualSupply) > 19000000000) {
        console.log('ActualSupply > 2B');
        redFlags++;
    }
    if (Number(marketCap) < 1000) {
        console.log('MarketCap < 1000$');
        redFlags++;
    }
    if (metaplexAsset.metadata.name.toUpperCase().includes("HAT") ||
        //metaplexAsset.metadata.name.toUpperCase().includes("WIF") ||
        metaplexAsset.metadata.name.toUpperCase().includes("BIDEN") ||
        metaplexAsset.metadata.name.toUpperCase().includes("OBAMA") ||
        metaplexAsset.metadata.name.toUpperCase().includes("PUMP") ||
        metaplexAsset.metadata.name.toUpperCase().includes("HITLER") ||
        metaplexAsset.metadata.name.toUpperCase().includes("MUSK") ||
        metaplexAsset.metadata.name.toUpperCase().includes("TRUMP")) {
        console.log('Frequent Name.');
        redFlags++;
    }
    if (redFlags == 0) {
        //Write this section in a compatible way with your OS. This code is tested on Windows 10+ OS with Chrome browser installed.
        //The goal of the following lines is to automatically open rugcheck.xyz and dexscreener.com if redflags of the token are acceptable.
        var command = `start chrome --no-sandbox ${"https://rugcheck.xyz/tokens/" + poolInfo.baseMint}`;
        const { exec } = require('child_process');
        exec(command);
        command = `start chrome --no-sandbox ${"https://dexscreener.com/solana/" + poolInfo.baseMint}`;
        exec(command);
        //Copy the token mint address to the clipboard.
        require('child_process').spawn('clip').stdin.end(poolInfo.baseMint.toString());
    }
}

function getFriendlyNumber(input: number) {
    if ((input / 1000000000000) >= 1)
        return (input / 1000000000000).toFixed(0) + 'T';
    if ((input / 1000000000) >= 1)
        return (input / 1000000000).toFixed(0) + 'B';
    if ((input / 1000000) >= 1)
        return (input / 1000000).toFixed(0) + 'M';
    if ((input / 1000) >= 1)
        return (input / 1000).toFixed(0) + 'K';
    return input;
}

var numCallback = (price: number): void => {
    SOL_PRICE = price;
}