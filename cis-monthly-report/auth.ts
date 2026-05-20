import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, String(credentials.username)))

        if (!user) return null

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!valid) return null

        return {
          id: String(user.id),
          name: user.nameKo,
          role: user.role,
          lang: user.lang,
          nameKo: user.nameKo,
          nameRu: user.nameRu,
          churchId: user.churchId ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.lang = user.lang
        token.nameKo = user.nameKo
        token.nameRu = user.nameRu
        token.churchId = user.churchId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.lang = token.lang
      session.user.nameKo = token.nameKo
      session.user.nameRu = token.nameRu
      session.user.churchId = token.churchId
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
