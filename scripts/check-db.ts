import { prisma } from '../src/lib/prisma';
import { verifyOtpAndLogin } from '../src/actions/auth';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB count:', users.length);
  users.forEach(u => console.log('User:', u.id, u.phone, u.email, u.role));

  console.log('Testing verifyOtpAndLogin:');
  const res = await verifyOtpAndLogin('09123456789', '12345', 'phone');
  console.log('Result:', JSON.stringify(res, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
