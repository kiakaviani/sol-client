# Solana Scripting Template

This template is a starting point for writing scripts to interact with the Solana blockchain. 

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
## Projet Goals:
1. Interacting with standard solana spl token library:
   - Minting new tokens.
   - 
2. Interacting with Metaplex library for advanced token management:
   - Adding metadata while minting your tokens.
   - Querying other tokens metadata.
3. Interacting with raydium-sdk library.
   - sdf
## How it works:
1. Clone the project
2. Open it with vscode
3. install dependencies using command:
```bash
/> npm i
```
5. 
