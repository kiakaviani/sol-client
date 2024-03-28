# Solana Scripting Template

This template is a starting point for writing scripts to interact with the Solana blockchain. 

## Projet Structure:
```bash
+---src
        external-apis.ts             // Methods to communicate with external APIs like coingecko.com
        index.ts                     // The starting point of run the project and use other methods
        initializeKeypair.ts         // Helpers to generate keypairs.
        metaplex-manager.ts          // Methods to communicate with the Metaplex library.
        raydium-pool-manager.ts      // Methods to communicate with the Raydium Pool.
        spl-token-helpers.ts         // Methods to interacting with standard solana spl token library.
        telegram-client.ts           // Methods to interacting with Telegram APIs.
        token-analyzer.ts            // Methods to analyze a solana token.
        transaction-manager.ts       // Methods to extract data from transactions.
```
## Projet Goals:
1. Interacting with standard solana spl token library:
   - Get token associated accounts.
   - 
2. Interacting with Metaplex library for advanced token management:
   - Adding metadata while minting your tokens.
   - Querying other tokens metadata.
3. Interacting with raydium-sdk library.
   - sdf
