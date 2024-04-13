
import * as web3 from "@solana/web3.js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as mpl_umi_bundle from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl_umi from "@metaplex-foundation/umi";
import * as mpl_candy_machine from "@metaplex-foundation/mpl-candy-machine";

export async function getMetaplexDigitalAssetInfo(umi: mpl_umi.Umi, poolBaseMint: web3.PublicKey) {
    const mint = mpl_umi.publicKey(poolBaseMint);
    const asset = await mpl.fetchDigitalAsset(umi, mint);
    return asset;
}

export async function mintTokenWithMetadata(umi: mpl_umi.Umi, poolBaseMint: web3.PublicKey) {
    const metadata = {
        name: 'YOUR TOKEN NAME',
        symbol: 'NAME',
        uri: "https://raw.githubusercontent.com/kiakaviani/sol-client/blob/main/assets/solana.png",
    };
}