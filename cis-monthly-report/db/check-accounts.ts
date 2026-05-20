import { db } from './index'
import { accountItems } from './schema'

async function main() {
  const items = await db.select().from(accountItems)
  for (const item of items) {
    console.log(`[${item.code}] nameKo="${item.nameKo}" | nameRu="${item.nameRu}"`)
  }
  process.exit(0)
}
main().catch(console.error)
