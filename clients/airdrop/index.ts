import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const airdrop = async (address: PublicKey, amount: number) => {
    const publicKey = new PublicKey(address);
    // const conn = new Connection("https://api.devnet.solana.com", "confirmed");
    const conn = new Connection("http://127.0.0.1:8899", "confirmed");
    const airdropSignature = await conn.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
    const latestBlockHash = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature
    });
}

// airdrop(new PublicKey("BNH7ZqMt5zcTfFXcVi8vqC84AxXrp1ZX2LZf2C9Z36e5"), 4);