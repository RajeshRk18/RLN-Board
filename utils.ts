import { ALEO_BASE_FIELD } from "./rln_board";

export function generateGroupId(): string {
    const ALEO_BASE_FIELD = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040");

    // Generate a random BigInt within the Aleo base field range
    let groupId = BigInt(`0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`);

    groupId = groupId % ALEO_BASE_FIELD;

    return groupId.toString();
}
