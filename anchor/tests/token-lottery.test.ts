import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { TokenLottery } from '../target/types/token_lottery'

describe('token-lottery', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection
  anchor.setProvider(provider)

  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>

  it('should init config', async () => {
    // Add your test here.
    const initConfigTx = await program.methods.initializeConfig(
      new anchor.BN(0),
      new anchor.BN(1863132288),
      new anchor.BN(10000)
    ).instruction();

    console.log('Your transaction signature', initConfigTx)
    const blockhashContext = await connection.getLatestBlockhash();
    const tx = new anchor.web3.Transaction(
      {
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
        feePayer: wallet.payer.publicKey,
      }
    ).add(initConfigTx)
    

    const signature = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet.payer],{skipPreflight:true});
    console.log('Your transaction signature', signature)
  })
})
