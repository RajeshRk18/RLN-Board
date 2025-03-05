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
  public async addMember(account: Account, secret: bigint): Promise<void> {
    const tokenRecord = this.tokenRecords[account.toString()]; 
    const index = this.size;
    const identityCommitment = poseidon2([secret]);
    const oldRoot = this.tree.root;
    const _proof = this.tree.createProof(index);
    const newRoot = this.tree.root;
    const output = await this.program.register(this.id, secret.toString(), tokenRecord, oldRoot.toString(), newRoot.toString());

    this.size += 1
  }

  public async postMessage(account: Account, secret: bigint, message: string): Promise<void> {
    const identityCommitment = poseidon2([secret]);
    const index = this.tree.indexOf(identityCommitment);
    const proof = this.tree.createProof(index)
    const messageCounterRecord = this.userMessageCountRecords[account.toString()];
    // let output = await this.program.postMessage(this.id, account._address, secret.toString(), index, message,  messageCounterRecord, "", "");
  }
}
