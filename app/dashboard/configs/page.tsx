import { redirect } from 'next/navigation'

export default function ConfigsRedirectPage() {
  redirect('/dashboard/settings')
}
