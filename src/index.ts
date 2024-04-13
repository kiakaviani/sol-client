import * as web3 from "@solana/web3.js";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";

import { analyzeTokenByMintAddress, analyzeTokenByTxId } from "./token-analyzer";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
// const RAYDIUM_POOL_AUTHORITY = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
// const SOL_MINT = 'So11111111111111111111111111111111111111112';
// const SOL_DECIMALS = 9;

main();

async function main() {
  const endpoint = web3.clusterApiUrl('mainnet-beta');
  const connection = new web3.Connection(endpoint, {
    commitment: "confirmed",
  });
  const umi = mpl_umi_bundle.createUmi(connection);

  inputLoop(connection, umi);
}

function inputLoop(connection: web3.Connection, umi: mpl_umi.Umi) {
  const readline = require('readline');
  let rl = readline.createInterface(process.stdin, process.stdout);
  rl.setPrompt('input> ');
  rl.prompt();
  rl.on('line', async (line: string) => {
    if (line === "exit" || line === "quit" || line == 'q') {
      rl.close()
      return;
    }
    if (line === "help" || line === '?') {
      console.log(`commands:\n  [signature]\n  exit|quit|q\n`)
    } else if (line.length > 80) { // Check if the link length is at least 80 characters to avoid corrupt tx or link addresses.
      if (line.includes('www.dextools.io')) {
        try { await analyzeTokenByMintAddress(connection, umi, line.split('/').at(-1)!); } catch { console.log('Failed.'); }
      }
      else if (line.includes('solscan.io')) {
        try { await analyzeTokenByTxId(connection, umi, line.split('/').at(-1)!, RAYDIUM_POOL_V4_PROGRAM_ID); } catch { console.log('Failed.'); }
      }
      else {
        try { await analyzeTokenByTxId(connection, umi, line, RAYDIUM_POOL_V4_PROGRAM_ID); } catch { console.log('Failed.'); }
      }
    } else {
      console.log(`unknown command: "${line}"`)
    }
    rl.prompt()

  }).on('close', () => {
    console.log('exited.')
  });
}