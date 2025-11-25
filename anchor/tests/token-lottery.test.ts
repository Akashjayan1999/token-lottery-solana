import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { TokenLottery } from '../target/types/token_lottery'
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import * as sb from '@switchboard-xyz/on-demand'
import SwitchBoardIDL from '../switchboard.json'
import fs from 'fs'
describe('token-lottery', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection
  anchor.setProvider(provider)

  let switchboardProgram = new anchor.Program(SwitchBoardIDL as anchor.Idl, provider)
    // let switchboardProgram:any
  const rngKp = anchor.web3.Keypair.generate()
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>

  async function buyTicket() {
    const buyTicketIx = await program.methods
      .buyTicket()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction()

    const blockhashContext = await connection.getLatestBlockhash()

    const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    })

    const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1,
    })

    const tx = new anchor.web3.Transaction({
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    })
      .add(buyTicketIx)
      .add(computeIx)
      .add(priorityIx)

    const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet.payer])
    console.log('buy ticket ', sig)
  }

  //use this code for generating the switchboard.json file

  // beforeAll( async () => {
  //   const switchboardIDL = await anchor.Program.fetchIdl(
  //     sb.ON_DEMAND_MAINNET_PID,
  //     {connection: new anchor.web3.Connection("https://api.mainnet-beta.solana.com")}
  //   ) as anchor.Idl;

  //   fs.writeFile('switchboard.json', JSON.stringify(switchboardIDL),function(error){
  //     if(error){
  //       console.log(error);
  //     }
  //   });

  //   switchboardProgram = new anchor.Program(switchboardIDL, provider);
  // });
  it('should init config', async () => {
    // Add your test here.

    const slot = await connection.getSlot();
    const endSlot = slot + 20;
    console.log("Current slot", slot);
    const initConfigIx = await program.methods
      .initializeConfig(new anchor.BN(0), new anchor.BN(endSlot), new anchor.BN(10000))
      .instruction()
    const mint = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('collection_mint')], program.programId)[0]

    const metadata = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID,
    )[0]

    const masterEdition = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')],
      TOKEN_METADATA_PROGRAM_ID,
    )[0]
    const initLotteryIx = await program.methods
      .initilizeLottery()
      .accounts({
        //@ts-ignore
        masterEdition: masterEdition,
        metadata: metadata,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction()

    console.log('Your transaction signature', initConfigIx)
    const blockhashContext = await connection.getLatestBlockhash()
    // need to do
    //solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
    //solana-test-validator --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so --reset
    const tx = new anchor.web3.Transaction({
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    })
      .add(initConfigIx)
      .add(initLotteryIx)

    const signature = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet.payer], {
      skipPreflight: true,
    })
    console.log('Your transaction signature', signature)

    await buyTicket()
    await buyTicket()
    await buyTicket()
    await buyTicket()
    await buyTicket()
    await buyTicket()
    await buyTicket()

    const queue = new anchor.web3.PublicKey('A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w')

    const queueAccount = new sb.Queue(switchboardProgram, queue)
    console.log('Queue account', queue.toString())
    try {
      await queueAccount.loadData()
    } catch (err) {
      console.log('Queue account not found')
      process.exit(1)
    }

    const [randomness, createRandomnessIx] = await sb.Randomness.create(switchboardProgram, rngKp, queue)
    console.log('Created randomness account..')
    console.log('Randomness account', randomness.pubkey.toBase58())
    console.log('rkp account', rngKp.publicKey.toBase58())

    const createRandomnessTx = await sb.asV0Tx({
      connection: connection,
      ixs: [createRandomnessIx],
      payer: wallet.publicKey,
      signers: [wallet.payer, rngKp],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    })

    // const blockhashContext = await connection.getLatestBlockhashAndContext();

    const createRandomnessSignature = await connection.sendTransaction(createRandomnessTx)
    // const blockhashContext2 = await connection.getLatestBlockhash()
    // await connection.confirmTransaction({
    //   signature: createRandomnessSignature,
    //   blockhash: blockhashContext2.blockhash,
    //   lastValidBlockHeight: blockhashContext2.lastValidBlockHeight,
    // })
    // console.log('Transaction Signature for randomness account creation: ', createRandomnessSignature)
  let confirmed = false
    while (!confirmed) {
      try {
        const confirmedRandomness = await provider.connection.getSignatureStatuses([createRandomnessSignature])
        const randomnessStatus = confirmedRandomness.value[0];

        if (randomnessStatus?.confirmationStatus !=null && randomnessStatus.confirmationStatus === 'confirmed') {
          console.log('Randomness account created')
          confirmed = true;
        }
      } catch (err) {
        console.log('Waiting for randomness account creation')
       
      }
    }
    
    
    const sbCommitIx = await randomness.commitIx(queue)

    const commitIx = await program.methods
      .commitRanomness()
      .accounts({
        randomnessAccountData: randomness.pubkey,
      })
      .instruction()

    const commitComputeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    })

    const commitPriorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1,
    })

    // const commitTx = await sb.asV0Tx({
    //   connection: switchboardProgram.provider.connection,
    //   ixs: [sbCommitIx, commitIx],
    //   payer: wallet.publicKey,
    //   signers: [wallet.payer],
    //   computeUnitPrice: 75_000,
    //   computeUnitLimitMultiple: 1.3,
    // })
    const commitBlockhashWithContext = await connection.getLatestBlockhash()
    const commitTx = new anchor.web3.Transaction({
      blockhash: commitBlockhashWithContext.blockhash,
      lastValidBlockHeight: commitBlockhashWithContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    })
      .add(sbCommitIx)
      .add(commitIx)
      .add(commitComputeIx)
      .add(commitPriorityIx)

    // const blockhashContext3 = await connection.getLatestBlockhash()
    // const commitSignature = await connection.sendTransaction(commitTx)
    // await connection.confirmTransaction({
    //   signature: commitSignature,
    //   blockhash: blockhashContext3.blockhash,
    //   lastValidBlockHeight: blockhashContext3.lastValidBlockHeight,
    // })
    const commitSignature = await anchor.web3.sendAndConfirmTransaction(connection, commitTx, [wallet.payer],{skipPreflight:true})
    console.log('Transaction Signature for commit: ', commitSignature)

    const sbRevealIx = await randomness.revealIx();
    const revealIx = await program.methods.revealWinner()
      .accounts({
        randomnessAccountData: randomness.pubkey
      })
      .instruction();
    

    // const revealTx = await sb.asV0Tx({
    //   connection: switchboardProgram.provider.connection,
    //   ixs: [sbRevealIx, revealIx],
    //   payer: wallet.publicKey,
    //   signers: [wallet.payer],
    //   computeUnitPrice: 75_000,
    //   computeUnitLimitMultiple: 1.3,
    // });
    const revealBlockhashContext = await connection.getLatestBlockhash()
    const revealTx = new anchor.web3.Transaction({
      blockhash: revealBlockhashContext.blockhash,
      lastValidBlockHeight: revealBlockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    })
      .add(sbRevealIx)
      .add(revealIx)


      let currentSlot =0
      while (currentSlot < endSlot) {
        const slotloop = await connection.getSlot();
        if (slotloop > currentSlot) {
          currentSlot = slotloop;
          console.log("Current slot", currentSlot);
        }
      }

      const revealSignature = await anchor.web3.sendAndConfirmTransaction(connection, revealTx, [wallet.payer],{skipPreflight:true})
    // const revealSignature = await connection.sendTransaction(revealTx);
    // await connection.confirmTransaction({
    //   signature: commitSignature,
    //   blockhash: revealBlockhashContext.blockhash,
    //   lastValidBlockHeight: revealBlockhashContext.lastValidBlockHeight
    // });
    console.log("  Transaction Signature revealTx", revealSignature);

    const claimIx = await program.methods.claimPrize()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    const ClaimblockhashContext = await connection.getLatestBlockhash();
     const claimTx = new anchor.web3.Transaction({
      blockhash: ClaimblockhashContext.blockhash,
      lastValidBlockHeight: ClaimblockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    }).add(claimIx);

    const claimSig = await anchor.web3.sendAndConfirmTransaction(connection, claimTx, [wallet.payer]);
    console.log(claimSig);

  },300000)
})
