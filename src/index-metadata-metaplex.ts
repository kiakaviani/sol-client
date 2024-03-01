// as used in https://www.youtube.com/watch?v=DQbt0-riooo

import * as token from '@solana/spl-token'
import * as web3 from "@solana/web3.js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_adapters from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";
import dotenv from "dotenv"
import { initializeKeypair } from './initializeKeypair';
dotenv.config()

async function main() {
    const endpoint = web3.clusterApiUrl('devnet');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(connection);
    const user = await initializeKeypair(connection);
    const userSecretKey = Uint8Array.from(user.secretKey);
    const userWallet = umi.eddsa.createKeypairFromSecretKey(userSecretKey);
    const userWalletSigner = mpl_umi.createSignerFromKeypair(umi, userWallet);

    const metadata = {
        name: 'REPTILE',
        symbol: 'RPTL',
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    };

    const mint = mpl_umi.generateSigner(umi);
    umi.use(mpl_umi.signerIdentity(userWalletSigner));
    umi.use(mpl_candy_machine.mplCandyMachine())

    const tx = await mpl.createAndMint(umi, {
        mint,
        authority: umi.identity,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: mpl_umi.percentAmount(10),
        decimals: 8,
        amount: 1000000_00000000,
        tokenOwner: userWallet.publicKey,
        tokenStandard: mpl.TokenStandard.Fungible,
        isMutable: false,
    }).sendAndConfirm(umi);
    console.log("Main: Mint Transaction: ", new TextDecoder().decode(tx.signature));
    console.log("Main: Mint Token: ", mint.publicKey);
}

main().then(() => {
    console.log("Finished successfully")
    process.exit(0)
}).catch((error) => {
    console.log(error)
    process.exit(1)
})
























/*const uploadMetadataForToken = async (offChainMetadata: any) => {
    const endpoint = web3.clusterApiUrl('devnet');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const umi = mpl_umi_bundle.createUmi(endpoint);
    const web3jsKeyPair = await initializeKeypair(connection);

    const mint = await token.createMint(
        connection, // the connection
        web3jsKeyPair, // payer
        web3jsKeyPair.publicKey, // mint-authority
        null, // freeze-authority
        2 // token decimals
    );
    console.log(`Mint account created with address: ${mint.toBase58()}`);

    const keypair = mpl_umi_adapters.fromWeb3JsKeypair(web3jsKeyPair);
    const signer = mpl_umi.createSignerFromKeypair(umi, keypair);
    umi.identity = signer;
    umi.payer = signer;


    let CreateMetadataAccountV3Args = {
        //accounts
        mint: mpl_umi_adapters.fromWeb3JsPublicKey(mint),
        mintAuthority: signer,
        payer: signer,
        updateAuthority: mpl_umi_adapters.fromWeb3JsKeypair(web3jsKeyPair).publicKey,
        data: {
            name: offChainMetadata.name,
            symbol: offChainMetadata.symbol,
            uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        },
        isMutable: false,
        collectionDetails: null,
    }

    let instruction = mpl.createMetadataAccountV3(
        umi,
        CreateMetadataAccountV3Args
    )

    const transaction = await instruction.buildAndSign(umi);

    const transactionSignature = await umi.rpc.sendTransaction(transaction);
    //const signature = mpl_umi.base58.deserialize(transactionSignature);
    console.log({ transactionSignature })
}


(async () => {
    const offChainMetadata = {
        name: "REPTILE",
        symbol: "RPTL",
        description: "your token description",
        image: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/image.png"
    }
    await uploadMetadataForToken(offChainMetadata);
})()

*/


/*
async function main() {
    const endpoint = web3.clusterApiUrl('devnet');
    const connection = new web3.Connection(endpoint, {
        commitment: "confirmed",
    });
    const mintKeypair = web3.Keypair.generate();
    const mint = mintKeypair.publicKey;
    const user = await initializeKeypair(connection);
    const umi = mpl_umi_bundle.createUmi(endpoint);
    const keypair = mpl_umi_adapters.fromWeb3JsKeypair(user);
    const signer = mpl_umi.createSignerFromKeypair(umi, keypair);
    umi.identity = signer;
    umi.payer = signer;


    let CreateMetadataAccountV3Args = {
        //accounts
        mint: mpl_umi_adapters.fromWeb3JsPublicKey(mint),
        mintAuthority: signer,
        payer: signer,
        updateAuthority: mpl_umi_adapters.fromWeb3JsKeypair(user).publicKey,
        data: {
            name: 'REPTILE',
            symbol: 'RPTL',
            uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        },
        isMutable: false,
        collectionDetails: null,
    }

    let instruction = mpl.createMetadataAccountV3(
        umi,
        CreateMetadataAccountV3Args
    )

    const transaction = await instruction.buildAndSign(umi);

    const transactionSignature = await umi.rpc.sendTransaction(transaction);
    const signature = mpl_umi.base58.deserialize(transactionSignature);
    console.log({ signature });
}

main();*/