import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { airdrop } from "../../clients/airdrop";
import * as borsh from "borsh";

const CONTRACT_PROGRAM_ID = '6qtbz1pYTwkvvVwEh85UjeHx8hqexmYUwH4RF7tAwAbT';

class GreetingAccount {
    counter = 0;
    constructor (fields: {counter: number} | undefined = undefined) {
        if (fields) {
            this.counter = fields.counter;
        }
    }
}

const GreetingSchema = new Map([
    [GreetingAccount, {kind: 'struct', fields: [['counter', 'u32']]}]
])

const createDataAccount = async (connection, parentAccount): Promise<Keypair> => {
    const dataAccount = Keypair.generate();
    const createDataAccountInstruction = await SystemProgram.createAccount({
        fromPubkey: parentAccount.publicKey,
        newAccountPubkey: dataAccount.publicKey,
        lamports: 1000000000,
        space: 4,
        programId: new PublicKey(CONTRACT_PROGRAM_ID)
    });
    const transaction = new Transaction()
    transaction.add(createDataAccountInstruction);
    await sendAndConfirmTransaction(connection, transaction, [parentAccount, dataAccount], { commitment: "confirmed" });
    return dataAccount;
}

const callCounter = async (parentAccount: Keypair) => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    await airdrop(parentAccount.publicKey, 2);

    const dataAccount = await createDataAccount(connection, parentAccount);
    // const dataAccount = new PublicKey("5q2pyPDRfvCikbopgPWU3JMbUSKJYga3cduW8DtFmQMk"); ->>>>> to greet everytime in the same account
    
    console.log(dataAccount.publicKey.toString());
    console.log(parentAccount.publicKey.toString());

    const instruction = new TransactionInstruction({
        keys: [{pubkey: dataAccount.publicKey, isSigner: false, isWritable: true}],
        programId: new PublicKey(CONTRACT_PROGRAM_ID),
        data: Buffer.alloc(0) // All instructions are hellos
    });

    await sendAndConfirmTransaction(connection, new Transaction().add(instruction), [parentAccount], { commitment: "confirmed" });

    const accountInfo = await connection.getAccountInfo(dataAccount.publicKey, { commitment: "confirmed" });

    const greeting = borsh.deserialize(GreetingSchema, GreetingAccount, accountInfo.data);

    console.log(dataAccount.publicKey.toBase58(), 'has been greeted', greeting.counter, 'time(s)');
}

callCounter(Keypair.generate());