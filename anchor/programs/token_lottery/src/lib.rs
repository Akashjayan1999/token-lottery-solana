use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, metadata::Metadata, token_interface::{Mint, TokenAccount, TokenInterface}};

declare_id!("AC6WCANoRqrqLnNmBX6mryScTzN1D5PAkbYuBCZR9x4F");

#[program]
pub mod token_lottery {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConifg>, start: u64, end: u64, price: u64) -> Result<()> {
        ctx.accounts.token_lottery.bump = ctx.bumps.token_lottery;
        ctx.accounts.token_lottery.lottery_start = start;
        ctx.accounts.token_lottery.lottery_end = end;
        ctx.accounts.token_lottery.ticket_price = price;
        ctx.accounts.token_lottery.authority = ctx.accounts.payer.key();
        ctx.accounts.token_lottery.randomness_account = Pubkey::default();
        ctx.accounts.token_lottery.lottery_pot_amount = 0;
        ctx.accounts.token_lottery.total_tickets = 0;
        ctx.accounts.token_lottery.winner_chosen = false;
        Ok(())
    }

    pub fn initilize_lottery(ctx: Context<InitilizeLottery>) -> Result<()> {
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConifg<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + TokenLottery::INIT_SPACE,
        // Challenge: Make this be able to run more than 1 lottery at a time
        seeds = [b"token_lottery".as_ref()],
        bump
    )]
    pub token_lottery: Box<Account<'info, TokenLottery>>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct InitilizeLottery<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
        #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = collection_mint,
        mint::freeze_authority = collection_mint,
        seeds = [b"collection_mint".as_ref()],
        bump,
    )]
    pub collection_mint: Box<InterfaceAccount<'info, Mint>>,

        #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"collection_token_account".as_ref()],
        bump,
        token::mint = collection_mint,
        token::authority = collection_token_account
    )]
    pub collection_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), collection_mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
     /// CHECK: This account will be initialized by the metaplex program
    pub metadata: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), 
            collection_mint.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: This account will be initialized by the metaplex program
    pub master_edition: UncheckedAccount<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct TokenLottery {
    pub bump: u8,
    pub winner: u64,
    pub winner_chosen: bool,
    pub lottery_start: u64,
    pub lottery_end: u64,
    // Is it good practice to store SOL on an account used for something else?
    pub lottery_pot_amount: u64,
    pub total_tickets: u64,
    pub ticket_price: u64,
    pub randomness_account: Pubkey,
    pub authority: Pubkey,
}

