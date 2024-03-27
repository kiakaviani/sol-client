// as used in https://www.youtube.com/watch?v=DQbt0-riooo

import * as web3 from "@solana/web3.js";

import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";

import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityPoolJsonInfo, LiquidityPoolKeys, LiquidityPoolKeysV4, LiquidityPoolStatus, MARKET_STATE_LAYOUT_V3, Market, Percent, SPL_ACCOUNT_LAYOUT, SPL_MINT_LAYOUT, Token, TokenAccount, TokenAmount, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";

import * as token from '@solana/spl-token'
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';

const MY_MPL_TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);
const MY_RAYDIUM_POOL_V4_PROGRAM_ID = new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);

const seenData: Array<string> = [];
var totalEventsCounter = 0;
var criteriaCounter = 0;

async function main() {
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    await subscribeToNewRaydiumPools(connection, umi);

    //////////////////////////////////////////////////////////////////

    /*const poolId = new web3.PublicKey('FFgH6WdgK8L3jube2iUxmnAUoN3zrzuZzJXd98zmE93X');
    console.log(poolId.toString());
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error(' get id info error ')
    PrintData(connection, umi, { accountId: poolId, accountInfo: account});*/
}

async function subscribeToNewRaydiumPools(connection: web3.Connection, umi: mpl_umi.Umi): Promise<void> {
    console.log('Listening to new pools...');
    connection.onProgramAccountChange(new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async (updatedAccountInfo) => {
        totalEventsCounter++;
        const poolId = updatedAccountInfo.accountId.toString();
        if (seenData.includes(poolId)) {
            return
        }
        seenData.push(poolId);
        PrintData(connection, umi, updatedAccountInfo);
        //getMetaplexAccountInfo(umi, updatedAccountInfo.accountId);
    });
}

async function PrintData(connection: web3.Connection, umi: mpl_umi.Umi, updatedAccountInfo: web3.KeyedAccountInfo) {
    const liquidity = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
    if (!liquidity.baseMint.toString().includes('11111111111111111111111111111111')) {
    //if (updatedAccountInfo.accountInfo.data.length > 752) {
        criteriaCounter++;
        console.log('\n========================================================================');
        console.log("TotalEvents: ", totalEventsCounter.toString(), " SeenData: ", seenData.length.toString(), " CriteriaCounter: ", criteriaCounter.toString());

        try {
            const targetPoolInfo = formatAmmKeysById(connection, updatedAccountInfo);
            console.log("targetPoolInfo------------------------------------------------------");
            console.log("baseMint: ", targetPoolInfo.baseMint);
            console.log("quoteMint: ", targetPoolInfo.quoteMint);
            console.log("lpMint: ", targetPoolInfo.lpMint);
            console.log("baseDecimals: ", targetPoolInfo.baseDecimals);
            console.log("quoteDecimals: ", targetPoolInfo.quoteDecimals);
            console.log("openOrders: ", targetPoolInfo.openOrders);
            console.log("targetOrders: ", targetPoolInfo.targetOrders);
            console.log("baseVault: ", targetPoolInfo.baseVault);
            console.log("quoteVault: ", targetPoolInfo.quoteVault);
            console.log("withdrawQueue: ", targetPoolInfo.withdrawQueue);
            console.log("lpVault: ", targetPoolInfo.lpVault);
            console.log("marketProgramId: ", targetPoolInfo.marketProgramId);
            console.log("marketId: ", targetPoolInfo.marketId);
            console.log("authority: ", targetPoolInfo.authority);
            console.log("marketAuthority: ", targetPoolInfo.marketAuthority);

            console.log('---------------------------------------------------------------------');
            console.log("poolId: ", updatedAccountInfo.accountId.toString());
            console.log("owner: ", updatedAccountInfo.accountInfo.owner.toString());
            console.log("executable: ", updatedAccountInfo.accountInfo.executable.toString());
            console.log("rentEpoch: ", updatedAccountInfo.accountInfo.rentEpoch?.toString());
            console.log("lamports: ", updatedAccountInfo.accountInfo.lamports.toString());
            console.log("space: ", updatedAccountInfo.accountInfo.data.length.toString());
            //console.log('ParsePoolInfo-------------------------------------------------------');
            //await parsePoolInfo(connection, updatedAccountInfo.accountInfo);
            /*console.log('Metaplex Asset------------------------------------------------------');
            const mint = mpl_umi.publicKey(liquidity.baseMint);
            const asset = await mpl.fetchDigitalAsset(umi, mint);
            console.log(asset);*/
        } catch { }
    }
}

export async function parsePoolInfo(connection: web3.Connection, laccount: web3.AccountInfo<Buffer>) {
    const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(laccount.data);

    const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
    const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();

    const baseTokenAmount = await connection.getTokenAccountBalance(
        poolState.baseVault
    );
    const quoteTokenAmount = await connection.getTokenAccountBalance(
        poolState.quoteVault
    );

    const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
    const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

    const base = (baseTokenAmount.value?.uiAmount || 0) - basePnl;
    const quote = (quoteTokenAmount.value?.uiAmount || 0) - quotePnl;

    const denominator = new BN(10).pow(poolState.baseDecimal);
    //const addedLpAccount = tokenAccounts.find((a) => a.accountInfo.mint.equals(poolState.lpMint));

    console.log("poolOpenTime: ", poolState.poolOpenTime);
    console.log("pool basePnl: ", basePnl);
    console.log("pool quotePnl: ", quotePnl);
    console.log("price in SOL: ", quote / base);
    console.log("pool total base: ", base);
    console.log("pool total quote: ", quote);
    console.log("base vault balance: ", baseTokenAmount.value.uiAmount);
    console.log("quote vault balance: ", quoteTokenAmount.value.uiAmount);
    console.log("base token decimals: ", poolState.baseDecimal.toNumber());
    console.log("quote token decimals: ", poolState.quoteDecimal.toNumber());
    console.log("total lp: ", poolState.lpReserve.div(denominator).toString());
}

function formatAmmKeysById(connection: web3.Connection, account: web3.KeyedAccountInfo) {

    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.accountInfo.data)

    return {
        id: account.accountId.toString(),
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: 0,
        version: 4,
        programId: "",
        authority: Liquidity.getAssociatedAuthority({ programId: account.accountInfo.owner }).publicKey.toString(),
        openOrders: info.openOrders.toString(),
        targetOrders: info.targetOrders.toString(),
        baseVault: info.baseVault.toString(),
        quoteVault: info.quoteVault.toString(),
        withdrawQueue: info.withdrawQueue.toString(),
        lpVault: info.lpVault.toString(),
        marketVersion: 3,
        marketProgramId: info.marketProgramId.toString(),
        marketId: info.marketId.toString(),
        marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
        marketBaseVault: "",
        marketQuoteVault: "",
        marketBids: "",
        marketAsks: "",
        marketEventQueue: "",
        poolOpenTime: info.poolOpenTime,
        lookupTableAccount: ""
    } as LiquidityPoolJsonInfo;
}

main()
