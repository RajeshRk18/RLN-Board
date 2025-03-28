import { IMT, IMTNode, IMTMerkleProof } from "@zk-kit/imt"
import { poseidon2 } from "poseidon-lite"
import { Account } from '@provablehq/sdk';
import { RecordCiphertext, RecordPlaintext } from "@provablehq/sdk";
import { generateGroupId } from "./utils";
import { RlnProgram } from "./program";

const depth = 15
const zeroValue = 0
const arity = 2
export const ALEO_BASE_FIELD: bigint = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040");

/**
 * **`RLNBoard`** manages the off-chain state for a decentralized message board
 * using the RLN protocol.
 */
export class RLNBoard {
  public readonly id: string
  public tree: IMT
  public size: number
  public messages: Map<string, string>

  public program: RlnProgram
  tokenRecords: Map<String, RecordCiphertext>
  messageTimeLockRecords: Map<String, RecordCiphertext>
  userMessageCountRecords: Map<String, RecordCiphertext>

  /**
   * 
   * @param account - address of the account that will create the board
   */
  constructor(account: Account) {
    this.id = generateGroupId();
    this.tree = new IMT(poseidon2, depth, zeroValue, arity);
    this.size = 0;
    this.program = new RlnProgram(account);
    this.tokenRecords = new Map();
    this.messageTimeLockRecords = new Map();
    this.userMessageCountRecords = new Map();
    this.messages = new Map();
  }

  /**
   * Inserts an `identity commitment` into the board's IMT.
   * 
   * @param leaf - The leaf to insert
   */
  insert(leaf: bigint): void {
    this.tree.insert(leaf)
  }

  /**
   * Removes the identity commitment at the given index and replace the leaf with value.
   * 
   * @param index - Index of the leaf to remove
   */
  remove(index: number): void {
    const zero = BigInt(0);
    this.tree.update(index, zero);
  }

  /**
   * Adds a member to the board.
   * 
   * @param account the member account
   * @param secret secret key of the member
   */
  public async addMember(account: Account, secret: bigint): Promise<IMTNode> {
    const leaves = this.tree.leaves;
    const identityCommitment = poseidon2([secret]);
    leaves.includes(identityCommitment) === false;

    const mintToken = await this.program.mintToken(account.toString(), 100);
    const mintTokenRecord = mintToken[0];
    this.tokenRecords[account.toString()] = RecordCiphertext.fromString(mintTokenRecord);

    const tokenRecord = this.tokenRecords[account.toString()]; 
    const oldRoot = this.tree.root;
    this.insert(identityCommitment);
    const newRoot = this.tree.root;
    const outputs = await this.program.register(this.id, secret.toString(), tokenRecord, oldRoot.toString(), newRoot.toString());

    const newTokenRecord = outputs[0];
    this.tokenRecords[account.toString()] = RecordCiphertext.fromString(newTokenRecord);

    this.size += 1;

    return oldRoot;
  }

  public async postMessage(account: Account, secret: bigint, message: string): Promise<void> {
    const identityCommitment = poseidon2([secret]);
    const index = this.tree.indexOf(identityCommitment);
    const proof = this.tree.createProof(index);
    const messageCounterRecord = this.userMessageCountRecords[account.toString()];
    const messageCounterRecordPlaintext = messageCounterRecord.decrypt(account.viewKey());
    const groupNullifier = await this.program.getGroupNullifier(this.id);
    const outputs = await this.program.postMessage(this.id, groupNullifier, account.address().to_string(), secret.toString(), index, message, messageCounterRecordPlaintext, proof.siblings, proof.pathIndices, proof.root);
  
    const newMessageCounterRecord = outputs[0];
    this.userMessageCountRecords[account.toString()] = RecordCiphertext.fromString(newMessageCounterRecord);

    const exceedFlag = outputs[1];

    // TODO: Add exceed flag to the thread which runs broadcast task to alert the other board members, this member exceeded the rate limit 
    if (exceedFlag === "false") {
      this.messages[account.toString()] = message;
    }
  }

  public async withdrawStake(account: Account, secret: bigint): Promise<void> {
    const identityCommitment = poseidon2([secret]);
    const index = this.tree.indexOf(identityCommitment);
    const proof = this.tree.createProof(index);
    const messageCounterRecord = this.userMessageCountRecords[account.toString()];
    const messageCounterRecordPlaintext = messageCounterRecord.decrypt(account.viewKey());
    const tokenRecord = this.tokenRecords[account.toString()]; 
    this.remove(index);
    const newRoot = this.tree.root;
    const outputs = await this.program.withdrawStake(this.id, account.address().to_string(), secret.toString(), index, tokenRecord, messageCounterRecordPlaintext, proof.siblings, proof.pathIndices, newRoot.toString());

    const newTokenRecord = outputs[0];
    this.tokenRecords[account.toString()] = RecordCiphertext.fromString(newTokenRecord);

    this.size -= 1;
  }

  public async slash(slasher: Account, slasherSecret: bigint, slasheeIdentityCommitment: bigint, xShare0: bigint, xShare1: bigint, yShare0: bigint, yShare1: bigint, nullifierId: number): Promise<void> {
    const identityCommitment = poseidon2([slasherSecret]);  
    const index = this.tree.indexOf(identityCommitment);
    const proof = this.tree.createProof(index);
    const tokenRecord = this.tokenRecords[slasher.toString()]; 
    const outputs = await this.program.slash(this.id, slasher.address().to_string(), slasherSecret.toString(), slasheeIdentityCommitment.toString(), xShare0.toString(), xShare1.toString(), yShare0.toString(), yShare1.toString(), tokenRecord, proof.siblings, proof.pathIndices, proof.root);

    const newTokenRecord = outputs[0];
    this.tokenRecords[slasher.toString()] = RecordCiphertext.fromString(newTokenRecord);
  }
}
