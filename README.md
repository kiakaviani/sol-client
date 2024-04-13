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
1. Interacting with standard solana spl token library:
   - Minting new tokens.
   - 
2. Interacting with Metaplex library for advanced token management:
   - Adding metadata while minting your tokens.
   - Querying other tokens metadata.
3. Interacting with raydium-sdk library.
   - sdf
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
## How it works:
By default 'index.ts' executes an infinite loop that gets the transaction id of a solana token mint instruction and extracts iformation from it.
(you can fing txId of a solana mint by going to dex explorers like https://www.dextools.io/app/en/solana/pool-explorer and click on the transaction icon as shown in the following image)
![Screenshot of dextool.io](https://github.com/kiakaviani/sol-client/blob/main/assets/dextools.png)
After finding txId, just run the scipt using 'npm run start' command and past the txId in the command line input, following informations will appear:
  - Liquidity pool information
  - mint information
  - market information
  - analyze extracted information with some simple logics like token liquidity amount, token mint and freeze disabled flags, token burn amount, token owners share percentage and many more (you can define even much more)
  - rug pool risk check using rugcheck.xyz provided API (just for test, you can change it with another one)
