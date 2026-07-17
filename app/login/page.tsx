'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, LogIn, Mail, Lock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().min(1, 'E-posta gereklidir').email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Parola gereklidir').min(6, 'Parola en az 6 karakter olmalıdır'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Giriş başarısız', {
          description: 'E-posta veya parola hatalı. Lütfen tekrar deneyin.',
        })
      } else {
        toast.success('Giriş başarılı', { description: 'Panel\'e yönlendiriliyorsunuz...' })
        router.push('/panel')
        router.refresh()
      }
    } catch {
      toast.error('Bir hata oluştu', { description: 'Lütfen tekrar deneyin.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-white font-bold text-xl">Gİ</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">GENÇ İHH</h1>
          <p className="text-muted-foreground text-sm mt-1">Dinamik Raporlama ve AI Analiz Sistemi</p>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Sisteme Giriş
            </CardTitle>
            <CardDescription>
              Hesabınıza giriş yapmak için e-posta ve parolanızı girin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* E-posta */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-posta Adresi
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@mail.com"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Parola */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Parola
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Giriş Yap
                  </>
                )}
              </Button>
            </form>

            {/* Test Kullanıcıları Notu */}
            <div className="mt-5 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Test Kullanıcıları:</p>
              <div className="space-y-0.5 text-xs text-muted-foreground font-mono">
                <p>admin@test.com — Admin</p>
                <p>ankara-k@test.com — İl Koord. (K)</p>
                <p>ankara-e@test.com — İl Koord. (E)</p>
                <p>marmara@test.com — Bölge Koord.</p>
                <p className="mt-1 text-primary/70">Parola: Test1234!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ATOM · Yapay Zekâ Odaklı Toplumsal Fayda Hackathonu 2026
        </p>
      </div>
    </div>
  )
}
