import { useEffect, useState } from 'react'
import type { Person } from './types'

const KEY = 'beebee:who'

export function useWho(): [Person | undefined, (p?: Person) => void] {
  const [who, setWho] = useState<Person | undefined>()
  useEffect(() => {
    const v = localStorage.getItem(KEY)
    if (v === 'birth' || v === 'partner') setWho(v)
  }, [])
  return [
    who,
    (p) => {
      if (p) localStorage.setItem(KEY, p)
      else localStorage.removeItem(KEY)
      setWho(p)
    },
  ]
}

export const other = (p: Person): Person => (p === 'birth' ? 'partner' : 'birth')

export const mine = (owner: Person | 'both', who: Person) => owner === who || owner === 'both'
