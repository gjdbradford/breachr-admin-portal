'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',         label: '◉ Dashboard' },
]

export default function AdminNav() {
  const path = usePathname()
  return (
    <>
      {NAV.map(n => (
        <Link key={n.href} href={n.href} className={`nav-item ${path === n.href ? 'active' : ''}`}>
          {n.label}
        </Link>
      ))}
    </>
  )
}
