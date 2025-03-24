import { RLNBoard } from './rln_board';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { Account } from '@provablehq/sdk';
import { randomBytes } from 'crypto';
import { poseidon2 } from 'poseidon-lite';

export function loadRlnBoardEnv(userId: number) {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    const rlnBoardPath = join(currentDir, '/.env');
    
    const result = dotenv.config({ path: rlnBoardPath });
    
    if (result.error) {
        throw new Error(`Error loading .env file: ${result.error.message}`);
    }

    let privateKey: string;
    if (userId === 1) {
        privateKey = process.env.PRIVATE_KEY_1;
    } else if (userId === 2) {
        privateKey = process.env.PRIVATE_KEY_2;
    } else {
        throw new Error('User ID not found in .env file');
    }

    if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in .env file');
    }

    return {
        privateKey
    };
}

const account1 = new Account({ privateKey: loadRlnBoardEnv(1).privateKey });

const board = new RLNBoard(account1);
console.log(`Board created with ID: ${board.id}`);
const secret = 765467897654;
const identityCommitment = poseidon2([secret]);
board.tree.insert(identityCommitment);
console.log("Merkle Proof for member1: ", board.tree.createProof(0));

const account2 = new Account({ privateKey: loadRlnBoardEnv(2).privateKey});
const secret1 = 986754567812;
const identityCommitment1 = poseidon2([secret1]);
board.tree.insert(identityCommitment1);
console.log("Merkle Proof for member2: ", board.tree.createProof(1));

