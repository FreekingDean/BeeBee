import { uid } from './store'
import type { Provider, ProviderRole } from './types'

const taxonomy: Partial<Record<ProviderRole, string>> = {
  OB: 'Obstetrics & Gynecology',
  GYN: 'Obstetrics & Gynecology',
  MFM: 'Maternal & Fetal Medicine',
  'Genetic Counselor': 'Genetic Counselor',
  'Labor Hospital': 'General Acute Care Hospital',
  Pediatrician: 'Pediatrics',
}

const keyword: Partial<Record<ProviderRole, RegExp>> = {
  OB: /obstetrics|gynecology|midwife/i,
  GYN: /gynecology/i,
  MFM: /maternal/i,
  'Genetic Counselor': /genetic/i,
  'Labor Hospital': /hospital/i,
  Pediatrician: /pediatric/i,
}

export const searchableRoles = Object.keys(taxonomy) as ProviderRole[]

type NpiAddress = { address_purpose: string; address_1: string; city: string; state: string; postal_code: string; telephone_number?: string }
type NpiResult = {
  number: string
  enumeration_type: 'NPI-1' | 'NPI-2'
  basic: { first_name?: string; last_name?: string; credential?: string; organization_name?: string }
  other_names: { type?: string; organization_name?: string }[]
  addresses: NpiAddress[]
  practiceLocations?: NpiAddress[]
  taxonomies: { desc: string; primary: boolean }[]
}

const isDoctor = (cred?: string) => /\b(M\.?D|D\.?O)\b/i.test(cred ?? '')

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

const wild = (s: string) => (s.length >= 2 ? `${s}*` : s)

function nameParams(role: ProviderRole, raw: string): Record<string, string> {
  const words = raw.split(',')[0].replace(/^dr\.?\s+/i, '').replace(/\./g, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return {}
  if (role === 'Labor Hospital') return { organization_name: wild(words.join(' ')) }
  if (words.length === 1) return { last_name: wild(words[0]) }
  return { first_name: wild(words[0]), last_name: wild(words[words.length - 1]) }
}

export async function searchProviders(q: { role: ProviderRole; state: string; city?: string; name?: string }): Promise<Provider[]> {
  const byName = nameParams(q.role, q.name ?? '')
  const params = new URLSearchParams({ version: '2.1', limit: '50', state: q.state, ...byName })
  if (!Object.keys(byName).length) params.set('taxonomy_description', taxonomy[q.role] ?? '')
  if (q.city) params.set('city', q.city.trim())
  const res = await fetch(`/api/npi?${params}`)
  const data = (await res.json()) as { results?: NpiResult[]; Errors?: { description: string }[] }
  if (data.Errors?.length) throw new Error(data.Errors[0].description)
  const all = data.results ?? []
  const matching = all.filter((r) => r.taxonomies.some((t) => keyword[q.role]?.test(t.desc)))
  const seen = new Set<string>()
  return (matching.length ? matching : all).slice(0, 20).flatMap((r) => {
    const locations = [...r.addresses.filter((a) => a.address_purpose === 'LOCATION'), ...(r.practiceLocations ?? [])]
    const loc = locations.find((a) => q.city && a.city.toLowerCase() === q.city.trim().toLowerCase()) ?? locations[0] ?? r.addresses[0]
    const person = r.enumeration_type === 'NPI-1'
    const dba = r.other_names.find((o) => o.type === 'Doing Business As')?.organization_name
    const legal = titleCase(r.basic.organization_name ?? '')
    const full = titleCase(`${r.basic.first_name} ${r.basic.last_name}`)
    const name = person
      ? `${isDoctor(r.basic.credential) ? 'Dr. ' : ''}${full}${r.basic.credential ? `, ${r.basic.credential}` : ''}`
      : titleCase(dba ?? legal)
    const specialty = (r.taxonomies.find((t) => t.primary) ?? r.taxonomies[0])?.desc
    const key = `${name}|${loc?.address_1}`
    if (seen.has(key)) return []
    seen.add(key)
    return [
      {
        id: uid(),
        role: q.role,
        name,
        practice: dba ? legal : undefined,
        specialty,
        npi: r.number,
        phone: loc?.telephone_number,
        address: loc && `${titleCase(loc.address_1)}, ${titleCase(loc.city)}, ${loc.state} ${loc.postal_code.slice(0, 5)}`,
        url: `https://npiregistry.cms.hhs.gov/provider-view/${r.number}`,
      },
    ]
  })
}
