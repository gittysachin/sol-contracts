use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use solana_program::instruction::Instruction;
use solana_program::instruction::AccountMeta;
use solana_program::program::invoke_signed;
use std::convert::TryInto;

#[derive(Clone, Debug, BorshDeserialize, BorshSerialize, PartialEq)]
pub enum InstructionData {
    UpdateAddress {
        address: [u8; 512]
    },
    UpdateUserInfo {
        name: [u8; 512],
        date: i32,
        month: i32,
        year: i32
    },
    Initialize {}
}

#[derive(Clone, Debug, BorshDeserialize, BorshSerialize, PartialEq)]
pub struct AddressInstructionData {
    address: [u8; 512]
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, PartialEq)]
pub struct UserProfileInstructionData {
    name: [u8; 512],
    date: i32,
    month: i32,
    year: i32
}

#[derive(Debug, BorshSerialize, BorshDeserialize)]
pub struct AddressSchema {
    address: [u8; 512]
}

pub fn get_address_pda(account: &AccountInfo, program_id: &Pubkey) -> (Pubkey, u8) { // getAddressSeeds
    return Pubkey::find_program_address(&[b"address", &account.key.to_bytes()[..32]], program_id)
}

pub fn get_user_profile_pda(account: &AccountInfo, program_id: &Pubkey) -> (Pubkey, u8) {
    return Pubkey::find_program_address(&[b"profile", &account.key.to_bytes()[..32]], program_id)
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
    msg!("Hello world rust program endpoint");

    let instruction = InstructionData::try_from_slice(_instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    let accounts_iter = &mut accounts.iter();

    match instruction {
        InstructionData::Initialize {

        } => {
            msg!("Initialise PDAs");
            
            let account = next_account_info(accounts_iter)?;
            let update_user_info_account = next_account_info(accounts_iter)?;
            let update_address_account = next_account_info(accounts_iter)?;
            let update_user_profile_contract = next_account_info(accounts_iter)?;
            let update_address_contract = next_account_info(accounts_iter)?;
            let system_program = next_account_info(accounts_iter)?;

            let (found_address_account, address_bump) = get_address_pda(account, program_id);
            
            if found_address_account != *update_address_account.key {
                msg!("Incorrect address PDA as input");
                msg!(&update_address_account.key.to_string());
                return Err(ProgramError::InvalidInstructionData)
            }

            msg!(&found_address_account.to_string());

            let (found_user_info_account, user_profile_bump) = get_user_profile_pda(account, program_id);
            
            msg!(&found_user_info_account.to_string());
            
            if found_user_info_account != *update_user_info_account.key {
                msg!("Incorrect user info PDA as input");
                msg!(&update_user_info_account.key.to_string());
                return Err(ProgramError::InvalidInstructionData)
            }

            invoke_signed(
                &system_instruction::create_account(
                    account.key, // account that's gonna pay for it
                    update_address_account.key,
                    Rent::get()?.minimum_balance(std::mem::size_of::<AddressSchema>()), // the amount of solana we want to put is just to rent exempt
                    std::mem::size_of::<AddressSchema>().try_into().unwrap(), // amount of data
                    update_address_contract.key, // owner of this PDA -> because the owner has access to update the data inside the PDA
                ),
                &[update_address_account.clone(), account.clone(), system_program.clone()], // if we want update_address_account to sign this transaction, then below comment
                &[&[b"address", account.key.as_ref(), &[address_bump]]] // this is the set of seeds that when combined with  this program that's CPIing -> if they result in this update_address_account, the Solana runtime will assume this contract to be signed by update_address_account
            )?;

            invoke_signed(
                &system_instruction::create_account(
                    account.key,
                    update_user_info_account.key,
                    Rent::get()?.minimum_balance(std::mem::size_of::<AddressSchema>()),
                    std::mem::size_of::<AddressSchema>().try_into().unwrap(),
                    update_user_profile_contract.key,
                ),
                &[update_user_info_account.clone(), account.clone(), system_program.clone()],
                &[&[b"profile", account.key.as_ref(), &[user_profile_bump]]],
            )?;
        }
        InstructionData::UpdateAddress {
            address
        } => {
            msg!("Update address");

            let account = next_account_info(accounts_iter)?;
            let update_address_account = next_account_info(accounts_iter)?;
            let update_address_contract = next_account_info(accounts_iter)?;

            let (found_address_account, address_bump) = get_address_pda(account, program_id);
            
            if found_address_account != *update_address_account.key {
                msg!("address pda is not equal to incoming address pda");
                return Err(ProgramError::InvalidInstructionData)
            }

            let mut acct_metas = Vec::new();
            acct_metas.push(AccountMeta{
                pubkey: *update_address_account.key,
                is_signer: true,
                is_writable: true,
            });

            let address_instruction_data = AddressInstructionData {
                address: address
            };
            let instruction = Instruction{
                program_id: *update_address_contract.key,
                accounts: acct_metas,
                data: address_instruction_data.try_to_vec()?,
            };
            invoke_signed(
                &instruction,
                &[update_address_account.clone()],
                &[&[b"address", account.key.as_ref(), &[address_bump]]]).map_err(|_| ProgramError::IncorrectProgramId
            )?;
        }
        InstructionData::UpdateUserInfo {
            name, date, year, month
        } => {
            msg!("Update user info");

            let account = next_account_info(accounts_iter)?;
            let update_profile_account = next_account_info(accounts_iter)?;
            let update_profile_contract = next_account_info(accounts_iter)?;

            let (found_user_info_account, user_profile_bump) = get_user_profile_pda(account, program_id);

            if found_user_info_account != *update_profile_account.key {
                msg!("User pda is not equal to incoming address pda");
                return Err(ProgramError::InvalidInstructionData)
            }

            let mut acct_metas = Vec::new();
            acct_metas.push(AccountMeta{
                pubkey: *update_profile_account.key,
                is_signer: true,
                is_writable: true,
            });

            let profile_instruction_data = UserProfileInstructionData {
                name, date, year, month
            };
            let instruction = Instruction{
                program_id: *update_profile_contract.key,
                accounts: acct_metas,
                data: profile_instruction_data.try_to_vec()?,
            };
            invoke_signed(&instruction, 
                &[update_profile_account.clone()],
                &[&[b"profile", account.key.as_ref(), &[user_profile_bump]]]
            ).map_err(|_| ProgramError::IncorrectProgramId)?;
        }
    }

    Ok(())
}

// Sanity tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let mut data = vec![0; mem::size_of::<u32>()];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            0
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            1
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            2
        );
    }
}
