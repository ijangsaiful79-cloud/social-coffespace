export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type SessionStatus = 'active' | 'expired' | 'left'
export type InteractionType = 'say_hi' | 'view'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved'

export interface CoffeeShop {
  id: string
  name: string
  slug: string
  address: string
  latitude: number
  longitude: number
  radius_meter: number
  access_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  display_name: string
  age: number
  gender: Gender
  bio: string | null
  avatar_url: string | null
  instagram: string | null
  tiktok: string | null
  whatsapp: string | null
  chat_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CoffeeShopSession {
  id: string
  user_id: string
  coffee_shop_id: string
  joined_at: string
  last_active_at: string
  expires_at: string
  gps_verified: boolean
  status: SessionStatus
  created_at: string
}

export interface Conversation {
  id: string
  user_one_id: string
  user_two_id: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  created_at: string
  read_at: string | null
}

export interface Interaction {
  id: string
  sender_id: string
  receiver_id: string
  type: InteractionType
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  description: string | null
  status: ReportStatus
  created_at: string
  resolved_at: string | null
}

export interface Block {
  id: string
  user_id: string
  blocked_user_id: string
  created_at: string
}

// Extended types with joins
export interface ProfileWithSession extends Profile {
  session: CoffeeShopSession
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
  other_user: Profile
}

export interface CoffeeShopWithStats extends CoffeeShop {
  active_users: number
  active_sessions: number
}
