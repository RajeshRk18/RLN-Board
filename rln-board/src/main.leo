// This RLN message board program uses the Rate Limiting Nullifier (RLN)
// protocol to enforce an anti-spam mechanism on a decentralized message board.
// Members join by depositing a stake, which is later used to slash the stake
// of any member who exceeds the message limit. A Merkle tree(stored off-chain) is used to maintain
// the board's member list in a privacy‐preserving manner.

program rln_boardv01.aleo {

    /// ==================================================
    ///          Data Structures & Constants
    /// ==================================================

    record Token {
        owner: address,
        amount: u64,
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

        // tracks the number of messages member has sent.
        // slasher can look for if any counter exceeded the allowed limit and start proceeding to slash
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

    struct Message {
        message: field,
        timestamp: u32,
    }

    /// ================================================
    ///              Persistent Mappings
    /// ================================================

    // group_id -> group
    mapping rln_group: field => Group;

    // hash(group_id || identity_commitment) -> group member
    mapping rln_group_member: field => GroupMember;

    // hash(group_id || identity_commitment) -> index
    mapping group_member_index: field => u32;

    ///
    /// Flag indicating if a member has exited (withdrawn or slashed).
    ///
    // hash(group_id || identity_commitment) -> group_member_exit_flag
    mapping group_member_exit_flag: field => bool;

    // group_id -> group nullifier
    mapping group_nullifier: field => field;

    ///
    /// this stores the valid message, the one corresponds to valid message id
    ///
    // hash(group_id || identity_commitment) -> member message with block timestamp
    mapping group_message: field => Message;

    ///
    /// this stores the output from RLN protocol
    ///
    // hash(group_id || index || counter) -> rln_outputs
    mapping rln_outputs: field => RLNOutput;

    ///
    /// this is basically the x value from linear polynomial
    /// this stores every message sent by member. Slasher can use this to acquire the x values 
    /// 
    // hash(group_id || index || counter) -> Member message with block timestamp
    mapping messages: field => Message;

    // hash(group_id || secret) -> deposit
    mapping deposits: field => u64;


    /// ========================================
    /// Transitions and Functions
    /// ========================================

    async transition create_group(group_id: field) -> Future {
        return finalize_create_group(group_id);
    }

    async function finalize_create_group(group_id: field) {
        assert(!rln_group.contains(group_id));
        let board: Group = Group {
            id: group_id,
            root: 0field,
            size: 1u32,
        };
        let grp_nullifier: field = Poseidon2::hash_to_field(group_id);
        group_nullifier.set(group_id, grp_nullifier);
        rln_group.set(group_id, board);
    }

    // Allows a user to mint a token to deposit as stake.
    transition mint_token(receiver: address, amount: u64) -> Token {
        assert_eq(self.caller, receiver);

        return Token {
            owner: receiver,
            amount
        };
    }

    // Adds a new member to the board.
    async transition register(public group_id: field, secret: field, token: Token, root: field, old_root: field) -> (Token, Future) {
        let identity_commitment: field = Poseidon2::hash_to_field(secret);

        assert(token.owner == self.caller);
        assert(token.amount >= RATE_PER_GROUP as u64);

        let remaining: u64 = token.amount - RATE_PER_GROUP as u64;
        let new_token: Token = Token {
            owner: token.owner,
            amount: remaining,
        };

        let deposit_key: field = BHP256::hash_to_field([group_id, secret]);

        let register_future: Future = finalize_register(group_id, token.owner, deposit_key, identity_commitment, RATE_PER_GROUP as u64, root, old_root);
        return (new_token, register_future);
    }

    async function finalize_register(group_id: field, owner: address, deposit_key: field, identity_commitment: field, amount: u64, root: field, old_root: field) {
        let board: Group = rln_group.get(group_id);
        let mem_index: u32 = board.size;
        let member: GroupMember = GroupMember {
            group_id,
            identity_commitment,
            index: mem_index,
            message_counter: 0u32,
        };

        let group_member_key: field = Poseidon2::hash_to_field([group_id, identity_commitment]);
        
        assert(!rln_group_member.contains(group_member_key));

        // check if the member is already exited
        if group_member_exit_flag.contains(group_member_key) {
            assert(group_member_exit_flag.get(group_member_key) == false);
        }

        rln_group_member.set(group_member_key, member);

        group_member_exit_flag.set(group_member_key, false);

        group_member_index.set(group_member_key, mem_index);
        deposits.set(deposit_key, amount);

        assert(board.root == old_root);
        let rln_board: Group = Group {
            id: group_id,
            root,
            size: board.size + 1u32,
        };

        rln_group.set(group_id, rln_board);
    }


    // Allows a member to post a message.
    // It computes RLN outputs, verifies the Merkle proof for the identity commitment,
    // increments the member's message counter, and updates both the message and RLN output mappings.
    async transition post_message(group_id: field, grp_nullifier: field, member_address: address, secret_key: field, index: u32, message: field, message_id: u32, msg_counter_record: UserMessageCounter, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15], root: field, old_root: field) -> (UserMessageCounter, bool, Future) {
        let identity_commitment: field = Poseidon2::hash_to_field(secret_key);

        let msg_hash: field = Poseidon2::hash_to_field(message);
        let a1: field = Poseidon4::hash_to_field([secret_key, grp_nullifier, message_id as field]);
        let y: field = a1 * msg_hash + secret_key;
        let nullifier: field = Poseidon2::hash_to_field(a1);
        assert_eq(group_id, msg_counter_record.group_id);

        assert(verify_merkle_proof(root, identity_commitment, merkle_path_elements, merkle_path_indices));

        let exceed_flag: bool = false;
        if message_id > 1u32 {
            exceed_flag = true;
        }

        let new_counter_record: UserMessageCounter = UserMessageCounter {
            owner: msg_counter_record.owner,
            group_id,
            counter: msg_counter_record.counter + 1u32,
        };

        let rln_output: RLNOutput = RLNOutput {
            y,
            nullifier,
            root,
        };

        let post_message_future: Future = finalize_post_message(group_id, identity_commitment, index, new_counter_record.owner, msg_hash, msg_counter_record.counter, old_root, rln_output, exceed_flag);
        return (new_counter_record, exceed_flag, post_message_future);
    }

    async function finalize_post_message(group_id: field, identity_commitment: field, index: u32, member: address, msg_hash: field, msg_counter: u32, old_root: field, rln_output: RLNOutput, exceed_flag: bool) {
        let board: Group = rln_group.get(group_id);

        let group_member_key: field = Poseidon2::hash_to_field([group_id, identity_commitment]);
        assert(rln_group_member.contains(group_member_key));

        let is_ex_member: bool = group_member_exit_flag.get(group_member_key);
        assert(!is_ex_member);

        let group_member: GroupMember = rln_group_member.get(group_member_key);
        let group_member_index_key: field = group_member_key;
        let mem_index: u32 = group_member_index.get(group_member_index_key);
        assert(index == mem_index);

        assert(group_member.identity_commitment == identity_commitment);

        let message: Message = Message {
            message: msg_hash,
            timestamp: block.height,
        };

        let group_message_key: field = Poseidon2::hash_to_field([group_id, identity_commitment]);
        if !exceed_flag {
            group_message.set(group_message_key, message);
        }

        let message_key: field = Poseidon4::hash_to_field([group_id, index as field, msg_counter as field]);
        messages.set(message_key, message);

        let rln_output_key: field = message_key;
        rln_outputs.set(rln_output_key, rln_output);
        
        assert(group_member.message_counter + 1u32 == msg_counter);

        let updated_group_member: GroupMember = GroupMember {
            group_id,
            identity_commitment,
            index,
            message_counter: msg_counter,
        };

        rln_group_member.set(group_member_key, updated_group_member);
        
        assert(board.root == old_root);
        let rln_board: Group = Group {
            id: group_id,
            root: rln_output.root,
            size: board.size,
        };

        rln_group.set(group_id, rln_board);
    }

    // Allows a member to withdraw their stake.
    async transition withdraw_stake(public group_id: field, member: address, secret: field, index: u32, token: Token, msg_counter_record: UserMessageCounter, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15], root: field, old_root: field) -> (Token, Future) {
        assert(token.owner == member);

        let identity_commitment: field = Poseidon2::hash_to_field(secret);
        assert(verify_merkle_proof(root, identity_commitment, merkle_path_elements, merkle_path_indices));

        let withdraw: u64 = token.amount + RATE_PER_GROUP as u64;
        let new_token: Token = Token {
            owner: token.owner,
            amount: withdraw,
        };

        let deposit_key: field = BHP256::hash_to_field([group_id, secret]);
        let withdraw_stake_future: Future = finalize_withdraw_stake(group_id, index, msg_counter_record.counter, root, old_root, deposit_key, identity_commitment);
        
        return (new_token, withdraw_stake_future);
    }

    async function finalize_withdraw_stake(group_id: field, index: u32, msg_counter: u32, root: field, old_root: field, deposit_key: field, identity_commitment: field) {
        let board: Group = rln_group.get(group_id);

        let group_member_key: field = Poseidon2::hash_to_field([group_id, identity_commitment]);
        let is_ex_member: bool = group_member_exit_flag.get(group_member_key);
        assert(!is_ex_member);
        let member: GroupMember = rln_group_member.get(group_member_key);
        assert(member.identity_commitment == identity_commitment);

        let group_member_index_key: field = group_member_key;
        let mem_index: u32 = group_member_index.get(group_member_index_key);
        assert(index == mem_index);

        let mem_msg_key: field = Poseidon4::hash_to_field([group_id, index as field, msg_counter as field]);
        let member_recent_message: Message = messages.get(mem_msg_key);

        assert(board.root == old_root);
        let rln_board: Group = Group {
            id: group_id,
            root,
            size: board.size - 1u32,
        };

        group_message.remove(group_member_key);
        group_member_index.remove(group_member_key);
        rln_group_member.remove(group_member_key);
        deposits.remove(deposit_key);

        group_member_exit_flag.set(group_member_key, true);

        rln_group.set(group_id, rln_board);
    }

    // Allows a slasher to penalize a member who exceeded the message limit.
    async transition slash(public group_id: field, slasher: address, slasher_secret: field, slashee_identity_commitment: field, x_share0: field, x_share1: field, y_share0: field, y_share1: field, token: Token, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15], root: field, old_root: field) -> (Token, Future) {
        let secret: field = derive_secret(x_share0, x_share1, y_share0, y_share1);
        let identity_commitment: field = Poseidon2::hash_to_field(secret);

        assert(identity_commitment == slashee_identity_commitment);
        assert(verify_merkle_proof(root, identity_commitment, merkle_path_elements, merkle_path_indices));

        let slash_amount: u64 = 2u64;

        let new_token: Token = Token {
            owner: token.owner,
            amount: token.amount + slash_amount,
        };
         
        let slasher_identity_commitment: field = Poseidon2::hash_to_field(slasher_secret);
        let slasher_deposit_key: field = Poseidon2::hash_to_field([group_id, slasher_secret]);
        let slashee_deposit_key: field = Poseidon2::hash_to_field([group_id, secret]);
        let slash_future: Future = finalize_slash(group_id, slasher, slasher_identity_commitment, slasher_deposit_key, slashee_deposit_key, identity_commitment, root, old_root);
        
        return (new_token, slash_future);
    }

    async function finalize_slash(group_id: field, slasher: address, slasher_id_commitment: field, slasher_deposit_key: field, slashee_deposit_key: field, slashee_identity_commitment: field, root: field, old_root: field) {
        let board: Group = rln_group.get(group_id);

        let group_member_key_slasher: field = Poseidon2::hash_to_field([group_id, slasher_id_commitment]);

        assert(rln_group_member.contains(group_member_key_slasher));

        let group_member_key_slashee: field = Poseidon2::hash_to_field([group_id, slashee_identity_commitment]);
        
        let is_ex_member: bool = group_member_exit_flag.get(group_member_key_slashee);
        assert(!is_ex_member);

        let slashee_deposit_amount: u64 = deposits.get(slashee_deposit_key);
        let slasher_deposit_amount: u64 = deposits.get(slasher_deposit_key);

        let slashee: GroupMember = rln_group_member.get(group_member_key_slashee);

        assert(board.root == old_root);
        let rln_board: Group = Group {
            id: group_id,
            root,
            size: board.size - 1u32,
        };

        group_message.remove(group_member_key_slashee);
        rln_group_member.remove(group_member_key_slashee);
        group_member_index.remove(group_member_key_slashee);
        deposits.remove(slashee_deposit_key);

        group_member_exit_flag.set(group_member_key_slashee, true);
        deposits.set(slasher_deposit_key, slasher_deposit_amount + slashee_deposit_amount);

        rln_group.set(group_id, rln_board);
    }

    // Computes the secret (a0) from two shares.
    inline derive_secret(x0: field, x1: field, y0: field, y1: field) -> field {
        let a1: field = (y1 - y0) / (x1 - x0);
        let a0: field = y0 - a1 * x0;
    
        return a0;
    }

    // Validates that a given leaf is included in the Merkle tree.
    function verify_merkle_proof(root: field, leaf: field, merkle_path_elements: [field; 15], merkle_path_indices: [field; 15]) -> bool {
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

        return current == root;
    }
}
