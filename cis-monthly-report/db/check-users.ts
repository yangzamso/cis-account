import { db } from './index'
import { users, churches } from './schema'
import { like } from 'drizzle-orm'

async function main() {
  const [moscow] = await db.select().from(churches).where(like(churches.nameKo, '%모스크바%'))
  console.log('Moscow church:', JSON.stringify(moscow))

  const allUsers = await db.select({ id: users.id, username: users.username, churchId: users.churchId, role: users.role }).from(users)
  console.log('Users:', JSON.stringify(allUsers))

  process.exit(0)
}

main().catch(console.error)
