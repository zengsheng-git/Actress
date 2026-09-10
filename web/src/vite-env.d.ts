/// <reference types="vite/client" />

declare module 'virtual:people-manifest' {
  import type { PersonData } from './lib/parse'
  import type { PersonMeta } from './lib/types'
  export const people: PersonMeta[]
  export function loadPerson(id: string): Promise<PersonData | null>
}

declare module 'virtual:works-index' {
  import type { FlatRow } from './lib/types'
  const rows: FlatRow[]
  export default rows
}

declare module 'virtual:person/*' {
  import type { PersonData } from './lib/parse'
  const person: PersonData
  export default person
}
