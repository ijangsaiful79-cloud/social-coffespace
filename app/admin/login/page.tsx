import { notFound } from 'next/navigation'
import LoginForm from './LoginForm'

interface Props {
  searchParams: Promise<{ key?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { key } = await searchParams
  const secret = process.env.ADMIN_LOGIN_KEY

  // Tanpa key yang benar → 404, tidak ada petunjuk halaman ini ada
  if (!secret || key !== secret) {
    notFound()
  }

  return <LoginForm />
}
