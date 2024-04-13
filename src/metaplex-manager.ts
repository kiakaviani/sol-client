
import * as web3 from "@solana/web3.js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";
import { initializeKeypair } from "./initializeKeypair";

export async function getMetaplexDigitalAssetInfo(umi: mpl_umi.Umi, poolBaseMint: web3.PublicKey) {
    const mint = mpl_umi.publicKey(poolBaseMint);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    return asset;
}

export async function mintTokenWithMetadata(connection: web3.Connection, umi: mpl_umi.Umi) {
    
    // My json file is on github, it's better to put it on ipfs.
    const metadata = {
        name: 'YOUR TOKEN NAME',
        symbol: 'NAME',
        uri: "https://raw.githubusercontent.com/kiakaviani/sol-client/main/assets/metadata.json",
    };

    const user = await initializeKeypair(connection);
    const userSecretKey = Uint8Array.from(user.secretKey);
    const userWallet = umi.eddsa.createKeypairFromSecretKey(userSecretKey);
    const userWalletSigner = mpl_umi.createSignerFromKeypair(umi, userWallet);

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
    console.log("Mint Transaction: ", new TextDecoder().decode(tx.signature));
    console.log("Mint Token: ", mint.publicKey);
}