// as used in https://www.youtube.com/watch?v=DQbt0-riooo

import * as web3 from "@solana/web3.js";

import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";

import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';

const seenData: Array<string> = [];

async function main() {
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    await subscribeToNewRaydiumPools(connection, umi);
    //console.log("Main: Mint Transaction: ", new TextDecoder().decode(tx.signature));
    //console.log("Main: Mint Token: ", mint.publicKey);
}

async function subscribeToNewRaydiumPools(connection: web3.Connection, umi: mpl_umi.Umi): Promise<void> {
    console.log('Listening to new pools...');
    connection.onProgramAccountChange(new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async (updatedAccountInfo) => {
        const poolId = updatedAccountInfo.accountId.toString();
        if (seenData.includes(poolId)) {
            return
        }
        seenData.push(poolId);
        console.log(poolId);
        PrintData(connection, umi, updatedAccountInfo);
        //getMetaplexAccountInfo(umi, updatedAccountInfo.accountId);
    });
}

async function PrintData(connection: web3.Connection, umi: mpl_umi.Umi, updatedAccountInfo: web3.KeyedAccountInfo) {
    const liquidity = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
    const marketAccountInfo = await connection.getAccountInfo(updatedAccountInfo.accountId);
    var market = null;
    if (marketAccountInfo) 
        market = MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);

    console.log('====================================================================');
    console.log("accountId: ", updatedAccountInfo.accountId.toString());
    console.log("owner: ", updatedAccountInfo.accountInfo.owner.toString());
    console.log("lamports: ", updatedAccountInfo.accountInfo.lamports.toString());
    console.log("space: ", updatedAccountInfo.accountInfo.data.length.toString());
    console.log('Liquidity-----------------------------------------------------------');
    if(liquidity) {
        //console.log(liquidity ? liquidity : 'None');
        console.log(liquidity.baseMint);
        //console.log('Market--------------------------------------------------------------');
        //console.log(market ? market : 'None');
        console.log('Metaplex Asset------------------------------------------------------');
        const mint = mpl_umi.publicKey(liquidity.baseMint);
        const asset = await mpl.fetchDigitalAsset(umi, mint);
        console.log(asset);
    }
}

async function getMetaplexAccountInfo(umi: mpl_umi.Umi, poolAccountId: web3.PublicKey) {
    const mint = mpl_umi.publicKey(poolAccountId);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    console.log(asset);
}

main()/*.then(() => {
    console.log("Finished successfully")
    process.exit(0)
}).catch((error) => {
    console.log(error)
    process.exit(1)
})*/
