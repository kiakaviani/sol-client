
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


export interface RawMint {
    mintAuthorityOption: 1 | 0;
    mintAuthority: web3.PublicKey;
    supply: bigint;
    decimals: number;
    isInitialized: boolean;
    freezeAuthorityOption: 1 | 0;
    freezeAuthority: web3.PublicKey;
}

export const MintLayout = struct<RawMint>([
    u32('mintAuthorityOption'),
    publicKey('mintAuthority'),
    u64('supply'),
    u8('decimals'),
    bool('isInitialized'),
    u32('freezeAuthorityOption'),
    publicKey('freezeAuthority'),
]);

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;

const seenData: Array<string> = []; // The log listener is sometimes triggered multiple times for a single transaction, don't react to tranasctions we've already seen
var totalEventsCounter = 0;
var criteriaCounter = 0;

main()

async function main() {
    const endpoint = web3.clusterApiUrl('mainnet-beta');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);

    await subscribeToNewRaydiumPools(connection, umi);
    /*fetchPoolKeysForLPInitTransactionHash('ZbHyPb8caHL8dEk3zBsCaNhb5SzGn8J5wzhNhChFTdPZUsUvW7TkcbMtdknqwWfdyoY5Ty3xSWNtvChzKDZvqC9').then((poolKeys) => {
        PrintData(poolKeys);
    });*/
}

async function PrintData(connection: web3.Connection, poolKeys: LiquidityPoolKeysV4) {
    let { data } = await connection.getAccountInfo(poolKeys.baseMint) || {};
    if (!data) { return; }
    const deserialize = MintLayout.decode(data);
    const tokenAccount = await spltoken.getAssociatedTokenAddress(poolKeys.baseMint, deserialize.mintAuthority);
    const ownerBalance = await connection.getTokenAccountBalance(tokenAccount);
    const ownerHoldPercent = BigInt(ownerBalance.value.amount) * BigInt(100) / deserialize.supply;

    //const amount = await calcAmountOut(connection, poolKeys, 1, true);
    //console.log("amount: ", amount);

    console.log("Mint Address: ", poolKeys.baseMint.toString());
    console.log("Quote Address: ", poolKeys.quoteMint.toString());
    console.log("LP Address: ", poolKeys.lpMint.toString());
    console.log("Supply: ", deserialize.supply.toString());
    console.log("Decimals: ", deserialize.decimals.toString());
    console.log("IsInitialized: ", deserialize.isInitialized);
    console.log("mintAuthorityOption: ", deserialize.mintAuthorityOption);
    console.log("mintAuthority: ", deserialize.mintAuthority.toString());
    console.log("freezeAuthorityOption: ", deserialize.freezeAuthorityOption);
    console.log("freezeAuthority: ", deserialize.freezeAuthority.toString());
    console.log("Owner Balance:", ownerHoldPercent.toString() + '%');
    //console.log(poolKeys);
}

async function PrintData2(connection: web3.Connection, umi: Umi, signature: string) {
    console.log('\n========================================================================');
    console.log("Signature for 'init_pc_amount':", signature);
    console.log(`https://solscan.io/tx/${signature}`);
    const liquidity = await fetchPoolKeysForLPInitTransactionHash(connection, signature); // With poolKeys you can do a swap
    //if (!liquidity.baseMint.toString().includes('11111111111111111111111111111111')) {
        //if (updatedAccountInfo.accountInfo.data.length > 752) {
        console.log("TotalEvents: ", totalEventsCounter.toString(), " SeenData: ", seenData.length.toString(), " CriteriaCounter: ", criteriaCounter.toString());

        try {
            const targetPoolInfo = formatAmmKeysById(liquidity);
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
            //console.log('ParsePoolInfo-------------------------------------------------------');
            //await parsePoolInfo(connection, updatedAccountInfo.accountInfo);
            /*console.log('Metaplex Asset------------------------------------------------------');
            const mint = mpl_umi.publicKey(liquidity.baseMint);
            const asset = await mpl.fetchDigitalAsset(umi, mint);
            console.log(asset);*/
        } catch { }
    //}
}

async function subscribeToNewRaydiumPools(connection: web3.Connection, umi: mpl_umi.Umi): Promise<void> {
    console.log('Listening to new pools...');

    const subscriptionId = connection.onLogs(new web3.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async ({ logs, err, signature }) => {
        totalEventsCounter++;
        //process.stdout.write('.');
        if (err) {
            //console.log("Has error.");
            return;
        }
        if (seenData.includes(signature)) {
            //console.log("Seen before.");
            return;
        }
        seenData.push(signature);

        //console.log("TotalEvents: ", totalEventsCounter.toString(), " SeenData: ", seenData.length.toString(), " CriteriaCounter: ", criteriaCounter.toString());
        process.stdout.write('.');
        
        /*if (logs && logs.some(log => log.includes("initialize2"))) {
            console.log("Signature for 'initialize2':", signature);
        }*/

        if (logs && (logs.some(log => log.includes("init_pc_amount")) || logs.some(log => log.includes("initialize2")))) {
            criteriaCounter++;
            PrintData2(connection, umi, signature);
            //console.log(poolKeys);
        }
    },
        "finalized"
    );
}

async function fetchPoolKeysForLPInitTransactionHash(connection: web3.Connection, txSignature: string): Promise<LiquidityPoolKeysV4> {
    const tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
        throw new Error('Failed to fetch transaction with signature ' + txSignature);
    }
    const poolInfo = parsePoolInfoFromLpTransaction(tx);
    const marketInfo = await fetchMarketInfo(connection, poolInfo.marketId);

    return {
        id: poolInfo.id,
        baseMint: poolInfo.baseMint,
        quoteMint: poolInfo.quoteMint,
        lpMint: poolInfo.lpMint,
        baseDecimals: poolInfo.baseDecimals,
        quoteDecimals: poolInfo.quoteDecimals,
        lpDecimals: poolInfo.lpDecimals,
        version: 4,
        programId: poolInfo.programId,
        authority: poolInfo.authority,
        openOrders: poolInfo.openOrders,
        targetOrders: poolInfo.targetOrders,
        baseVault: poolInfo.baseVault,
        quoteVault: poolInfo.quoteVault,
        withdrawQueue: poolInfo.withdrawQueue,
        lpVault: poolInfo.lpVault,
        marketVersion: 3,
        marketProgramId: poolInfo.marketProgramId,
        marketId: poolInfo.marketId,
        marketAuthority: Market.getAssociatedAuthority({ programId: poolInfo.marketProgramId, marketId: poolInfo.marketId }).publicKey,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
    } as LiquidityPoolKeysV4;
}

async function fetchMarketInfo(connection: web3.Connection, marketId: web3.PublicKey) {
    const marketAccountInfo = await connection.getAccountInfo(marketId);
    if (!marketAccountInfo) {
        throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
    }

    return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
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






function formatAmmKeysById(info: any) {

    return {
        id: info.id.toString(),
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        baseDecimals: info.baseDecimals,
        quoteDecimals: info.quoteDecimals,
        lpDecimals: 0,
        version: 4,
        programId: "",
        authority: "",
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
        lookupTableAccount: ""
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