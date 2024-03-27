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
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;

const MY_MPL_TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);
const MY_RAYDIUM_POOL_V4_PROGRAM_ID = new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);

main();

async function main() {
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    /*const poolId = new web3.PublicKey('FFgH6WdgK8L3jube2iUxmnAUoN3zrzuZzJXd98zmE93X');
    console.log(poolId.toString());
    const account = await connection.getAccountInfo(poolId);
    if (account === null) throw Error(' get id info error ')
    PrintData(connection, umi, { accountId: poolId, accountInfo: account});*/

    const baseMint = new web3.PublicKey('81b5xsHbHDyGwiyTobjubmzaNJThdhKmZqJG2oUEmoCX');
    const quoteMint = new web3.PublicKey(SOL_MINT);
    const accounts = await fetchOpenBookAccounts(connection, baseMint, quoteMint);
    console.log(accounts[0]);
    const pools = await fetchMarketAccounts(connection, baseMint, quoteMint);
    console.log(pools[0]);
}

export async function fetchOpenBookAccounts(connection: web3.Connection, baseMint: web3.PublicKey, quoteMint: web3.PublicKey) {
    const accounts = await connection.getProgramAccounts(
        new web3.PublicKey(SERUM_OPENBOOK_PROGRAM_ID),
        {
            filters: [
                { dataSize: MARKET_STATE_LAYOUT_V3.span },
                {
                    memcmp: {
                        offset: MARKET_STATE_LAYOUT_V3.offsetOf("baseMint"),
                        bytes: baseMint.toBase58(),
                    },
                },
                {
                    memcmp: {
                        offset: MARKET_STATE_LAYOUT_V3.offsetOf("quoteMint"),
                        bytes: quoteMint.toBase58(),
                    },
                },
            ],
        }
    );

    return accounts.map(({ account }) => MARKET_STATE_LAYOUT_V3.decode(account.data));
}

// Define a function to fetch and decode Market accounts
export async function fetchMarketAccounts(connection: web3.Connection, baseMint: web3.PublicKey, quoteMint: web3.PublicKey) {
    const accounts = await connection.getProgramAccounts(
        new web3.PublicKey(SERUM_OPENBOOK_PROGRAM_ID),
        {
            filters: [
                { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
                {
                    memcmp: {
                        offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
                        bytes: baseMint.toBase58(),
                    },
                },
                {
                    memcmp: {
                        offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
                        bytes: quoteMint.toBase58(),
                    },
                },
            ],
        }
    );

    return accounts.map(({ pubkey, account }) => ({
        id: pubkey.toString(),
        ...LIQUIDITY_STATE_LAYOUT_V4.decode(account.data),
    }));
}