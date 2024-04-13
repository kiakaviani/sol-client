import { initializeKeypair } from "./initializeKeypair"
import * as web3 from "@solana/web3.js"
import * as token from '@solana/spl-token'
import * as tokenMetadata from '@solana/spl-token-metadata';

async function createNewMint(connection: web3.Connection, payer: web3.Keypair, mintAuthority: web3.PublicKey, freezeAuthority: web3.PublicKey, decimals: number): Promise<web3.PublicKey> {
    const lamports = await token.getMinimumBalanceForRentExemptMint(connection)
    console.log("Token Mint: MinimumBalanceForRentExemptMint:", lamports / web3.LAMPORTS_PER_SOL);
    const tokenMint = await token.createMint(connection, payer, mintAuthority, freezeAuthority, decimals);
    console.log(`Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`);
    return tokenMint;
}

async function createAssociatedTokenAccount(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey, owner: web3.PublicKey) {
    const tokenAccount = await token.getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);
    console.log(`Associated Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`);
    return tokenAccount
}

async function mintTokens(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey, destination: web3.PublicKey, authority: web3.Keypair, amount: number) {
    const transactionSignature = await token.mintTo(connection, payer, mint, destination, authority, amount);
    console.log(`Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function approveDelegate(connection: web3.Connection, payer: web3.Keypair, account: web3.PublicKey, delegate: web3.PublicKey, owner: web3.Signer | web3.PublicKey, amount: number) {
    const transactionSignature = await token.approve(connection, payer, account, delegate, owner, amount);
    console.log(`Approve Delegate Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function revokeDelegate(connection: web3.Connection, payer: web3.Keypair, account: web3.PublicKey, owner: web3.Signer | web3.PublicKey) {
    const transactionSignature = await token.revoke(connection, payer, account, owner);
    console.log(`Revote Delegate Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function transferTokens(connection: web3.Connection, payer: web3.Keypair, source: web3.PublicKey, destination: web3.PublicKey, owner: web3.Keypair, amount: number) {
    const transactionSignature = await token.transfer(connection, payer, source, destination, owner, amount);
    console.log(`Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function burnTokens(connection: web3.Connection, payer: web3.Keypair, account: web3.PublicKey, mint: web3.PublicKey, owner: web3.Keypair, amount: number) {
    const transactionSignature = await token.burn(connection, payer, account, mint, owner, amount);
    console.log(`Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function disableMint(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey) {
    // this sets the mint authority to null
    const transactionSignature = await token.setAuthority(connection, payer, mint, payer.publicKey, token.AuthorityType.MintTokens, null);
    console.log(`Disable Mint Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function disableFreeze(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey) {
    // this sets the mint authority to null
    const transactionSignature = await token.setAuthority(connection, payer, mint, payer.publicKey, token.AuthorityType.FreezeAccount, null);
    console.log(`Disable Freeze Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function grantFreezeAuthotiry(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey, account: web3.PublicKey) {
    // this sets the mint authority to null
    const transactionSignature = await token.setAuthority(connection, payer, mint, payer.publicKey, token.AuthorityType.FreezeAccount, account);
    console.log(`Disable Freeze Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function getAllWalletAccounts(connection: web3.Connection, wallet: string) {
    const accounts = await connection.getParsedProgramAccounts(
        token.TOKEN_PROGRAM_ID, 
        {
            filters: [
                {
                    dataSize: 165, // number of bytes
                },
                {
                    memcmp: {
                        offset: 32, // number of bytes
                        bytes: wallet, // base58 encoded string
                    },
                },
            ],
        }
    );

    console.log(`Found ${accounts.length} token account(s) for wallet ${wallet}: `);
    accounts.forEach((account, i) => {
        console.log(`Token Account Address ${i + 1}: ${account.pubkey.toString()}`);
        console.log(account.account.data);
        //console.log(`Amount: ${account.account.data["parsed"]["info"]["tokenAmount"]["uiAmount"]}`);
    });
}

async function getTokenLargestAccounts(connection: web3.Connection, mint: web3.PublicKey) {
    const accounts = await connection.getTokenLargestAccounts(mint);

    console.log(`Found ${accounts.value.length} token account(s) for program ${mint}: `);
    accounts.value.forEach((value, i) => {
        console.log(`${i + 1}: ${value.address} -> ${value.uiAmountString}`);
    });
}


//Usage Examples=================================================================
export async function splmain() {
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"), {
        commitment: "confirmed",
    });

    const user = await initializeKeypair(connection)

    //const mint = await createNewMint(connection, user, user.publicKey, user.publicKey, 2);
    const mint = new web3.PublicKey('YOUR MINT ADDRESS');

    const mintInfo = await token.getMint(connection, mint);
    //console.log("Main: mintInfo = ", mintInfo);

    const associatedTokenAccount = await createAssociatedTokenAccount(connection, user, mint, user.publicKey);
    //const associatedTokenAccount = new web3.PublicKey('YOUR ACCOUNT ADDRESS');
    //console.log("Main: associatedTokenAccount = ", associatedTokenAccount);

    //await mintTokens(connection, user, mint, associatedTokenAccount, user, 1700 * 10 ** mintInfo.decimals);

    //const receiver = web3.Keypair.generate().publicKey;
    const receiver = new web3.PublicKey('YOUR PUBLIC KEY');
    const receiverTokenAccount = await createAssociatedTokenAccount(connection, user, mint, receiver);

    //const delegate = web3.Keypair.generate();
    //await approveDelegate(connection, user, associatedTokenAccount, delegate.publicKey, user.publicKey, 50 * 10 ** mintInfo.decimals);

    //await transferTokens(connection, user, associatedTokenAccount, receiverTokenAccount.address, delegate, 50 * 10 ** mintInfo.decimals);
    await transferTokens(connection, user, associatedTokenAccount.address, receiverTokenAccount.address, user, 5 * 10 ** mintInfo.decimals);

    //await revokeDelegate(connection, user, associatedTokenAccount, user.publicKey);

    //await burnTokens(connection, user, associatedTokenAccount.address, mint, user, 5 * 10 ** mintInfo.decimals);

    //await disableMint(connection, user, mint);

    //await grantFreezeAuthotiry(connection, user, mint, associatedTokenAccount);

    //await disableFreeze(connection, user, mint);

    //await getAllWalletAccounts(connection, 'WALLET ADDRESS');
    await getTokenLargestAccounts(connection, mint);
}
