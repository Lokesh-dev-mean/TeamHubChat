const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:5000/api';
const TEST_USER_EMAIL = 'test@example.com'; // Replace with actual test user email
const TEST_USER_PASSWORD = 'password123'; // Replace with actual test user password

async function testMessageSending() {
  try {
    console.log('🧪 Starting message sending test...');
    
    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Get conversations
    console.log('2️⃣ Fetching conversations...');
    const conversationsResponse = await axios.get(`${API_BASE}/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const conversations = conversationsResponse.data.data.conversations;
    console.log(`✅ Found ${conversations.length} conversations`);
    
    if (conversations.length === 0) {
      console.log('⚠️ No conversations found, creating a test conversation...');
      
      // Create a test conversation
      const createConvResponse = await axios.post(`${API_BASE}/messages/conversations`, {
        name: 'Test Conversation',
        participantIds: [], // Empty for now
        isGroup: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newConversation = createConvResponse.data.data.conversation;
      console.log(`✅ Created test conversation: ${newConversation.id}`);
      
      // Use the new conversation
      const conversationId = newConversation.id;
    } else {
      // Use the first conversation
      const conversationId = conversations[0].id;
      console.log(`📝 Using conversation: ${conversations[0].name} (${conversationId})`);
    }
    
    // Step 3: Send a test message
    console.log('3️⃣ Sending test message...');
    const messageResponse = await axios.post(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
      messageText: 'This is a test message from the test script',
      messageType: 'text'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Message sent successfully!');
    console.log('📨 Message details:', messageResponse.data.data.message);
    
    // Step 4: Verify message was created by fetching messages
    console.log('4️⃣ Verifying message was created...');
    const messagesResponse = await axios.get(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const messages = messagesResponse.data.data.messages;
    console.log(`✅ Found ${messages.length} messages in conversation`);
    
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('📝 Last message:', {
        id: lastMessage.id,
        text: lastMessage.messageText,
        sender: lastMessage.sender?.displayName,
        createdAt: lastMessage.createdAt
      });
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
testMessageSending();
