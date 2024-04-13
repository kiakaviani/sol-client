# Introduction

This project is a starting point for writing scripts to interact with the Solana blockchain. 

## Projet Structure:
```bash
+---src
        external-apis.ts             // Communicate with external APIs like coingecko.com
        index.ts                     // The starting point of running the project
        initializeKeypair.ts         // Helpers to generate keypairs.
        metaplex-manager.ts          // Interacting with the Metaplex library.
        raydium-pool-manager.ts      // Interacting with the Raydium Pool.
        spl-token-helpers.ts         // Interacting with standard solana spl token library.
        telegram-client.ts           // Interacting with Telegram APIs.
        token-analyzer.ts            // Methods to analyze a solana token trust level.
        transaction-manager.ts       // Methods to extracting data from transactions.
```
## Features:
1. Interacting with standard solana spl token library (spl-token-helpers.ts):
   - Minting new tokens.
   - Queriny token accounts and informations.
2. Interacting with Metaplex foundation standards for advanced token management (metaplex-manager.ts):
   - Adding metadata while minting your tokens.
   - Querying other tokens metadata.
3. Interacting with raydium-sdk library (raydium-pool-manager.ts):
   - Getting liquidity pool informations of a solana token ( LIQUIDITY_STATE_LAYOUT_V4 )
4. Communicate with external APIs like coingecko.com and rugcheck.xyz for additional data (external-apis.ts)
## Getting started:
1. Clone the project
```bash
/> git clone https://github.com/kiakaviani/sol-client.git
```
2. Open it with vscode
3. install dependencies using command:
```bash
/> npm i
```
4. run the index.ts with the following commad:
```bash
/> npm run start
```
## How it works (simple):
By default 'index.ts' executes an infinite loop that gets the transaction id of a solana token mint instruction and extracts iformation from it.

(You can find the mint transaction Id of a solana token by going to dex explorers like https://www.dextools.io/app/en/solana/pool-explorer and click on the transaction icon as shown in the following image)

![Screenshot of dextool.io](https://github.com/kiakaviani/sol-client/blob/main/assets/dextools.png)

After finding txId, just run the scipt using 'npm run start' command and past the txId in the command line input, following informations will appear:
  - Liquidity pool information (using raydium-sdk)
  - Mint information (using metaplex-foundation)
  - Market information (using raydium-sdk)
  - Simple and upgradable logic to analyze extracted information like token liquidity amount, token mint disabled and freeze disabled flags, token burn amount, token owners share percentage and many more. (you can define even much more)
  - Rug pool risk check using rugcheck.xyz provided API (using provided methods in external-apis.ts file. you can change it with another one)

## How it works (advanced):
You can use methods provided in metaplex-manager.ts, raydium-pool-manager.ts and spl-token-helpers.ts by uncommenting them on index.js.

**Do not forget to comment other sections when testing each section.**
