import { searchProviders } from '../npi'

const person = (over: Record<string, unknown> = {}) => ({
  number: '1477519411',
  enumeration_type: 'NPI-1',
  basic: { first_name: 'ALLAN', last_name: 'FISHER', credential: 'MD' },
  other_names: [],
  addresses: [
    { address_purpose: 'MAILING', address_1: 'PO BOX 1', city: 'NEWARK', state: 'NJ', postal_code: '071011234' },
    { address_purpose: 'LOCATION', address_1: '95 MADISON AVE', city: 'MORRISTOWN', state: 'NJ', postal_code: '079601234', telephone_number: '973-971-7185' },
  ],
  practiceLocations: [{ address_purpose: 'LOCATION', address_1: '11 OVERLOOK RD', city: 'SUMMIT', state: 'NJ', postal_code: '079011234' }],
  taxonomies: [{ desc: 'Obstetrics & Gynecology, Maternal & Fetal Medicine', primary: true }],
  ...over,
})

const hospital = {
  number: '1000000001',
  enumeration_type: 'NPI-2',
  basic: { organization_name: 'AHS HOSPITAL CORP' },
  other_names: [{ type: 'Doing Business As', organization_name: 'MORRISTOWN MEDICAL CENTER' }],
  addresses: [{ address_purpose: 'LOCATION', address_1: '100 MADISON AVE', city: 'MORRISTOWN', state: 'NJ', postal_code: '079601234' }],
  taxonomies: [{ desc: 'General Acute Care Hospital', primary: true }],
}

let lastUrl = ''
const respond = (body: unknown) => {
  global.fetch = jest.fn(async (url: string) => {
    lastUrl = url
    return { json: async () => body } as Response
  }) as typeof fetch
}
const params = () => new URL(lastUrl, 'http://x').searchParams

describe('searchProviders', () => {
  test('full name with Dr. prefix splits into first and last', async () => {
    respond({ results: [person()] })
    await searchProviders({ role: 'OB', state: 'NJ', name: 'Dr. Allan Fisher' })
    expect(params().get('first_name')).toBe('Allan*')
    expect(params().get('last_name')).toBe('Fisher*')
    expect(params().has('taxonomy_description')).toBe(false)
  })

  test('credentials after a comma are ignored', async () => {
    respond({ results: [] })
    await searchProviders({ role: 'OB', state: 'NJ', name: 'Adu-Amankwa, MD, FACOG' })
    expect(params().get('last_name')).toBe('Adu-Amankwa*')
    expect(params().has('first_name')).toBe(false)
  })

  test('single characters are not wildcarded', async () => {
    respond({ results: [] })
    await searchProviders({ role: 'OB', state: 'NJ', name: 'F' })
    expect(params().get('last_name')).toBe('F')
  })

  test('hospitals search by organization name', async () => {
    respond({ results: [hospital] })
    const [r] = await searchProviders({ role: 'Labor Hospital', state: 'NJ', name: 'Morristown Medical' })
    expect(params().get('organization_name')).toBe('Morristown Medical*')
    expect(r.name).toBe('Morristown Medical Center')
    expect(r.practice).toBe('Ahs Hospital Corp')
  })

  test('browsing without a name uses the registry specialty filter', async () => {
    respond({ results: [] })
    await searchProviders({ role: 'MFM', state: 'NJ', city: 'Morristown' })
    expect(params().get('taxonomy_description')).toBe('Maternal & Fetal Medicine')
    expect(params().get('city')).toBe('Morristown')
  })

  test('maps a person to a provider with the location address', async () => {
    respond({ results: [person()] })
    const [r] = await searchProviders({ role: 'OB', state: 'NJ', name: 'Fisher' })
    expect(r).toMatchObject({
      role: 'OB',
      name: 'Dr. Allan Fisher, MD',
      npi: '1477519411',
      phone: '973-971-7185',
      address: '95 Madison Ave, Morristown, NJ 07960',
      specialty: 'Obstetrics & Gynecology, Maternal & Fetal Medicine',
    })
  })

  test('prefers the practice location in the searched city', async () => {
    respond({ results: [person()] })
    const [r] = await searchProviders({ role: 'OB', state: 'NJ', city: 'summit', name: 'Fisher' })
    expect(r.address).toBe('11 Overlook Rd, Summit, NJ 07901')
  })

  test('only physicians get the Dr. prefix', async () => {
    respond({ results: [person({ basic: { first_name: 'CHRISTINA', last_name: 'BONANNI', credential: 'APN' } })] })
    const [r] = await searchProviders({ role: 'OB', state: 'NJ', name: 'Bonanni' })
    expect(r.name).toBe('Christina Bonanni, APN')
  })

  test('filters to the role specialty but falls back to everything', async () => {
    const pt = person({ number: '2', basic: { first_name: 'A', last_name: 'B' }, taxonomies: [{ desc: 'Physical Therapist', primary: true }] })
    respond({ results: [person(), pt] })
    expect(await searchProviders({ role: 'OB', state: 'NJ', name: 'x' })).toHaveLength(1)
    respond({ results: [pt] })
    expect(await searchProviders({ role: 'OB', state: 'NJ', name: 'x' })).toHaveLength(1)
  })

  test('deduplicates the same name at the same address', async () => {
    respond({ results: [hospital, { ...hospital, number: '1000000002' }] })
    expect(await searchProviders({ role: 'Labor Hospital', state: 'NJ', name: 'Morristown' })).toHaveLength(1)
  })

  test('surfaces registry errors', async () => {
    respond({ Errors: [{ description: 'Wildcards require at least two leading characters' }] })
    await expect(searchProviders({ role: 'OB', state: 'NJ', name: 'x' })).rejects.toThrow('Wildcards require')
  })
})
