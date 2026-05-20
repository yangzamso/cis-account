import { db } from './index'
import { users } from './schema'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('cis2026!', 12)

  await db.insert(users).values({
    username: 'admin',
    passwordHash,
    nameKo: '관리자',
    nameRu: 'Администратор',
    lang: 'ko',
    role: 'admin',
    churchId: null,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing()

  console.log('Admin account created: admin / cis2026!')
  console.log('Please change the password after first login.')
}

seedAdmin().catch(console.error)
