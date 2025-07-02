import { PublicKey } from "@solana/web3.js";
import wallet from "./Turbin3-wallet.json";
import { Keypair } from "@solana/web3.js";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

const possiblePda = new PublicKey("83H5VUBArURmhMpXoss9W6fRJXtB3cL3Sdiu5uJYVVJu");
const walletPubkey = new PublicKey(keypair.publicKey);
const programId = new PublicKey("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");

const [expectedPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("prereqs"), walletPubkey.toBuffer()],
  programId
);

console.log("Expected PDA:", expectedPda.toBase58());
console.log("Match?", possiblePda.equals(expectedPda));
