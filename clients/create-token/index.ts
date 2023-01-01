import { createMint, createTransferInstruction, getOrCreateAssociatedTokenAccount, Mint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js"
import { airdrop } from "../airdrop";

const createMintWallet = async (mintWallet: Keypair) => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    console.log('res------------')
    const creatorToken = await createMint(connection, mintWallet, mintWallet.publicKey, null, 8, undefined, { commitment: "confirmed" }, TOKEN_PROGRAM_ID);
    console.log('res------------222222')
    
    return creatorToken;
}

const transferTokens = async (tokenAddress: PublicKey, mintWallet: Keypair, reciever: PublicKey) => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    const creatorMintTokenAccount = await getOrCreateAssociatedTokenAccount(connection, mintWallet, tokenAddress, mintWallet.publicKey, null, "confirmed", null, TOKEN_PROGRAM_ID);

    console.log('res--------------333333')
    await mintTo(connection, mintWallet, tokenAddress, creatorMintTokenAccount.address, mintWallet.publicKey, 1000000000, []);
    console.log('res--------------444444')


    const recieverTokenAccount = await getOrCreateAssociatedTokenAccount(connection, mintWallet, tokenAddress, reciever, null, "confirmed", null, TOKEN_PROGRAM_ID);
    console.log('res--------------55555')

    console.log(`RecieverTokenAccount address: ${recieverTokenAccount.address}`);
    const transaction = new Transaction().add(
        createTransferInstruction(
            creatorMintTokenAccount.address,
            recieverTokenAccount.address,
            mintWallet.publicKey,
            100000000,
            [],
            TOKEN_PROGRAM_ID
        )
    )

    await sendAndConfirmTransaction(connection, transaction, [mintWallet], { commitment: "confirmed" });
}

(async () => {
    const mintWallet = await Keypair.generate();
    await airdrop(mintWallet.publicKey, 2);
    const creatorTokenAddress = await createMintWallet(mintWallet);

    console.log({ creatorTokenAddress });

    await transferTokens(creatorTokenAddress, mintWallet, new PublicKey("FpsnnxrxcusWwQoGQ6bpVZKjf2g6Bu3Y2Ma5ccGYSxwg"));
    console.log(`Creator Token Address: ${creatorTokenAddress}`);
    console.log(`mintWallet Address: ${mintWallet.publicKey}`);
})()