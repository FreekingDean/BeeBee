import { productSources, reviewSources } from '../../../server/sources'

export function GET() {
  return Response.json({
    reviews: reviewSources.map((s) => ({ name: s.name, configured: s.configured() })),
    products: productSources.map((s) => ({ name: s.name, configured: s.configured() })),
  })
}
