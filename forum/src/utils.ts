import { ALEO_BASE_FIELD } from "./rln_board";

/**
 * 
 * @returns a group Id within the Aleo base field range
 */
export function generateGroupId(): string {
    let groupId = BigInt(`0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`);

    groupId = groupId % ALEO_BASE_FIELD;

    return groupId.toString();
}
