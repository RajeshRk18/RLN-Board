import { useState, useEffect } from 'react';
import { 
    Button, 
    Input, 
    VStack, 
    HStack, 
    Text, 
    Box, 
    Alert,
    StackProps
  } from '@chakra-ui/react';
import { AlertIcon } from '@chakra-ui/alert';
import { Account } from '@provablehq/sdk';
import { RLNBoard } from './rln_board';
import { poseidon2 } from 'poseidon-lite';

interface AccountData {
  account: Account;
  secret: bigint;
  name: string;
}

export default function App() {
  const [rlnBoard, setRlnBoard] = useState<RLNBoard | null>(null);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: string; content: string }>>([]);
  const [slashingNotifications, setSlashingNotifications] = useState<Array<{ offenderIdentityCommitment: bigint }>>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const setup = async () => {
      const secrets = [BigInt(123), BigInt(456), BigInt(789)];
      const demoAccounts: AccountData[] = secrets.map((secret, i) => ({
        account: new Account(),
        secret,
        name: `User ${i + 1}`
      }));
      setAccounts(demoAccounts);
      setCurrentAccount(demoAccounts[0].account);

      const board = new RLNBoard(demoAccounts[0].account);
      setRlnBoard(board);

      for (let i = 1; i < demoAccounts.length; i++) {
        await board.addMember(demoAccounts[i].account, demoAccounts[i].secret);
      }
      setMessages(Array.from(board.messages.entries()).map(([sender, content]) => ({ sender, content })));
    };
    setup();
  }, []);

  const handlePostMessage = async () => {
    if (!currentAccount || !rlnBoard || !newMessage.trim()) return;
    const currentAcc = accounts.find(acc => acc.account === currentAccount);
    if (!currentAcc) return;

    await rlnBoard.postMessage(currentAcc.account, currentAcc.secret, newMessage);
    const messageAdded = rlnBoard.messages.get(currentAcc.account.toString()) === newMessage;
    
    if (!messageAdded) {
      const identityCommitment = poseidon2([currentAcc.secret]);
      setSlashingNotifications(prev => [...prev, { offenderIdentityCommitment: identityCommitment }]);
    }
    setMessages(Array.from(rlnBoard.messages.entries()).map(([sender, content]) => ({ sender, content })));
    setNewMessage('');
  };

  const handleSlash = async (offenderCommitment: bigint) => {
    if (!currentAccount || !rlnBoard) return;
    const currentAcc = accounts.find(acc => acc.account === currentAccount);
    if (!currentAcc) return;

    await rlnBoard.slash(
      currentAcc.account,
      currentAcc.secret,
      offenderCommitment,
      BigInt(0), BigInt(0), BigInt(0), BigInt(0), 0
    );
    rlnBoard.remove(rlnBoard.tree.indexOf(offenderCommitment));
    const offender = accounts.find(acc => poseidon2([acc.secret]) === offenderCommitment);
    if (offender) rlnBoard.messages.delete(offender.account.toString());
    
    setMessages(prev => prev.filter(msg => msg.sender !== offender?.account.toString()));
    setSlashingNotifications(prev => prev.filter(n => n.offenderIdentityCommitment !== offenderCommitment));
  };

  return (
    <VStack spacing={4} p={4}>
      <HStack spacing={4}>
        {accounts.map(acc => (
          <Button key={acc.name} onClick={() => setCurrentAccount(acc.account)}
            colorScheme={currentAccount === acc.account ? 'blue' : 'gray'}>
            {acc.name}
          </Button>
        ))}
      </HStack>

      <HStack>
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Enter message" />
        <Button onClick={handlePostMessage} colorScheme="teal">Post</Button>
      </HStack>

      <Box w="100%">
        <Text fontSize="xl" mb={2}>Messages</Text>
        <VStack spacing={2} align="stretch">
          {messages.map((msg, i) => (
            <Box key={i} p={2} borderWidth={1} borderRadius="md">
              <Text fontWeight="bold">{msg.sender}</Text>
              <Text>{msg.content}</Text>
            </Box>
          ))}
        </VStack>
      </Box>

      <Box w="100%">
        <Text fontSize="xl" mb={2}>Alerts</Text>
        <VStack spacing={2}>
          {slashingNotifications.map((notif, i) => {
            const offender = accounts.find(acc => poseidon2([acc.secret]) === notif.offenderIdentityCommitment);
            return (
              <Alert key={i} status="error">
                <AlertIcon />
                {offender?.name} exceeded rate limit!
                <Button ml={3} size="sm" colorScheme="red" onClick={() => handleSlash(notif.offenderIdentityCommitment)}>
                  Slash
                </Button>
              </Alert>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
}