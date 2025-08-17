const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserStatus() {
  try {
    console.log('Testing User Status System...\n');

    // Test 1: Get all users with their status
    console.log('1. Getting all users with status:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        onlineStatus: true,
        lastSeenAt: true
      },
      take: 5
    });
    
    users.forEach(user => {
      console.log(`   - ${user.displayName} (${user.email}): ${user.onlineStatus} - Last seen: ${user.lastSeenAt || 'Never'}`);
    });

    // Test 2: Update a user's status
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n2. Updating ${testUser.displayName}'s status to 'busy':`);
      
      const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: {
          onlineStatus: 'busy',
          lastSeenAt: new Date()
        },
        select: {
          id: true,
          displayName: true,
          onlineStatus: true,
          lastSeenAt: true
        }
      });
      
      console.log(`   - Updated: ${updatedUser.displayName} is now ${updatedUser.onlineStatus}`);
    }

    // Test 3: Get users by status
    console.log('\n3. Getting users by status:');
    const onlineUsers = await prisma.user.findMany({
      where: { onlineStatus: 'online' },
      select: {
        id: true,
        displayName: true,
        onlineStatus: true
      }
    });
    
    console.log(`   - Online users: ${onlineUsers.length}`);
    onlineUsers.forEach(user => {
      console.log(`     * ${user.displayName}`);
    });

    // Test 4: Get conversations with participant statuses
    console.log('\n4. Getting conversations with participant statuses:');
    const conversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        deletedAt: null
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                onlineStatus: true,
                lastSeenAt: true
              }
            }
          }
        }
      },
      take: 3
    });

    conversations.forEach(conv => {
      console.log(`   - Conversation: ${conv.name || 'Direct Message'}`);
      conv.participants.forEach(p => {
        console.log(`     * ${p.user.displayName}: ${p.user.onlineStatus} (Last seen: ${p.user.lastSeenAt || 'Never'})`);
      });
    });

    console.log('\n✅ User Status System Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUserStatus();
