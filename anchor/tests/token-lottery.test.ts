import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { TokenLottery } from '../target/types/token_lottery'
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'

describe('token-lottery', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection
  anchor.setProvider(provider)
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>

  it('should init config', async () => {
    // Add your test here.
    const initConfigTx = await program.methods.initializeConfig(
      new anchor.BN(0),
      new anchor.BN(1863132288),
      new anchor.BN(10000)
    ).instruction();
    const mint = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('collection_mint')],
      program.programId,
    )[0];

    const metadata = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID,
      )[0];
  
    const masterEdition = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')],
        TOKEN_METADATA_PROGRAM_ID,
      )[0];
     const initLotteryIx = await program.methods.initilizeLottery().accounts({
      //@ts-ignore
      masterEdition: masterEdition,
      metadata: metadata,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).instruction();

    console.log('Your transaction signature', initConfigTx)
    const blockhashContext = await connection.getLatestBlockhash();
    // need to do
    //solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
    //solana-test-validator --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so --reset
    const tx = new anchor.web3.Transaction(
      {
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
        feePayer: wallet.payer.publicKey,
      }
    ).add(initConfigTx)
    .add(initLotteryIx);
    

    const signature = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet.payer],{skipPreflight:true});
    console.log('Your transaction signature', signature)

   

    
  })
})
