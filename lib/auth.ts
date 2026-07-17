import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Parola', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('E-posta ve parola gereklidir')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Geçersiz e-posta veya parola')
        }

        if (!user.isActive) {
          throw new Error('Bu hesap devre dışı bırakılmış')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          throw new Error('Geçersiz e-posta veya parola')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          genderBranch: user.genderBranch,
          provinceId: user.provinceId,
          regionId: user.regionId,
          unitId: user.unitId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 saat
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.genderBranch = (user as any).genderBranch
        token.provinceId = (user as any).provinceId
        token.regionId = (user as any).regionId
        token.unitId = (user as any).unitId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).genderBranch = token.genderBranch
        ;(session.user as any).provinceId = token.provinceId
        ;(session.user as any).regionId = token.regionId
        ;(session.user as any).unitId = token.unitId
      }
      return session
    },
  },
}
