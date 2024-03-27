import * as web3 from "@solana/web3.js";

import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";

import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityPoolJsonInfo, LiquidityPoolKeys, LiquidityPoolKeysV4, LiquidityPoolStatus, MARKET_STATE_LAYOUT_V3, Market, Percent, SPL_ACCOUNT_LAYOUT, SPL_MINT_LAYOUT, Token, TokenAccount, TokenAmount, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";

import * as token from '@solana/spl-token'
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";

import * as spltoken from '@solana/spl-token'
import { u32, u8, struct } from "@solana/buffer-layout";
import { publicKey, u64, bool } from "@solana/buffer-layout-utils";
import { Umi } from "@metaplex-foundation/umi";

import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from "telegram/events";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const RAYDIUM_POOL_AUTHORITY = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;
let SOL_PRICE = 0;

const MY_MPL_TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);
const MY_RAYDIUM_POOL_V4_PROGRAM_ID = new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);

main();

async function main() {
    getSolPrice();
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    const signature = '27sZE6ogFgfZdRKb8udCDKunvWNyHBMsXhy7WpF7GobvfjwUjzQSisTdHhCPhQPhdvCwUsUZ9SkJzfhGg9rR6jMn';
    //PrintData(connection, umi, signature);
    //console.log(`https://solscan.io/tx/${signature}`);
    //analyzeToken(connection, umi, signature);
    //inputLoop(connection, umi);
}

function inputLoop(connection: web3.Connection, umi: Umi) {
    const readline = require('readline');
    let rl = readline.createInterface(process.stdin, process.stdout);
    rl.setPrompt('signature> ');
    rl.prompt();
    rl.on('line', async (line: string) => {
        if (line === "exit" || line === "quit" || line == 'q') {
            rl.close()
            return;
        }
        if (line === "help" || line === '?') {
            console.log(`commands:\n  [signature]\n  exit|quit|q\n`)
        } else if (line.length > 80) {
            try { await analyzeToken(connection, umi, line); } catch { console.log('Failed.'); }
        } else {
            console.log(`unknown command: "${line}"`)
        }
        rl.prompt()

    }).on('close', () => {
        console.log('exited.')
    });
}

