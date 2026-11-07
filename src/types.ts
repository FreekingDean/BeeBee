export type ProviderRole =
  | 'OB'
  | 'GYN'
  | 'MFM'
  | 'Genetic Counselor'
  | 'Labor Hospital'
  | 'Practice'
  | 'Pediatrician'
  | 'Doula'
  | 'Other'

export type Provider = {
  id: string
  role: ProviderRole
  name: string
  practice?: string
  phone?: string
  url?: string
  address?: string
  notes?: string
  npi?: string
  specialty?: string
}

export type Appointment = {
  id: string
  title: string
  date: string
  time?: string
  providerId?: string
  notes?: string
  gcalId?: string
}

export type TaskCategory = 'medical' | 'admin' | 'home' | 'learn' | 'pediatric'

export type Person = 'birth' | 'partner'

export type Owner = Person | 'both'

export type Task = {
  id: string
  title: string
  category: TaskCategory
  owner: Owner
  startWeek: number
  endWeek: number
  done: boolean
  notes?: string
}

export type Finding = {
  id: string
  date: string
  title: string
  detail?: string
  private?: boolean
}

export type ShoppingCategory =
  | 'nursery'
  | 'feeding'
  | 'diapering'
  | 'clothing'
  | 'gear'
  | 'bath & health'
  | 'hospital bag'
  | 'for mom'
  | 'other'

export type ShoppingItem = {
  id: string
  item: string
  category: ShoppingCategory
  buyByWeek: number
  bought: boolean
  url?: string
}

export type Purchase = {
  id: string
  item: string
  cost: number
  date: string
  store?: string
}

export type ResourceType = 'book' | 'podcast' | 'site'

export type Resource = {
  id: string
  type: ResourceType
  title: string
  author?: string
  url?: string
  fromWeek: number
  done: boolean
}

export type Question = {
  id: string
  text: string
  answer?: string
}

export type Action =
  | { type: 'add_task'; title: string; category: TaskCategory; startWeek: number; endWeek: number; owner: Owner }
  | { type: 'add_shopping'; item: string; category: ShoppingCategory; buyByWeek: number; url?: string }
  | { type: 'add_appointment'; title: string; date: string; time?: string }
  | { type: 'add_provider'; role: ProviderRole; name: string; practice?: string; phone?: string; address?: string; npi?: string }
  | { type: 'complete_task'; id: string }

export type ToolCall = { id: string; function: { name: string; arguments: string } }

export type ChatMsg =
  | { role: 'user'; content: string; hidden?: boolean }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type State = {
  chat: ChatMsg[]
  dueDate?: string
  names: Record<Person, string>
  babyName: string
  sex: 'unknown' | 'girl' | 'boy'
  providers: Provider[]
  appointments: Appointment[]
  tasks: Task[]
  findings: Finding[]
  shopping: ShoppingItem[]
  purchases: Purchase[]
  resources: Resource[]
  pediatricQuestions: Question[]
}
