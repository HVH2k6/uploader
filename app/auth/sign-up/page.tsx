'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
})

export default function SignUpPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (res.ok) {
        setUser(data.user)
        router.push('/dashboard')
      } else {
        setError(data.error || 'Đăng ký thất bại')
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-2">Đăng ký</h1>
      <p className="text-muted-foreground mb-6">Tạo tài khoản mới để bắt đầu sử dụng</p>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="name@example.com"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error as any]} />}
            </Field>
          )}
        />
        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Tên hiển thị</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Tên của bạn"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error as any]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Mật khẩu</FieldLabel>
              <Input
                {...field}
                type="password"
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="••••••••"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error as any]} />}
            </Field>
          )}
        />
        <Button type="submit" className="w-full mt-4" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        Đã có tài khoản?{' '}
        <Link href="/auth/sign-in" className="text-primary hover:underline">
          Đăng nhập
        </Link>
      </div>
    </div>
  )
}