async function analyzeToken(connection: web3.Connection, umi: Umi, signature: string) {
    console.log("Fetching transaction data...");
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
        console.log('Failed to fetch transaction with signature ' + signature);
        return;
    }
    const initInstruction = findInstructionByProgramId(tx.transaction.message.instructions, new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as web3.PartiallyDecodedInstruction | null;
    if (!initInstruction) {
        console.log('Failed to find lp init instruction in lp init tx');
        return;
    }

    const account = await connection.getAccountInfo(initInstruction.accounts[4]);
    if (account === null) throw Error(' get id info error ')
    const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

    const mint = mpl_umi.publicKey(poolInfo.baseMint);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    //console.log(asset);

    const baseDenominator = new BN(10).pow(poolInfo.baseDecimal);
    const quoteDenominator = new BN(10).pow(poolInfo.quoteDecimal);
    //Calculate burn percentage=======================================
    const lpReserve = poolInfo.lpReserve.toNumber() / baseDenominator.toNumber();
    const actualSupply = Number(asset.mint.supply) / baseDenominator.toNumber();
    const maxLpSupply = Math.max(actualSupply, (lpReserve - 1));
    const burnAmt = (maxLpSupply - actualSupply)
    const burnPercent = (burnAmt / lpReserve) * 100;

    //Calculate Holders Percentage====================================
    const tokenAccount = await spltoken.getAssociatedTokenAddress(poolInfo.baseMint, new web3.PublicKey(asset.metadata.updateAuthority));
    const ownerBalance = await connection.getTokenAccountBalance(tokenAccount);
    const ownerHoldPercent = BigInt(ownerBalance.value.amount) * BigInt(100) / asset.mint.supply;

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

    const ownerAllTokens = await getTokenAccountsByOwner(connection, new web3.PublicKey(asset.metadata.updateAuthority));
    //const tokenLargestAccounts = await connection.getTokenLargestAccounts(poolInfo.baseMint, 'finalized');
    //console.log(tokenLargestAccounts);

    const addedLpAccounts = ownerAllTokens.filter((a) =>
        a.accountInfo.mint.equals(poolInfo.lpMint)
    );
    let totalTokenOwnersAmt = 0;
    addedLpAccounts.forEach(function (a) {
        totalTokenOwnersAmt += a.accountInfo.amount.toNumber();
    });
    const totalTokenOwnersAmtPercent = BigInt(totalTokenOwnersAmt) * BigInt(100) / asset.mint.supply;

    const liquidityAmount = Number(Number(quote * SOL_PRICE * 2 / base) * base).toFixed(0);
    const marketCap = Number((quote * SOL_PRICE / base) * actualSupply).toFixed(0)

    console.log("This owner has ", ownerAllTokens.length, " tokens at all.");
    console.log("symbol: ", asset.metadata.symbol, "(" + asset.metadata.name + ")");
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
    console.log("mintAuthority: ", mpl_umi.unwrapOption(asset.mint.mintAuthority));
    console.log("freezeAuthority: ", mpl_umi.unwrapOption(asset.mint.freezeAuthority));
    console.log("updateAuthority: ", asset.metadata.updateAuthority);
    console.log("isMutable: ", asset.metadata.isMutable);
    console.log("poolOpenTime: ", new Date(Number(poolInfo.poolOpenTime) * 1000).toLocaleString());
    console.log("https://dexscreener.com/solana/" + poolInfo.baseMint);

    var redFlags = 0;
    if (mpl_umi.unwrapOption(asset.mint.mintAuthority) !== null || mpl_umi.unwrapOption(asset.mint.freezeAuthority) != null) {
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
    if (asset.metadata.name.toUpperCase().includes("HAT") ||
        //asset.metadata.name.toUpperCase().includes("WIF") ||
        asset.metadata.name.toUpperCase().includes("BIDEN") ||
        asset.metadata.name.toUpperCase().includes("OBAMA") ||
        asset.metadata.name.toUpperCase().includes("HITLER") ||
        asset.metadata.name.toUpperCase().includes("MUSK") ||
        asset.metadata.name.toUpperCase().includes("TRUMP")) {
        console.log('Bad Name.');
        redFlags++;
    }
    if (redFlags == 0) {
        var command = `start chrome --no-sandbox ${"https://rugcheck.xyz/tokens/" + poolInfo.baseMint}`;
        const { exec } = require('child_process');
        exec(command);
        command = `start chrome --no-sandbox ${"https://dexscreener.com/solana/" + poolInfo.baseMint}`;
        exec(command);
        require('child_process').spawn('clip').stdin.end(poolInfo.baseMint.toString());
    }
}

async function PrintData(connection: web3.Connection, umi: Umi, signature: string) {
    console.log('\n========================================================================');
    console.log("Fetching transaction data...");

    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
        throw new Error('Failed to fetch transaction with signature ' + signature);
    }
    const poolInfo = parsePoolInfoFromLpTransaction(tx);

    printPoolKeys(connection, poolInfo.id);
    printMerketInfo(connection, poolInfo.marketId);
    printMintInfo(connection, umi, poolInfo.id);

    //const amount = await calcAmountOut(connection, poolKeys, 1, true);
    //console.log("amount: ", amount);

    console.log("id: ", poolInfo.id.toString());
    console.log("baseMint: ", poolInfo.baseMint.toString());
    console.log("quoteMint: ", poolInfo.quoteMint.toString());
    console.log("lpMint: ", poolInfo.lpMint.toString());
    console.log('baseReserve: ', poolInfo.baseReserve);
    console.log('quoteReserve: ', poolInfo.quoteReserve);
    console.log('lpReserve: ', poolInfo.lpReserve);

}

