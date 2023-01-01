use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct InstructionData {
    address: [u8; 512]
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct AddressSchema {
    address: [u8; 512]
}

pub fn string_to_array(str: String) -> [u8; 512] {
    let str_bytes: &[u8] = str.as_bytes();
    let mut ans: [u8; 512] = [0; 512];
    for i in 1..=512 {
        if i < str_bytes.len() {
            ans[i] = str_bytes[i]
        }
    }
    return ans;
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
    msg!("Address contract entry point");
    
    let instruction = InstructionData::try_from_slice(_instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
        // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let pda_account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    if pda_account.owner != program_id {
        msg!("Address account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !pda_account.is_signer {
        msg!("Pda account should be a signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Increment and store the number of times the account has been greeted
    let mut pda_account_data = AddressSchema::try_from_slice(&pda_account.data.borrow())?;
    pda_account_data.address = instruction.address;
    pda_account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

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
