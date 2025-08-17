const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { status: 'pending' },
      include: {
        tenant: true,
        invitedBy: true
      }
    });
    console.log('Pending invitations:', JSON.stringify(invitations, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