async function printPoolKeys(connection: web3.Connection, poolId: web3.PublicKey) {
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);
    console.log("PoolKeys----------------------------------------------------------------");
    console.log("status: ", info.status.toString());
    console.log("nonce: ", info.nonce.toString());
    console.log("maxOrder: ", info.maxOrder.toString());
    console.log("depth: ", info.depth.toString());
    console.log("baseDecimal: ", info.baseDecimal.toString());
    console.log("quoteDecimal: ", info.quoteDecimal.toString());
    console.log("state: ", info.state.toString());
    console.log("resetFlag: ", info.resetFlag.toString());
    console.log("minSize: ", info.minSize.toString());
    console.log("volMaxCutRatio: ", info.volMaxCutRatio.toString());
    console.log("amountWaveRatio: ", info.amountWaveRatio.toString());
    console.log("baseLotSize: ", info.baseLotSize.toString());
    console.log("quoteLotSize: ", info.quoteLotSize.toString());
    console.log("minPriceMultiplier: ", info.minPriceMultiplier.toString());
    console.log("maxPriceMultiplier: ", info.maxPriceMultiplier.toString());
    console.log("systemDecimalValue: ", info.systemDecimalValue.toString());
    console.log("minSeparateNumerator: ", info.minSeparateNumerator.toString());
    console.log("minSeparateDenominator: ", info.minSeparateDenominator.toString());
    console.log("tradeFeeNumerator: ", info.tradeFeeNumerator.toString());
    console.log("tradeFeeDenominator: ", info.tradeFeeDenominator.toString());
    console.log("pnlNumerator: ", info.pnlNumerator.toString());
    console.log("pnlDenominator: ", info.pnlDenominator.toString());
    console.log("swapFeeNumerator: ", info.swapFeeNumerator.toString());
    console.log("swapFeeDenominator: ", info.swapFeeDenominator.toString());
    console.log("baseNeedTakePnl: ", info.baseNeedTakePnl.toString());
    console.log("quoteNeedTakePnl: ", info.quoteNeedTakePnl.toString());
    console.log("quoteTotalPnl: ", info.quoteTotalPnl.toString());
    console.log("baseTotalPnl: ", info.baseTotalPnl.toString());
    console.log("poolOpenTime: ", new Date(Number(info.poolOpenTime) * 1000).toLocaleString());
    console.log("punishPcAmount: ", info.punishPcAmount.toString());
    console.log("punishCoinAmount: ", info.punishCoinAmount.toString());
    console.log("orderbookToInitTime: ", info.orderbookToInitTime.toString());
    console.log("swapBaseInAmount: ", info.swapBaseInAmount.toString());
    console.log("swapQuoteOutAmount: ", info.swapQuoteOutAmount.toString());
    console.log("swapBase2QuoteFee: ", info.swapBase2QuoteFee.toString());
    console.log("swapQuoteInAmount: ", info.swapQuoteInAmount.toString());
    console.log("swapBaseOutAmount: ", info.swapBaseOutAmount.toString());
    console.log("swapQuote2BaseFee: ", info.swapQuote2BaseFee.toString());
    console.log("baseVault: ", info.baseVault.toString());
    console.log("quoteVault: ", info.quoteVault.toString());
    console.log("baseMint: ", info.baseMint.toString());
    console.log("quoteMint: ", info.quoteMint.toString());
    console.log("lpMint: ", info.lpMint.toString());
    console.log("openOrders: ", info.openOrders.toString());
    console.log("marketId: ", info.marketId.toString());
    console.log("marketProgramId: ", info.marketProgramId.toString());
    console.log("targetOrders: ", info.targetOrders.toString());
    console.log("withdrawQueue: ", info.withdrawQueue.toString());
    console.log("lpVault: ", info.lpVault.toString());
    console.log("owner: ", info.owner.toString());
    console.log("lpReserve: ", info.lpReserve.toString());
    console.log("padding: ", info.padding[0].toString(), ', ', info.padding[1].toString(), ', ', info.padding[2].toString());
}

async function printMerketInfo(connection: web3.Connection, marketId: web3.PublicKey) {
    const marketAccount = await connection.getAccountInfo(marketId);
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
    console.log("MerketInfo--------------------------------------------------------------");
    console.log("ownAddress: ", marketInfo.ownAddress.toString());
    console.log("vaultSignerNonce: ", marketInfo.vaultSignerNonce.toString());
    console.log("baseMint: ", marketInfo.baseMint.toString());
    console.log("quoteMint: ", marketInfo.quoteMint.toString());
    console.log("baseVault: ", marketInfo.baseVault.toString());
    console.log("baseDepositsTotal: ", marketInfo.baseDepositsTotal.toString());
    console.log("baseFeesAccrued: ", marketInfo.baseFeesAccrued.toString());
    console.log("quoteVault: ", marketInfo.quoteVault.toString());
    console.log("quoteDepositsTotal: ", marketInfo.quoteDepositsTotal.toString());
    console.log("quoteFeesAccrued: ", marketInfo.quoteFeesAccrued.toString());
    console.log("quoteDustThreshold: ", marketInfo.quoteDustThreshold.toString());
    console.log("requestQueue: ", marketInfo.requestQueue.toString());
    console.log("eventQueue: ", marketInfo.eventQueue.toString());
    console.log("bids: ", marketInfo.bids.toString());
    console.log("asks: ", marketInfo.asks.toString());
    console.log("baseLotSize: ", marketInfo.baseLotSize.toString());
    console.log("quoteLotSize: ", marketInfo.quoteLotSize.toString());
    console.log("feeRateBps: ", marketInfo.feeRateBps.toString());
    console.log("referrerRebatesAccrued: ", marketInfo.referrerRebatesAccrued.toString());
    return marketAccount;
}

