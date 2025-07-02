import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import wallet from "./Turbin3-wallet.json";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

const TURBIN3_PREREQ_PROGRAM = new PublicKey("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");
const COLLECTION = new PublicKey("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");
const MPL_CORE_PROGRAM = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
const PREREQ_PDA = new PublicKey("83H5VUBArURmhMpXoss9W6fRJXtB3cL3Sdiu5uJYVVJu");

async function debugAllAccounts() {
    console.log("=== Account Debug ===");
    
    // 1. Check signer balance
    try {
        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`✓ Signer (${keypair.publicKey.toBase58()}): ${balance / 1_000_000_000} SOL`);
    } catch (e) {
        console.log(`✗ Signer error:`, e);
    }
    
    // 2. Check prereq PDA
    try {
        const account = await connection.getAccountInfo(PREREQ_PDA);
        if (account) {
            console.log(`✓ Prereq PDA (${PREREQ_PDA.toBase58()}): exists`);
            console.log(`  Owner: ${account.owner.toBase58()}`);
            console.log(`  Lamports: ${account.lamports}`);
            console.log(`  Data length: ${account.data.length}`);
            
            // Try to decode the account data
            if (account.data.length >= 34) {
                const pre_req_ts = account.data[33] !== 0;
                const pre_req_rs = account.data.length > 34 ? account.data[34] !== 0 : false;
                console.log(`  pre_req_ts: ${pre_req_ts}`);
                console.log(`  pre_req_rs: ${pre_req_rs}`);
                
                // Try to read github field (string at the end)
                if (account.data.length > 35) {
                    try {
                        const githubStart = 35;
                        const githubLength = account.data.readUInt32LE(githubStart);
                        if (githubLength > 0 && githubStart + 4 + githubLength <= account.data.length) {
                            const github = account.data.slice(githubStart + 4, githubStart + 4 + githubLength).toString('utf8');
                            console.log(`  github: "${github}"`);
                        }
                    } catch (e) {
                        console.log(`  github: (failed to decode)`);
                    }
                }
            }
        } else {
            console.log(`✗ Prereq PDA (${PREREQ_PDA.toBase58()}): does not exist`);
        }
    } catch (e) {
        console.log(`✗ Prereq PDA error:`, e);
    }
    
    // 3. Check collection
    try {
        const account = await connection.getAccountInfo(COLLECTION);
        if (account) {
            console.log(`✓ Collection (${COLLECTION.toBase58()}): exists`);
            console.log(`  Owner: ${account.owner.toBase58()}`);
            console.log(`  Lamports: ${account.lamports}`);
        } else {
            console.log(`✗ Collection (${COLLECTION.toBase58()}): does not exist`);
        }
    } catch (e) {
        console.log(`✗ Collection error:`, e);
    }
    
    // 4. Derive and check authority PDA
    try {
        const [authorityPDA, authorityBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("collection"), COLLECTION.toBuffer()],
            TURBIN3_PREREQ_PROGRAM
        );
        
        console.log(`Authority PDA: ${authorityPDA.toBase58()} (bump: ${authorityBump})`);
        
        const account = await connection.getAccountInfo(authorityPDA);
        if (account) {
            console.log(`✓ Authority PDA exists`);
            console.log(`  Owner: ${account.owner.toBase58()}`);
            console.log(`  Lamports: ${account.lamports}`);
        } else {
            console.log(`✗ Authority PDA does not exist`);
        }
    } catch (e) {
        console.log(`✗ Authority PDA error:`, e);
    }
    
    // 5. Verify PDA derivation
    console.log("\n=== PDA Verification ===");
    const [expectedPrereqPDA, expectedBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("prereqs"), keypair.publicKey.toBuffer()],
        TURBIN3_PREREQ_PROGRAM
    );
    
    console.log(`Expected prereq PDA: ${expectedPrereqPDA.toBase58()}`);
    console.log(`Your prereq PDA:     ${PREREQ_PDA.toBase58()}`);
    console.log(`Match: ${expectedPrereqPDA.equals(PREREQ_PDA)}`);
    console.log(`Expected bump: ${expectedBump}`);
    
    // 6. Check MPL Core program
    try {
        const account = await connection.getAccountInfo(MPL_CORE_PROGRAM);
        if (account) {
            console.log(`✓ MPL Core program exists`);
        } else {
            console.log(`✗ MPL Core program does not exist`);
        }
    } catch (e) {
        console.log(`✗ MPL Core program error:`, e);
    }
}

async function simulateSubmitRs() {
    console.log("\n=== Simulating submit_rs Transaction ===");
    
    const mint = Keypair.generate();
    
    // Derive authority PDA
    const [authorityPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), COLLECTION.toBuffer()],
        TURBIN3_PREREQ_PROGRAM
    );
    
    console.log("Transaction accounts:");
    console.log(`  0: user (${keypair.publicKey.toBase58()}) - writable, signer`);
    console.log(`  1: account (${PREREQ_PDA.toBase58()}) - writable`);
    console.log(`  2: mint (${mint.publicKey.toBase58()}) - writable, signer`);
    console.log(`  3: collection (${COLLECTION.toBase58()}) - writable`);
    console.log(`  4: authority (${authorityPDA.toBase58()}) - readonly`);
    console.log(`  5: mpl_core_program (${MPL_CORE_PROGRAM.toBase58()}) - readonly`);
    console.log(`  6: system_program (11111111111111111111111111111111) - readonly`);
    
    // Check if all accounts exist (except mint which should be new)
    const accountsToCheck = [
        { name: "user", pubkey: keypair.publicKey },
        { name: "account", pubkey: PREREQ_PDA },
        { name: "collection", pubkey: COLLECTION },
        { name: "authority", pubkey: authorityPDA },
        { name: "mpl_core_program", pubkey: MPL_CORE_PROGRAM },
    ];
    
    for (const acc of accountsToCheck) {
        try {
            const accountInfo = await connection.getAccountInfo(acc.pubkey);
            if (accountInfo) {
                console.log(`✓ ${acc.name}: exists`);
            } else {
                console.log(`✗ ${acc.name}: does not exist`);
            }
        } catch (e) {
            console.log(`✗ ${acc.name}: error - ${e}`);
        }
    }
}

// Run the debug
debugAllAccounts()
    .then(() => simulateSubmitRs())
    .catch(console.error);