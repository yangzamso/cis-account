import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    lang: string
    nameKo: string
    nameRu: string
    churchId: number | null
  }
  interface Session {
    user: {
      id: string
      name: string
      role: string
      lang: string
      nameKo: string
      nameRu: string
      churchId: number | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    lang: string
    nameKo: string
    nameRu: string
    churchId: number | null
  }
}