async function printMintInfo(connection: web3.Connection, umi: Umi, poolId: web3.PublicKey) {
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error(' get id info error ')
    const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

    const mint = mpl_umi.publicKey(poolInfo.baseMint);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    //console.log(asset);

    const baseDenominator = new BN(10).pow(poolInfo.baseDecimal);
    const quoteDenominator = new BN(10).pow(poolInfo.quoteDecimal);
    //Calculate burn percentage=======================================
    const lpReserve = poolInfo.lpReserve.toNumber() / baseDenominator.toNumber();
    const actualSupply = Number(asset.mint.supply) / baseDenominator.toNumber();
    const maxLpSupply = Math.max(actualSupply, (lpReserve - 1));
    const burnAmt = (maxLpSupply - actualSupply)
    const burnPercent = (burnAmt / lpReserve) * 100;

    //Calculate Holders Percentage====================================
    const tokenAccount = await spltoken.getAssociatedTokenAddress(poolInfo.baseMint, new web3.PublicKey(asset.metadata.updateAuthority));
    const ownerBalance = await connection.getTokenAccountBalance(tokenAccount);
    const ownerHoldPercent = BigInt(ownerBalance.value.amount) * BigInt(100) / asset.mint.supply;

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

    const ownerAllTokens = await getTokenAccountsByOwner(connection, new web3.PublicKey(asset.metadata.updateAuthority));
    //const tokenLargestAccounts = await connection.getTokenLargestAccounts(poolInfo.baseMint, 'finalized');
    //console.log(tokenLargestAccounts);

    const addedLpAccounts = ownerAllTokens.filter((a) =>
        a.accountInfo.mint.equals(poolInfo.lpMint)
    );
    let totalTokenOwnersAmt = 0;
    addedLpAccounts.forEach(function (a) {
        console.log("amnt: ", a.accountInfo.amount.toNumber());
        totalTokenOwnersAmt += a.accountInfo.amount.toNumber();
    });

    const liquidityAmount = Number(Number(quote * SOL_PRICE * 2 / base) * base).toFixed(0);

    console.log("MintInfo--------------------------------------------------------------");
    console.log("name: ", asset.metadata.name);
    console.log("symbol: ", asset.metadata.symbol);
    console.log("Supply: ", asset.mint.supply.toLocaleString());
    console.log("mintAuthority: ", mpl_umi.unwrapOption(asset.mint.mintAuthority));
    console.log("freezeAuthority: ", mpl_umi.unwrapOption(asset.mint.freezeAuthority));
    console.log("updateAuthority: ", asset.metadata.updateAuthority);
    console.log("isMutable: ", asset.metadata.isMutable);
    console.log("decimals: ", asset.mint.decimals.toString());
    console.log("IsInitialized: ", asset.mint.isInitialized);
    console.log("uri: ", asset.metadata.uri);
    console.log("sellerFeeBasisPoints: ", asset.metadata.sellerFeeBasisPoints);
    console.log("creators: ", mpl_umi.unwrapOption(asset.metadata.creators));
    console.log("primarySaleHappened: ", asset.metadata.primarySaleHappened);
    console.log("editionNonce: ", mpl_umi.unwrapOption(asset.metadata.editionNonce));
    console.log("tokenStandard: ", mpl_umi.unwrapOption(asset.metadata.tokenStandard));
    console.log("collection: ", mpl_umi.unwrapOption(asset.metadata.collection));
    console.log("uses: ", mpl_umi.unwrapOption(asset.metadata.uses));
    console.log("collectionDetails: ", mpl_umi.unwrapOption(asset.metadata.collectionDetails));
    console.log("programmableConfig: ", mpl_umi.unwrapOption(asset.metadata.programmableConfig));
    console.log("CalculatedInfo-------------------------------------------------------");
    console.log("Actual Supply: " + getFriendlyNumber(actualSupply));
    console.log("MaxLpSupply: ", getFriendlyNumber(maxLpSupply));
    console.log("Balance in LP: ", ((base * 100) / actualSupply).toFixed(1) + "%");
    console.log("Owner Balance:", ownerHoldPercent.toString() + '%' + " (" + ownerBalance.value.uiAmount + ")");
    console.log("Total owned by token accounts: " + totalTokenOwnersAmt / quoteDenominator.toNumber());
    console.log("Price in SOLs: " + Number(quote / base).toFixed(12));
    console.log("Price in USDs: ", Number(quote * SOL_PRICE / base).toFixed(12));
    console.log("Liquidity: ", liquidityAmount + "$");
    console.log("Burn amount: ", burnPercent + '%' + " (" + burnAmt + ")");
    console.log("pool total base: " + getFriendlyNumber(base));
    console.log("pool total quote: " + getFriendlyNumber(quote));
    console.log("base vault balance: " + getFriendlyNumber(baseTokenAmount.value.uiAmount || 0));
    console.log("quote vault balance: " + getFriendlyNumber(quoteTokenAmount.value.uiAmount || 0));
    console.log("base tokens in openorders: " + openOrdersBaseTokenTotal);
    console.log("quote tokens in openorders: " + openOrdersQuoteTokenTotal);
    console.log("total lp: " + poolInfo.lpReserve.toNumber() / baseDenominator.toNumber());
    console.log("addedLpAmount: " + (addedLpAccounts[0]?.accountInfo.amount.toNumber() || 0) / quoteDenominator.toNumber());
    console.log("CompactInfo----------------------------------------------------------");
    console.log("This owner has ", ownerAllTokens.length, " tokens at all.");
    console.log("symbol: ", asset.metadata.symbol, "(" + asset.metadata.name + ")");
    console.log("Actual Supply: " + getFriendlyNumber(actualSupply));
    console.log("MaxLpSupply: ", getFriendlyNumber(maxLpSupply));
    console.log("Balance in LP: ", ((base * 100) / actualSupply).toFixed(1) + "%");
    console.log("Owner Balance:", ownerHoldPercent.toString() + '%' + " (" + ownerBalance.value.uiAmount + ")");
    console.log("Total owned by token accounts: " + totalTokenOwnersAmt / quoteDenominator.toNumber());
    console.log("Price in SOLs: " + Number(quote / base).toFixed(12));
    console.log("Price in USDs: ", Number(quote * SOL_PRICE / base).toFixed(12));
    console.log("Liquidity: ", Number(Number(quote * SOL_PRICE / base) * base).toFixed(0), "$");
    console.log("Burn amount: ", burnPercent + '%' + " (" + burnAmt + ")");
    console.log("mintAuthority: ", mpl_umi.unwrapOption(asset.mint.mintAuthority));
    console.log("freezeAuthority: ", mpl_umi.unwrapOption(asset.mint.freezeAuthority));
    console.log("updateAuthority: ", asset.metadata.updateAuthority);
    console.log("isMutable: ", asset.metadata.isMutable);
    console.log("poolOpenTime: ", new Date(Number(poolInfo.poolOpenTime) * 1000).toLocaleString());
}

