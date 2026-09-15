import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export function generateToken(): string {
  return nanoid()
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function generateCoffeeShopToken(name: string): string {
  const slug = generateSlug(name)
  const token = generateToken()
  return `${slug}-${token}`
}
