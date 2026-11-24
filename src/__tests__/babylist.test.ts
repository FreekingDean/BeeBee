import { babylist, categoryFor } from '../server/adapters/babylist'

const item = (over: Record<string, unknown>) => ({
  id: 1,
  brand: 'Medela',
  name: 'Medela Pump In Style',
  heroUrl: 'https://www.babylist.com/gp/x/1/1',
  pricing: { current: 199 },
  images: { thumbnailUrl: 'https://img/1.png' },
  onSale: false,
  productBadge: null,
  ...over,
})

describe('categoryFor', () => {
  test('maps common phrases to category slugs', () => {
    expect(categoryFor('best breast pump')).toBe('breast-pumps')
    expect(categoryFor('Spectra S1 pump')).toBe('breast-pumps')
    expect(categoryFor('infant car seat')).toBe('car-seats')
    expect(categoryFor('carseat')).toBe('car-seats')
    expect(categoryFor('diaper bag')).toBe('diaper-bags')
    expect(categoryFor('newborn diapers')).toBe('diapers')
  })
  test('slugifies unknown queries', () => {
    expect(categoryFor('Humidifiers & air')).toBe('humidifiers-air')
  })
})

describe('babylist.search', () => {
  test('fetches the category and ranks matches for the query first', async () => {
    const products = [item({ id: 1 }), item({ id: 2, brand: 'Spectra', name: 'Spectra S1 Plus', onSale: true, productBadge: { title: 'Babylist Pick' } })]
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ products }) })) as unknown as typeof fetch
    const r = await babylist.search('spectra s1 pump')
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://www.babylist.com/store/api/categories/breast-pumps/products?limit=48&offset=0')
    expect(r[0]).toEqual({
      source: 'babylist',
      name: 'Spectra S1 Plus',
      price: 199,
      url: 'https://www.babylist.com/gp/x/1/1',
      image: 'https://img/1.png',
      summary: 'Spectra · Babylist Pick · on sale',
    })
    expect(r[1].name).toBe('Medela Pump In Style')
    expect(r[0]).not.toHaveProperty('score')
  })

  test('names the missing category on a 404', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch
    await expect(babylist.search('humidifier')).rejects.toThrow('Babylist has no category "humidifier" (404)')
  })
})
