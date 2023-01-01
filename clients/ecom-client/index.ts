import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as borsh from 'borsh';
import { getPayer, getRpcUrl } from './utils';

const MAX_SIZE = 1000;

let PARENT_CONTRACT_ID = "GA8Hdg2BPsdX4SQDDosJ6JuQ4z9UDdVMkyu8aY1bPMUT";
let ADDRESS_CONTRACT_ID = "7CcF6efdY1a7qwUaHiQ2Jpb9gVZeCK2rPJdZJMkKcktv";
let PROFILE_CONTRACT_ID = "BshbRMuB5BQxmZTMA5AnDXhTT3zuDMySWdWjzqK7mwGt";

let connection;
let payer: Keypair;
let programId: PublicKey;
let addressContract: PublicKey;
let profileContract: PublicKey;
let addressProgramId: PublicKey;
let profileProgramId: PublicKey;

class AddressAccount {
    address: Uint8Array = new Uint8Array([]);
    constructor(fields: {address: Uint8Array} | undefined = undefined) {
        if (fields)
            this.address = fields.address;
    }
}

class ProfileAccount {
    name: Uint8Array = new Uint8Array([]);
    date: number;
    month: number;
    year: number;
    constructor(fields: { name: Uint8Array, date: number, month: number, year: number }| undefined = undefined) {
        if (fields) {
            this.name = fields.name;
            this.date = fields.date;
            this.month = fields.month;
            this.year = fields.year;
        }
    }
}

const AddressSchema = new Map([
    [AddressAccount, { kind: 'struct', fields: [['address', [512]]] }],
]);

const ProfileSchema = new Map([
    [ProfileAccount, { 
        kind: 'struct', 
        fields: [
            ['name', [512]],
            ['date', 'number'],
            ['month', 'number'],
            ['year', 'number']
        ] 
    }]
])

const strToBuffer = (str, len) => {
    const buf = new Buffer(len);
    buf.write(str);
    return buf;
}

const numberToBuffer = (value, len) => {
    const buf = new Buffer(len);
    buf.writeUInt32LE(value);
    return buf;
}

export async function establishConnection(): Promise<void> {
    const rpcUrl = await getRpcUrl();
    connection = new Connection(rpcUrl, "confirmed");
    const version = await connection.getVersion();
    console.log(`Connection to cluster established:`, rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
    let fees = 0;
    if (!payer) {
        const { feeCalculator } = await connection.getRecentBlockhash();
        
        // calculate the cost to fund the greeter account
        fees = await connection.getMinimumBalanceForRentExemption(MAX_SIZE);

        // calculate the cost to sending transactons
        fees += feeCalculator.lamportsPerSignature * 100; //  wag

        payer = await getPayer();
    }

    let lamports = await connection.getBalance(payer.publicKey);
    if (lamports < fees) {
        // if current balance is not enough to pay for fees, request an airdrop
        const sig = await connection.requestAirdrop(
            payer.publicKey,
            fees - lamports
        );
        await connection.confirmTransaction(sig);
        lamports = await connection.getBalance(payer.publicKey)
    }

    console.log(
        'using account',
        payer.publicKey.toBase58(),
        'containing',
        lamports / LAMPORTS_PER_SOL,
        'SOL to pay for fees'
    )
}

/**
 * Check if the hellp world BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
    programId = new PublicKey(PARENT_CONTRACT_ID);
    addressContract = new PublicKey(ADDRESS_CONTRACT_ID);
    profileContract = new PublicKey(PROFILE_CONTRACT_ID);

    const programInfo = await connection.getAccountInfo(programId);
    if (programInfo == null) {
        throw new Error('program not found');
    } else if (!programInfo.executable) {
        throw new Error('Program is not executable');
    }

    console.log(`Using program: ${programId.toBase58()}`);

    // 2 PDAs
    addressProgramId = (PublicKey.findProgramAddressSync([Buffer.from("address"), payer.publicKey.toBytes()], programId))[0]; // it returns publicKey and bump and we just want publicKey
    profileProgramId = (PublicKey.findProgramAddressSync([Buffer.from("profile"), payer.publicKey.toBytes()], programId))[0];

    console.log`Address pda ${addressProgramId.toBase58()}`;
    console.log`User profile pda ${profileProgramId.toBase58()}`;
}

export async function initialize(): Promise<void> {
    const buffers = [Buffer.from(Int8Array.from([2]))]; // selecting index 2 as initialize in rust is at 3rd place -> type of enum is initialize
    const data = Buffer.concat(buffers);
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: profileProgramId, isSigner: false, isWritable: true },
            { pubkey: addressProgramId, isSigner: false, isWritable: true },
            { pubkey: profileContract, isSigner: false, isWritable: false },
            { pubkey: addressContract, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId,
        data: data
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [payer],
        { commitment: "confirmed" }
    );
}

export const updateAddress = async (address: string) => {
    // const buffers = [Buffer.from(Int8Array.from([0])), strToBuffer(address, 512)]; // passing address string to instruction data
    const buffers = [Buffer.from(Int8Array.from([0])), strToBuffer(address, 512)];
    const data = Buffer.concat(buffers);
    const instruction = new TransactionInstruction({
        keys: [
            {pubkey: payer.publicKey, isSigner: true, isWritable: true},
            {pubkey: addressProgramId, isSigner: false, isWritable: true},
            {pubkey: addressContract, isSigner: false, isWritable: false},
        ],
        programId,
        data: data
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [payer],
        { commitment: "confirmed" }
    );
}

export const updateProfile = async (name, date, month, year) => {
    const buffers = [
        Buffer.from(Int8Array.from([1])),
        strToBuffer(name, 512),
        numberToBuffer(date, 4),
        numberToBuffer(month, 4),
        numberToBuffer(year, 4)
    ];
    const data = Buffer.concat(buffers);
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: profileProgramId, isSigner: false, isWritable: true },
            { pubkey: profileContract, isSigner: false, isWritable: false }
        ],
        programId,
        data
    });
    await sendAndConfirmTransaction(
        connection, 
        new Transaction().add(instruction), 
        [payer], 
        { commitment: "confirmed" }
    );
}

export const getAddress = async () => {
    const addressInfo = await connection.getAccountInfo(addressProgramId);
    const address = borsh.deserialize(AddressSchema, AddressAccount, addressInfo.data);

    console.log(new TextDecoder().decode(address.address));
}

export const getProfile = async () => {
    const profileInfo = await connection.getAccountInfo(profileProgramId);
    const profile = borsh.deserialize(ProfileSchema, ProfileAccount, profileInfo.data);

    console.log(
        new TextDecoder().decode(profile.name),
        profile.date,
        profile.month,
        profile.year,
    );
}