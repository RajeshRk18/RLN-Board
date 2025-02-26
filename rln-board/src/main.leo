program rln.aleo {

    // A voting program which uses Rate Limiting Nullifier protocol to prevent spam in the voting process
    record Token {
        owner: address,
        amount: u64,
    }

    record MessageTimeLock {
        owner: address,
        group_id: field,
        block_height: u64,
    }

    // Only single message is allowed
    const MESSAGE_LIMIT: u32 = 1u32;
    const RATE_PER_MESSAGE: u32 = 2u32;

    const RATE_PER_GROUP: u32 = 2u32;

    // Fix the merkle tree depth at 15
    const DEPTH: u32 = 15u32;

    // number of hashes
    const NUM_HASHES: u32 = 16u32;

    // once message is posted, cannot withdraw the stake till 100 finalized blocks
    const FREEZE_PERIOD: u32 = 100u32;

    struct Group {
        id: field,
        root: field,
        size: u32,
    }

    struct GroupMember {
        group_id: field,
        // unique anonymous identifier for a group member
        identity_commitment: field,
        // used to uniquely identify an identity commitment holder in a group
        index: u32,

        // used to store the member's nullifier
        nullifier_id: u32,

        // tracks the number of messages member has sent.
        // slasher can look for if any counter exceeded 1 and start proceeding to slash
        message_counter: u32,
    }

    struct RLNOutput {
        // share obtained from the linear polynomial
        y: field,
        // poseidon(a1)
        nullifier: field,
        root: field,
    }

    // tracks the number of messages member has sent.
    // Will be helpful to update the message counter map so that slasher can look for if any counter exceeded 1
    // and start proceeding the slash 
    record UserMessageCounter {
        owner: address,
        group_id: field,
        counter: u32,
    }

    // group_id -> group
    mapping rln_group: field => Group;

    // group_id -> group member seed
    // used to uniquely identify an identity commitment holder in a group
    // this will allow the user to be a member a various groups using the same secret key
    mapping group_member_seed: field => field;

    // hash(group_id || identity_commitment) -> index
    mapping group_member_index: field => u32;

    // group_id -> nullifier
    mapping group_nullifier: field => field;

    // hash(group_member_seed || identity_commitment) -> group_id
    mapping rln_group_member: field => field;

    // hash(group_member_seed || identity_commitment || counter) -> RLN Output
    mapping rln_outputs: field => RLNOutput;

    // nullifier_id -> member_nullifier
    // if a user attempts to repost the message, this comes in handy
    // this is basically Poseidon(a1) from RLN protocol 
    mapping member_nullifier: field => field;

    // hash(group_id || identity_commitment || counter) -> user message hash
    // this is basically the x value from linear polynomial
    // this stores every message sent by member. Slasher can use this to acquire the x values 
    mapping messages: field => field;

    // hash(group_id || identity_commitment) -> user message hash
    // this stores the valid message, the one corresponds to valid message id
    mapping group_message: field => field;

    // hash(group_member_seed || identity_commitment) -> counter
    // if this is more than allowed number of actions, a slasher can look for the 
    mapping message_counter: field => u32;

    // hash(group_id || secret) -> deposit
    mapping deposits: field => u64;

    async transition create_group() -> Future {
        return finalize_create_group();
    }

    async function finalize_create_group() {
        let rand_id: field = ChaCha::rand_field();
        let grp_mem_seed: field = ChaCha::rand_field();
        let group: Group = Group {
            root: 0field,
            id: rand_id
        };
        let grp_nullifier: field = Poseidon2::hash_to_field(rand_id);
        group_nullifier.set(rand_id, grp_nullifier);
        group_member_seed.set(rand_id, grp_mem_seed);
        rln_group.set(rand_id, group);
    }

    transition mint_token(receiver: address, amount: u64) -> Token {
        assert_eq(self.caller, receiver);

        return Token {
            owner: receiver,
            amount
        };

    }

    async transition register(public group_id: field, public grp_mem_seed: field, secret: field, token: Token) -> (Token, Future) {
        let identity_commitment: field = Poseidon2::hash_to_field(secret);

        assert(token.amount >= RATE_PER_GROUP as u64);
        let remaining: u64 = token.amount - RATE_PER_GROUP as u64;
        let new_token: Token = Token {
            owner: token.owner,
            amount: remaining,
        };
        let deposit_key: field = BHP256::hash_to_field([group_id, secret]);

        return (new_token, finalize_register(group_id, grp_mem_seed, token.owner, deposit_key, identity_commitment, RATE_PER_GROUP as u64));
    }

    async function finalize_register(group_id: field, grp_mem_seed: field, owner: address, deposit_key: field, identity_commitment: field, amount: u64) {
        assert(rln_group.contains(group_id));
        assert(group_member_seed.contains(group_id));
        let group_member_key: field = BHP256::hash_to_field([grp_mem_seed, identity_commitment]);
        assert(!rln_group_member.contains(group_member_key));

        group_member_seed.set(group_id, grp_mem_seed);
        deposits.set(deposit_key, amount);
        rln_group_member.set(group_member_key, group_id);
    }

    async transition post_message(group_id: field, grp_nullifier: field, secret_key: field, message: field, message_id: u32, msg_counter_record: UserMessageCounter, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15]) -> (UserMessageCounter, MessageTimeLock, bool, Future) {
        let identity_commitment: field = Poseidon2::hash_to_field(secret_key);

        let msg_hash: field = Poseidon2::hash_to_field(message);
        let a1: field = Poseidon4::hash_to_field([secret_key, grp_nullifier, message_id as field]);
        let y: field = a1 * msg_hash + secret_key;
        let nullifier: field = Poseidon2::hash_to_field(a1);
        assert_eq(group_id, msg_counter_record.group_id);

        let merkle_proof: field = compute_merkle_proof(identity_commitment, merkle_path_elements, merkle_path_indices);
        let exceed_flag: bool = false;
        if message_id > 1u32 {
            exceed_flag = true;
        }

        let new_counter_record: UserMessageCounter = UserMessageCounter {
            owner: msg_counter_record.owner,
            group_id,
            counter: msg_counter_record.counter + 1u32,
        };

        let message_timelock: MessageTimeLock = MessageTimeLock {
            owner: self.caller,
            group_id,
            block_height: block.height,
        };

        let rln_output: RLNOutput = RLNOutput {
            y,
            nullifier,
            root: merkle_proof,
            // a random value will be assigned in finalize
            nullifier_id: 0u32, 
        };

        return (new_counter_record, message_timelock, exceed_flag, finalize_post_message(group_id, identity_commitment, msg_counter_record.owner, msg_hash, msg_counter_record.counter, rln_output, exceed_flag));
    }

    async function finalize_post_message(group_id: field, identity_commitment: field, member: address, msg_hash: field, msg_counter: u32, rln_output: RLNOutput, exceed_flag: bool) {
        let group: Group = rln_group.get(group_id);

        let grp_mem_seed: field = group_member_seed.get(group_id);
        let group_member_key: field = Poseidon2::hash_to_field([grp_mem_seed, identity_commitment]);
        assert(rln_group_member.contains(group_member_key));

        let group_message_key: field = Poseidon2::hash_to_field(group_id, identity_commitment);
        if !exceed_flag {
            group_message.set(group_message_key, msg_hash);
        }

        let message_key: field = Poseidon4::hash_to_field(group_id, identity_commitment, msg_counter);
        messages.set(message_key, msg_hash);

        let nullifier: field = Poseidon2::hash_to_field(rln_output.a1);
        let mem_nullifier_key: u32 = ChaCha::rand_u32();
        member_nullifier.set(mem_nullifier_key, nullifier);

        rln_output.nullifier_id = mem_nullifier_key;
        let rln_output_key: field = group_member_key;
        rln_outputs.set(rln_output_key, rln_output);

        let msg_counter_key: field = group_member_key;
        message_counter.set(msg_counter_key, msg_counter);

        group.root = rln_output.root; 

        rln_group.set(group_id, group);
    }

    async transition withdraw_stake(public group_id: field, member: address, secret: field, token: Token, message_timelock: MessageTimeLock) -> (Token, Future) {
        assert(message_timelock.owner == member);
        assert(message_timelock.group_id == group_id);
        assert(message_timelock.block_height + 100u64 >= block.height);
        assert(token.owner == member);

        let identity_commitment: field = Poseidon2::hash_to_field(secret);

        let withdraw: u64 = token.amount + RATE_PER_GROUP as u64;
        let new_token: Token = Token {
            owner: token.owner,
            amount: withdraw,
        };

        let post_block_height: u64 = message_timelock.block_height;
        let deposit_key: field = BHP256::hash_to_field([group_id, secret]);

        return (new_token, finalize_withdraw_stake(group_id, deposit_key, identity_commitment));
    }

    async function finalize_withdraw_stake(group_id: field, deposit_key: field, identity_commitment: field) {
        let group: Group = rln_group.get(group_id);
        let grp_mem_seed: field = group_member_seed.get(group_id);
        let group_member_key: field = Poseidon2::hash_to_field([grp_mem_seed, identity_commitment]);
        
        rln_group_member.remove(group_member_key);
        
        deposits.remove(deposit_key);
    }

    async transition slash(public group_id: field, slasher: address, slasher_secret: field, slashee_identity_commitment: field, x_share0: field, x_share1: field, y_share0: field, y_share1: field, pub nullifier_id: u32, token: Token) -> (Token, Future) {
        let secret: field = derive_secret(x_share0, x_share1, y_share0, y_share1);
        let identity_commitment: field = Poseidon2::hash_to_field(secret);

        assert(identity_commitment == slashee_identity_commitment);

        let slash_amount: u64 = 2u64;

        let new_token: Token = Token {
            owner: token.owner,
            amount: token.amount + slash_amount,
        };
         
        let slasher_identity_commitment: field = Poseidon2::hash_to_field(slasher_secret);
        let slasher_deposit_key: field = Poseidon2::hash_to_field([group_id, slasher_secret]);
        let slashee_deposit_key: field = Poseidon2::hash_to_field([group_id, secret]);

        return (new_token, finalize_slash(group_id, slasher, slasher_id_commitment, slasher_deposit_key slashee_identity_commitment, nullifier_id))
    }

    async function finalize_slash(group_id: field, slasher: address, slasher_id_commitment: field, slasher_deposit_key: field, slashee_identity_commitment: field, slashee_deposit_key: field, nullifier_id: u32) {
        let group: Group = rln_group.get(group_id);

        let grp_mem_seed: field = group_member_seed.get(group_id);

        let group_member_key_slasher: field = Poseidon2::hash_to_field([grp_mem_seed, slasher_id_commitment]);

        assert(rln_group_member.contains(group_member_key_slasher));

        let slashee_deposit_amount: u64 = deposits.get(slashee_deposit_key);
        let slasher_deposit_amount: u64 = deposits.get(slasher_deposit_key);

        deposits.set(slasher_deposit_key, slasher_deposit_amount + slashee_deposit_amount);
        deposits.remove(slashee_deposit_key);

        let group_member_key_slashee: field = Poseidon2::hash_to_field([grp_mem_seed, slashee_identity_commitment]);

        rln_group_member.remove(group_member_key_slashee);
    }

    inline derive_secret(x0: field, x1: field, y0: field, y1: field, a1: field) -> field {
        let a1: field = (y1 - y0) / (x1 - x0);
        let a0: field = y0 - a1 * x0;
        return a0;

    }
    function compute_merkle_proof(leaf: field, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15]) -> field {
        let current: field = leaf;

        for i: u32 in 0u32..15u32 {
            // ensure indices array hold either zero or one
            let selector: field = merkle_path_indices[i];
            assert_eq(selector * (selector - 1field), 0field);

            let sibling: field = merkle_path_elements[i];
            if selector == 0field {
                current = Poseidon2::hash_to_field([current, sibling]);
            } else {
                current = Poseidon2::hash_to_field([sibling, current]);
            }
        }

        return current;
    }
}
