import * as web3 from "@solana/web3.js";
import * as token from '@solana/spl-token'
import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3, SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";

export async function getTokenAccountsByOwner(connection: web3.Connection, owner: web3.PublicKey) {
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

export async function getPoolKeys(connection: web3.Connection, poolId: web3.PublicKey) {
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error('error: get pool id info')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);
    return info;
}

export async function printPoolKeys(connection: web3.Connection, poolId: web3.PublicKey) {
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error('error: get pool id info')
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

export async function getMerketInfo(connection: web3.Connection, marketId: web3.PublicKey) {
    const marketAccount = await connection.getAccountInfo(marketId);
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
    return marketInfo;
}

export async function printMerketInfo(connection: web3.Connection, marketId: web3.PublicKey) {
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