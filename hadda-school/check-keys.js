const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const pk = await prisma.setting.findUnique({ where: { key: 'paystack_public_key' } })
  console.log('Public Key in DB:', pk)
  const sk = await prisma.setting.findUnique({ where: { key: 'paystack_secret_key' } })
  console.log('Secret Key in DB:', sk)
}

main().finally(() => prisma.$disconnect())
