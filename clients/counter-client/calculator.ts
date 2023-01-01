import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { airdrop } from "../../clients/airdrop";
import * as borsh from "borsh";
import BN from "bn.js";

const CONTRACT_PROGRAM_ID = 'H5BjsCyxPArkgqtg35hxshAfT5eTk1bCsE75rNHFFFwv';

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

const numberToBuffer = (num: number) => {
    const bn = new BN(num);
    const bnArr = bn.toArray().reverse();
    const bnBuffer = Buffer.from(bnArr);
    const zeroPad = Buffer.alloc(4);
    bnBuffer.copy(zeroPad)
    return zeroPad;
}

const callCounter = async (parentAccount: Keypair) => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    await airdrop(parentAccount.publicKey, 2);

    // const dataAccount = await createDataAccount(connection, parentAccount);
    const dataAccount = new PublicKey("4rn3a3KZKBzD2SzC8sQqNhcASHLGg14eXwm2LNHo2DfJ"); // ->>>>> to greet everytime in the same account
    

    // Rust program expects is an enum and enum is serialized into array 
    // where the first 8 but represents the index of the enum and the bits after that represents the data
    const buffers = [Buffer.from(Int8Array.from([0])), numberToBuffer(5)]; // index is zero and number is 5 -> will add
    // const buffers = [Buffer.from(Int8Array.from([1])), numberToBuffer(5)]; // index is 1 and represents subtract in enum -> will subtract
    const data = Buffer.concat(buffers);

    console.log(dataAccount.toString());
    console.log(parentAccount.publicKey.toString());

    const instruction = new TransactionInstruction({
        keys: [{pubkey: dataAccount, isSigner: false, isWritable: true}],
        programId: new PublicKey(CONTRACT_PROGRAM_ID),
        data: data
    });

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [parentAccount],
        { commitment: "confirmed" }
    );

    // Read data
    const accountInfo = await connection.getAccountInfo(dataAccount);
    const greeting = borsh.deserialize(
        GreetingSchema,
        GreetingAccount,
        accountInfo.data,
    );

    console.log(
        dataAccount.toBase58(),
        'has been greeted',
        greeting.counter,
        'time(s)',
    );
}

callCounter(Keypair.generate());