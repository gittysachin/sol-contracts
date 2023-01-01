import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { airdrop } from "../airdrop";
import { showBalance } from "../show-balance";

export const transferSol = async (from: Keypair, to: PublicKey, amount: number) => {
    const conn = new Connection("http://localhost:8899", "confirmed");
    const transaction = new Transaction();

    const instruction = SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: LAMPORTS_PER_SOL * amount
    });

    transaction.add(instruction);
    await sendAndConfirmTransaction(conn, transaction, [
        from
    ]);

    console.log("TRANSACTION DONE");
}

// const secret = Uint8Array.from([135,184,201,147,243,40,243,38,231,158,245,31,191,157,171,126,226,128,75,141,80,20,141,37,222,145,51,245,255,56,89,174,128,10,44,157,211,73,47,214,36,126,134,19,242,214,62,158,136,191,124,124,112,152,115,110,78,164,198,226,127,102,43,126]);
// const fromKeypair = Keypair.fromSecretKey(secret);
// const toPublicKey = new PublicKey("FpsnnxrxcusWwQoGQ6bpVZKjf2g6Bu3Y2Ma5ccGYSxwg");

// (async () => {
//     await airdrop(fromKeypair.publicKey, 6);
//     const initialBalance = await showBalance(fromKeypair.publicKey)
//     console.log(`Initial balance of from wallet is ${initialBalance}`);
//     const initialBalanceTo = await showBalance(toPublicKey)
//     console.log(`Initial balance of to wallet is ${initialBalanceTo}`);
    
//     await transferSol(fromKeypair, toPublicKey, 2);
//     const postBalance = await showBalance(fromKeypair.publicKey)
//     console.log(`Post balance of from wallet is ${postBalance}`);
//     const postBalanceTo = await showBalance(toPublicKey)
//     console.log(`Post balance of to wallet is ${postBalanceTo}`);
    
// })()