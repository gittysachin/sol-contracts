import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { airdrop } from "../airdrop";

export const showBalance = async (publicKey: PublicKey) => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    const response = await connection.getAccountInfo(publicKey);
    return response.lamports/LAMPORTS_PER_SOL;
}

// (async () => {
//     const publicKeyHash = "FpsnnxrxcusWwQoGQ6bpVZKjf2g6Bu3Y2Ma5ccGYSxwg";
//     const publicKey = new PublicKey(publicKeyHash);
//     const balance = await showBalance(publicKey);
//     console.log(`The balance for the key ${publicKeyHash} is ${balance}`);
//     await airdrop(publicKeyHash, 4);
//     const updatedBalance = await showBalance(publicKey);
//     console.log(`The balance for the key ${publicKeyHash} is ${updatedBalance}`);
// })()