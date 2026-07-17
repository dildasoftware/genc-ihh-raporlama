import { Role, GenderBranch } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      genderBranch: GenderBranch | null
      provinceId: number | null
      regionId: number | null
      unitId: number | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    genderBranch: GenderBranch | null
    provinceId: number | null
    regionId: number | null
    unitId: number | null
  }
}
