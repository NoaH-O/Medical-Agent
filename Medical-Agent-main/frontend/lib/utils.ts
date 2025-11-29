import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex === -1) return email
  return `***${email.slice(atIndex)}`
}
