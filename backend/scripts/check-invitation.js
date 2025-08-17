const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const inviteToken = 'ca03069d6b5571d3c72ab2be5504652f49788c5e7839bed46bf6684b1367db41';

async function main() {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      include: {
        tenant: true,
        invitedBy: true
      }
    });
    console.log('Invitation:', JSON.stringify(invitation, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
