export type Business = {
  id: string; name: string; email: string
  google_review_link: string | null; phone: string | null; created_at: string
}
export type Customer = {
  id: string; business_id: string; name: string; phone: string
  appointment_time: string; reminded_24h: boolean; reminded_2h: boolean
  review_requested: boolean; created_at: string
}
export type Feedback = {
  id: string; customer_id: string; business_id: string
  rating: number; message: string | null; created_at: string
  customers?: { name: string; phone: string }
}
export type Message = {
  id: string; business_id: string; customer_id: string
  direction: 'out' | 'in'; body: string; created_at: string
  customers?: { name: string; phone: string }
}