async function getTokenAccountsByOwner(connection: web3.Connection, owner: web3.PublicKey) {
    const tokenResp = await connection.getTokenAccountsByOwner(owner, {
        programId: token.TOKEN_PROGRAM_ID,
    });
    const accounts: TokenAccount[] = [];
    for (const { pubkey, account } of tokenResp.value) {
        accounts.push({
            pubkey,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
            programId: token.TOKEN_PROGRAM_ID
        });
    }
    return accounts;
}

function parsePoolInfoFromLpTransaction(txData: web3.ParsedTransactionWithMeta) {
    const initInstruction = findInstructionByProgramId(txData.transaction.message.instructions, new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as web3.PartiallyDecodedInstruction | null;
    if (!initInstruction) {
        throw new Error('Failed to find lp init instruction in lp init tx');
    }
    const baseMint = initInstruction.accounts[8];
    const baseVault = initInstruction.accounts[10];
    const quoteMint = initInstruction.accounts[9];
    const quoteVault = initInstruction.accounts[11];
    const lpMint = initInstruction.accounts[7];
    const baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
    const lpMintInitInstruction = findInitializeMintInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInitInstruction) {
        throw new Error('Failed to find lp mint init instruction in lp init tx');
    }
    const lpMintInstruction = findMintToInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInstruction) {
        throw new Error('Failed to find lp mint to instruction in lp init tx');
    }
    const baseTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], baseVault, token.TOKEN_PROGRAM_ID);
    if (!baseTransferInstruction) {
        throw new Error('Failed to find base transfer instruction in lp init tx');
    }
    const quoteTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], quoteVault, token.TOKEN_PROGRAM_ID);
    if (!quoteTransferInstruction) {
        throw new Error('Failed to find quote transfer instruction in lp init tx');
    }
    const lpDecimals = lpMintInitInstruction.parsed.info.decimals;
    const lpInitializationLogEntryInfo = extractLPInitializationLogEntryInfoFromLogEntry(findLogEntry('init_pc_amount', txData.meta?.logMessages ?? []) ?? '');
    const basePreBalance = (txData.meta?.preTokenBalances ?? []).find(balance => balance.mint === baseMint.toBase58());
    if (!basePreBalance) {
        throw new Error('Failed to find base tokens preTokenBalance entry to parse the base tokens decimals');
    }
    const baseDecimals = basePreBalance.uiTokenAmount.decimals;

    return {
        id: initInstruction.accounts[4],
        baseMint,
        quoteMint,
        lpMint,
        baseDecimals: baseAndQuoteSwapped ? SOL_DECIMALS : baseDecimals,
        quoteDecimals: baseAndQuoteSwapped ? baseDecimals : SOL_DECIMALS,
        lpDecimals,
        version: 4,
        programId: new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
        authority: initInstruction.accounts[5],
        openOrders: initInstruction.accounts[6],
        targetOrders: initInstruction.accounts[13],
        baseVault,
        quoteVault,
        withdrawQueue: new web3.PublicKey("11111111111111111111111111111111"),
        lpVault: new web3.PublicKey(lpMintInstruction.parsed.info.account),
        marketVersion: 3,
        marketProgramId: initInstruction.accounts[15],
        marketId: initInstruction.accounts[16],
        baseReserve: parseInt(baseTransferInstruction.parsed.info.amount),
        quoteReserve: parseInt(quoteTransferInstruction.parsed.info.amount),
        lpReserve: parseInt(lpMintInstruction.parsed.info.amount),
        openTime: lpInitializationLogEntryInfo.open_time,
    }
}

