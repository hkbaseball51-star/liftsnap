export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'ABS'

export type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'CABLE'
  | 'BODYWEIGHT'
  | 'OTHER'

export type SupplementCategory =
  | 'PRE_WORKOUT'
  | 'PROTEIN'
  | 'CREATINE'
  | 'EAA'
  | 'OTHER'

export type UserPlan = 'free' | 'pro'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          username: string | null
          avatar_url: string | null
          plan: UserPlan
          stripe_customer_id: string | null
          weight_unit: 'kg' | 'lbs'
          goal: 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general' | null
          experience: 'beginner' | 'intermediate' | 'advanced' | null
          workout_frequency: number | null
          onboarding_completed: boolean
          language: 'auto' | 'en' | 'ja'
          email_opt_in: boolean
          email_opt_in_at: string | null
          acquisition_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          plan?: UserPlan
          stripe_customer_id?: string | null
          weight_unit?: 'kg' | 'lbs'
          goal?: 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general' | null
          experience?: 'beginner' | 'intermediate' | 'advanced' | null
          workout_frequency?: number | null
          onboarding_completed?: boolean
          language?: 'auto' | 'en' | 'ja'
          email_opt_in?: boolean
          email_opt_in_at?: string | null
          acquisition_source?: string | null
        }
        Update: {
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          plan?: UserPlan
          stripe_customer_id?: string | null
          weight_unit?: 'kg' | 'lbs'
          goal?: 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general' | null
          experience?: 'beginner' | 'intermediate' | 'advanced' | null
          workout_frequency?: number | null
          onboarding_completed?: boolean
          language?: 'auto' | 'en' | 'ja'
          email_opt_in?: boolean
          email_opt_in_at?: string | null
          acquisition_source?: string | null
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          user_id: string | null
          name: string
          muscle_group: MuscleGroup
          equipment: Equipment | null
          is_custom: boolean
          created_at: string
        }
        Insert: {
          user_id?: string | null
          name: string
          muscle_group: MuscleGroup
          equipment?: Equipment | null
          is_custom?: boolean
        }
        Update: {
          name?: string
          muscle_group?: MuscleGroup
          equipment?: Equipment | null
        }
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          total_volume_kg: number | null
          duration_seconds: number | null
          body_weight_kg: number | null
          trained_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          title?: string | null
          total_volume_kg?: number | null
          duration_seconds?: number | null
          body_weight_kg?: number | null
          trained_at?: string
          completed_at?: string | null
        }
        Update: {
          title?: string | null
          total_volume_kg?: number | null
          duration_seconds?: number | null
          body_weight_kg?: number | null
          completed_at?: string | null
        }
      }
      workout_sets: {
        Row: {
          id: string
          session_id: string
          exercise_id: string | null
          exercise_name: string
          muscle_group: MuscleGroup | null
          set_number: number
          weight_kg: number | null
          reps: number | null
          is_completed: boolean
          created_at: string
        }
        Insert: {
          session_id: string
          exercise_id?: string | null
          exercise_name: string
          muscle_group?: MuscleGroup | null
          set_number: number
          weight_kg?: number | null
          reps?: number | null
          is_completed?: boolean
        }
        Update: {
          weight_kg?: number | null
          reps?: number | null
          is_completed?: boolean
        }
      }
      workout_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          exercises: TemplateExercise[]
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          exercises?: TemplateExercise[]
        }
        Update: {
          name?: string
          exercises?: TemplateExercise[]
          updated_at?: string
        }
      }
      body_weights: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          recorded_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          weight_kg: number
          recorded_at?: string
        }
        Update: {
          weight_kg?: number
        }
      }
      body_photos: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          weight_kg: number | null
          notes: string | null
          taken_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          photo_url: string
          weight_kg?: number | null
          notes?: string | null
          taken_at?: string
        }
        Update: {
          notes?: string | null
        }
      }
      supplement_stacks: {
        Row: {
          id: string
          user_id: string
          category: SupplementCategory
          product_name: string
          brand: string | null
          affiliate_url: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          category: SupplementCategory
          product_name: string
          brand?: string | null
          affiliate_url?: string | null
        }
        Update: {
          product_name?: string
          brand?: string | null
          affiliate_url?: string | null
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_key: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          badge_key: string
        }
        Update: never
      }
    }
  }
}

export interface TemplateExercise {
  exercise_id: string | null
  exercise_name: string
  muscle_group: MuscleGroup
  default_sets: number
  default_reps: number
  default_weight_kg: number
}
