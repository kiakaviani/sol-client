// as used in https://www.youtube.com/watch?v=DQbt0-riooo

import * as web3 from "@solana/web3.js";

import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";

import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityPoolJsonInfo, LiquidityPoolKeys, LiquidityPoolKeysV4, MARKET_STATE_LAYOUT_V3, Market, Percent, SPL_MINT_LAYOUT, Token, TokenAmount, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";

import * as token from '@solana/spl-token'

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';

const MY_MPL_TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);
const MY_RAYDIUM_POOL_V4_PROGRAM_ID = new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);

const seenData: Array<string> = [];

async function main() {
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    //await subscribeToNewRaydiumPools(connection, umi);
    
    //////////////////////////////////////////////////////////////////
    const poolId = new web3.PublicKey('3tfrsu4KcTmgDyRrarnjT8trv9EgseF51KZSxsaujvru');
    console.log(poolId.toString());
    //////////////////////////////////////////////////////////////////
    const targetPoolInfo = await formatAmmKeysById(connection, poolId);
    console.log('targetPoolInfo------------------------------------------------------');
    console.log(targetPoolInfo);
    //////////////////////////////////////////////////////////////////
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeysV4;
    //////////////////////////////////////////////////////////////////
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });
    console.log('poolInfo------------------------------------------------------------');
    console.log('status: ', poolInfo.status.toNumber());
    console.log('baseDecimals: ', poolInfo.baseDecimals);
    console.log('quoteDecimals: ', poolInfo.quoteDecimals);
    console.log('lpDecimals: ', poolInfo.lpDecimals);
    console.log('baseReserve: ', poolInfo.baseReserve.toNumber());
    console.log('quoteReserve: ', poolInfo.quoteReserve.toNumber());
    console.log('lpSupply: ', poolInfo.lpSupply.toNumber());
    console.log('startTime: ', new Date(poolInfo.startTime.toNumber() * 1000).toLocaleString());
    //////////////////////////////////////////////////////////////////
    const amount = await calcAmountOut(connection, poolKeys, 1, true);
    console.log('amount--------------------------------------------------------------');
    console.log("amount: ", amount);
    //////////////////////////////////////////////////////////////////
    const mint = mpl_umi.publicKey(poolKeys.baseMint);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    console.log('Metaplex Asset------------------------------------------------------');
    console.log(asset);
}

async function subscribeToNewRaydiumPools(connection: web3.Connection, umi: mpl_umi.Umi): Promise<void> {
    console.log('Listening to new pools...');
    connection.onProgramAccountChange(new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async (updatedAccountInfo) => {
        const poolId = updatedAccountInfo.accountId.toString();
        if (seenData.includes(poolId)) {
            return
        }
        seenData.push(poolId);
        console.log('poolId: ', poolId);
        PrintData(connection, umi, updatedAccountInfo);
        //getMetaplexAccountInfo(umi, updatedAccountInfo.accountId);
    });
}

async function PrintData(connection: web3.Connection, umi: mpl_umi.Umi, updatedAccountInfo: web3.KeyedAccountInfo) {
    const liquidity = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);

    if (!liquidity.baseMint.toString().includes('11111111111111111111111111111111')) {
        try {
            const mint = mpl_umi.publicKey(liquidity.baseMint);
            const asset = await mpl.fetchDigitalAsset(umi, mint);
            console.log('====================================================================');
            console.log("accountId: ", updatedAccountInfo.accountId.toString());
            console.log("owner: ", updatedAccountInfo.accountInfo.owner.toString());
            console.log("lamports: ", updatedAccountInfo.accountInfo.lamports.toString());
            console.log("space: ", updatedAccountInfo.accountInfo.data.length.toString());
            console.log('Liquidity-----------------------------------------------------------');
            //console.log(liquidity ? liquidity : 'None');
            console.log(liquidity.baseMint.toString());
            console.log('Metaplex Asset------------------------------------------------------');
            console.log(asset);
            console.log('Market--------------------------------------------------------------');
            const marketAccountInfo = await connection.getAccountInfo(updatedAccountInfo.accountId);
            var market = null;
            if (marketAccountInfo)
                market = MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
            console.log(market ? market.baseMint.toString() : 'None');
        } catch { }
    }
}

async function formatAmmKeysById(connection: web3.Connection, id: web3.PublicKey) {
    const account = await connection.getAccountInfo(id);

    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)

    const marketId = info.marketId
    const marketAccount = await connection.getAccountInfo(marketId)
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)

    const lpMint = info.lpMint
    const lpMintAccount = await connection.getAccountInfo(lpMint)
    if (lpMintAccount === null) throw Error(' get lp mint info error')
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)

    return {
        id: id.toString(),
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: lpMintInfo.decimals,
        version: 4,
        programId: account.owner.toString(),
        authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
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
        marketBaseVault: marketInfo.baseVault.toString(),
        marketQuoteVault: marketInfo.quoteVault.toString(),
        marketBids: marketInfo.bids.toString(),
        marketAsks: marketInfo.asks.toString(),
        marketEventQueue: marketInfo.eventQueue.toString(),
        lookupTableAccount: web3.PublicKey.default.toString()
    } as LiquidityPoolJsonInfo;
}

export async function calcAmountOut(connection: web3.Connection, poolKeys: LiquidityPoolKeys, rawAmountIn: number, swapInDirection: boolean) {
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });
    let currencyInMint = poolKeys.baseMint;
    let currencyInDecimals = poolInfo.baseDecimals;
    let currencyOutMint = poolKeys.quoteMint;
    let currencyOutDecimals = poolInfo.quoteDecimals;

    if (!swapInDirection) {
        currencyInMint = poolKeys.quoteMint;
        currencyInDecimals = poolInfo.quoteDecimals;
        currencyOutMint = poolKeys.baseMint;
        currencyOutDecimals = poolInfo.baseDecimals;
    }

    const currencyIn = new Token(RAYDIUM_POOL_V4_PROGRAM_ID, currencyInMint, currencyInDecimals);
    const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
    const currencyOut = new Token(RAYDIUM_POOL_V4_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
    const slippage = new Percent(5, 100); // 5% slippage

    const {
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
    } = Liquidity.computeAmountOut({ poolKeys, poolInfo, amountIn, currencyOut, slippage, });

    return {
        amountIn,
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
    };
}

main()/*.then(() => {
    console.log("Finished successfully")
    process.exit(0)
}).catch((error) => {
    console.log(error)
    process.exit(1)
})*/