function findLogEntry(needle: string, logEntries: Array<string>): string | null {
    for (let i = 0; i < logEntries.length; ++i) {
        if (logEntries[i].includes(needle)) {
            return logEntries[i];
        }
    }

    return null;
}

function findTransferInstructionInInnerInstructionsByDestination(innerInstructions: Array<web3.ParsedInnerInstruction>, destinationAccount: web3.PublicKey, programId?: web3.PublicKey): web3.ParsedInstruction | null {
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as web3.ParsedInstruction;
            if (!instruction.parsed) { continue };
            if (instruction.parsed.type === 'transfer' && instruction.parsed.info.destination === destinationAccount.toBase58() && (!programId || instruction.programId.equals(programId))) {
                return instruction;
            }
        }
    }

    return null;
}

function findInitializeMintInInnerInstructionsByMintAddress(innerInstructions: Array<web3.ParsedInnerInstruction>, mintAddress: web3.PublicKey): web3.ParsedInstruction | null {
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as web3.ParsedInstruction;
            if (!instruction.parsed) { continue };
            if (instruction.parsed.type === 'initializeMint' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findMintToInInnerInstructionsByMintAddress(innerInstructions: Array<web3.ParsedInnerInstruction>, mintAddress: web3.PublicKey): web3.ParsedInstruction | null {
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as web3.ParsedInstruction;
            if (!instruction.parsed) { continue };
            if (instruction.parsed.type === 'mintTo' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findInstructionByProgramId(instructions: Array<web3.ParsedInstruction | web3.PartiallyDecodedInstruction>, programId: web3.PublicKey): web3.ParsedInstruction | web3.PartiallyDecodedInstruction | null {
    for (let i = 0; i < instructions.length; i++) {
        if (instructions[i].programId.equals(programId)) {
            return instructions[i];
        }
    }

    return null;
}

function extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string): { nonce: number, open_time: number, init_pc_amount: number, init_coin_amount: number } {
    const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');

    return JSON.parse(fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
}

function fixRelaxedJsonInLpLogEntry(relaxedJson: string): string {
    return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
}

async function getSolPrice() {
    var url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

    global.XMLHttpRequest = require("xhr2");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);

    xhr.setRequestHeader("accept", "application/json");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            SOL_PRICE = Number(JSON.parse(xhr.responseText).solana.usd);
        }
    };

    xhr.send();
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