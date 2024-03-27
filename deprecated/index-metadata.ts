import { initializeKeypair } from "../src/initializeKeypair"
import * as web3 from "@solana/web3.js"
import * as token from '@solana/spl-token'
import * as tokenMetadata from '@solana/spl-token-metadata';

async function calculateRentExempt(connection: web3.Connection, metaData: tokenMetadata.TokenMetadata) {
    // Size of MetadataExtension 2 bytes for type, 2 bytes for length
    const metadataExtension = token.TYPE_SIZE + token.LENGTH_SIZE;
    // Size of metadata
    const metadataLen = tokenMetadata.pack(metaData).length;
    // Size of Mint Account with extension
    const mintLen = token.getMintLen([token.ExtensionType.MetadataPointer]);
    // Minimum lamports required for Mint Account
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
    return [mintLen, lamports];
}


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

async function transferTokens(connection: web3.Connection, payer: web3.Keypair, source: web3.PublicKey, destination: web3.PublicKey, owner: web3.Keypair, amount: number) {
    const transactionSignature = await token.transfer(connection, payer, source, destination, owner, amount);
    console.log(`Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
}

async function revokeDelegate(connection: web3.Connection, payer: web3.Keypair, account: web3.PublicKey, owner: web3.Signer | web3.PublicKey) {
    const transactionSignature = await token.revoke(connection, payer, account, owner);
    console.log(`Revote Delegate Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
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
        token.TOKEN_PROGRAM_ID, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
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

async function main() {
    //const connection = new web3.Connection(web3.clusterApiUrl("devnet"))
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"), {
        commitment: "confirmed",
    });

    const user = await initializeKeypair(connection)

    let transaction: web3.Transaction;
    let transactionSignature: string;
    const mintKeypair = web3.Keypair.generate();
    const mint = mintKeypair.publicKey;
    const decimals = 2;
    const mintAuthority = user.publicKey;
    const freezeAuthority = user.publicKey;
    const updateAuthority = user.publicKey;

    const metaData: tokenMetadata.TokenMetadata = {
        updateAuthority: updateAuthority,
        mint: mint,
        name: 'REPTILE',
        symbol: 'RPTL',
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        additionalMetadata: [["description", "Only Possible On Solana"], ["Background", "Blue"], ["WrongData", "DeleteMe!"], ["Points", "0"]],
    };

    const [mintLen, lamports] = await calculateRentExempt(connection, metaData);
    console.log('mintLen= ', mintLen, ' lamports= ', lamports);

    const createAccountInstruction = web3.SystemProgram.createAccount({
        fromPubkey: user.publicKey, // Account that will transfer lamports to created account
        newAccountPubkey: mint, // Address of the account to create
        space: mintLen, // Amount of bytes to allocate to the created account
        lamports, // Amount of lamports transferred to created account
        programId: token.TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
    });

    // Instruction to initialize the MetadataPointer Extension
    const initializeMetadataPointerInstruction = token.createInitializeMetadataPointerInstruction(
        mint, // Mint Account address
        updateAuthority, // Authority that can set the metadata address
        mint, // Account address that holds the metadata, In this example, the metadata pointer will point to the Mint address, indicating that the metadata will be stored directly on the Mint Account.
        token.TOKEN_2022_PROGRAM_ID,
    );

    // Instruction to initialize Mint Account data
    const initializeMintInstruction = token.createInitializeMintInstruction(
        mint, // Mint Account Address
        decimals, // Decimals of Mint
        mintAuthority, // Designated Mint Authority
        freezeAuthority, // Optional Freeze Authority
        token.TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    // Instruction to initialize Metadata Account data
    const initializeMetadataInstruction = tokenMetadata.createInitializeInstruction({
        programId: token.TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
        metadata: mint, // Account address that holds the metadata
        updateAuthority: updateAuthority, // Authority that can update the metadata
        mint: mint, // Mint Account address
        mintAuthority: mintAuthority, // Designated Mint Authority
        name: metaData.name,
        symbol: metaData.symbol,
        uri: metaData.uri,
    });

    // Instruction to update metadata, adding custom field
    const updateFieldInstruction = tokenMetadata.createUpdateFieldInstruction({
        programId: token.TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
        metadata: mint, // Account address that holds the metadata
        updateAuthority: updateAuthority, // Authority that can update the metadata
        field: metaData.additionalMetadata[0][0], // key
        value: metaData.additionalMetadata[0][1], // value
    });

    // Add instructions to new transaction
    transaction = new web3.Transaction().add(
        createAccountInstruction,
        initializeMetadataPointerInstruction,
        // note: the above instructions are required before initializing the mint
        initializeMintInstruction,
        initializeMetadataInstruction,
        updateFieldInstruction,
    );

    // Send transaction
    transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [user, mintKeypair], // Signers
    );

    console.log("\nCreate Mint Account:", `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);

    // Retrieve mint information
    const mintInfo = await token.getMint(
        connection,
        mint,
        "confirmed",
        token.TOKEN_2022_PROGRAM_ID,
    );

    // Retrieve and log the metadata pointer state
    const metadataPointer = token.getMetadataPointerState(mintInfo);
    console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));

    // Retrieve and log the metadata state
    const metadata = await token.getTokenMetadata(connection, mint);
    console.log("\nMetadata:", JSON.stringify(metadata, null, 2));




    /*
    // Instruction to remove a key from the metadata
    const removeKeyInstruction = tokenMetadata.createRemoveKeyInstruction({
        programId: token.TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
        metadata: mint, // Address of the metadata
        updateAuthority: updateAuthority, // Authority that can update the metadata
        key: metaData.additionalMetadata[0][0], // Key to remove from the metadata
        idempotent: true, // If the idempotent flag is set to true, then the instruction will not error if the key does not exist
    });

    transaction = new web3.Transaction().add(removeKeyInstruction);

    // Send transaction
    transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [user],
    );

    console.log("\nRemove Additional Metadata Field:", `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`);

    // Retrieve and log the metadata state
    const updatedMetadata = await token.getTokenMetadata(connection, mint);
    console.log("\nUpdated Metadata:", JSON.stringify(updatedMetadata, null, 2));

    console.log("\nMint Account:", `https://solana.fm/address/${mint}?cluster=devnet-solana`);
    */









    // const associatedTokenAccount = await createAssociatedTokenAccount(connection, user, mint, user.publicKey);
    // const associatedTokenAccount = new web3.PublicKey('DmAofCbdT164tTodvtUd2QAGJR8wMuzzXgVf6JLXASJ9');
    // console.log("Main: associatedTokenAccount = ", associatedTokenAccount);

    // await mintTokens(connection, user, mint, associatedTokenAccount, user, 1700 * 10 ** mintInfo.decimals);

    // const receiver = web3.Keypair.generate().publicKey;
    // const receiver = new web3.PublicKey('GKp9TdTmQ9HBVYezABs7ikfFs7DmLeHHnB2ZXGPgGsKA');
    // const receiverTokenAccount = await createAssociatedTokenAccount(connection, user, mint, receiver);

    // const delegate = web3.Keypair.generate();
    // await approveDelegate(connection, user, associatedTokenAccount, delegate.publicKey, user.publicKey, 50 * 10 ** mintInfo.decimals);

    // await transferTokens(connection, user, associatedTokenAccount, receiverTokenAccount.address, delegate, 50 * 10 ** mintInfo.decimals);
    // await transferTokens(connection, user, associatedTokenAccount, receiverTokenAccount.address, user.publicKey, 5 * 10 ** mintInfo.decimals);

    // await revokeDelegate(connection, user, associatedTokenAccount, user.publicKey);

    // await burnTokens(connection, user, associatedTokenAccount, mint, user, 5 * 10 ** mintInfo.decimals);

    // await disableMint(connection, user, mint);

    // await grantFreezeAuthotiry(connection, user, mint, associatedTokenAccount);

    // await disableFreeze(connection, user, mint);

    // await getAllWalletAccounts(connection, 'Bi5HEDiXnCZmQ12298k4a3MUSzVGfqUeUL1XjTtHB8w7');
    // await getTokenLargestAccounts(connection, mint);
}

main().then(() => {
    console.log("Finished successfully")
    process.exit(0)
}).catch((error) => {
    console.log(error)
    process.exit(1)
})
