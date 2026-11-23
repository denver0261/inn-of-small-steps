
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "chores": {
                  Row: {
                    "assignee": string | null,"created_at": string,"created_on": string,"household_id": string,"id": string,"last_done_by": string | null,"last_done_on": string | null,"repeat_every_days": number | null,"repeat_kind": string | null,"repeat_weekdays": (number)[] | null,"room_id": string,"size": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee"?: string | null,"created_at"?: string,"created_on": string,"household_id"?: string,"id"?: string,"last_done_by"?: string | null,"last_done_on"?: string | null,"repeat_every_days"?: number | null,"repeat_kind"?: string | null,"repeat_weekdays"?: (number)[] | null,"room_id": string,"size": string,"title": string
                  }
                  Update: {
                    "assignee"?: string | null,"created_at"?: string,"created_on"?: string,"household_id"?: string,"id"?: string,"last_done_by"?: string | null,"last_done_on"?: string | null,"repeat_every_days"?: number | null,"repeat_kind"?: string | null,"repeat_weekdays"?: (number)[] | null,"room_id"?: string,"size"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chores_assignee_fkey"
      columns: ["assignee"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_last_done_by_fkey"
      columns: ["last_done_by"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_room_id_household_id_fkey"
      columns: ["room_id","household_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","household_id"]
    }
                  ]
                },"day_closes": {
                  Row: {
                    "closed_at": string,"date": string,"player_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string,"date": string,"player_id": string
                  }
                  Update: {
                    "closed_at"?: string,"date"?: string,"player_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "day_closes_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "created_at": string,"days": (number)[] | null,"end_date": string | null,"habit_id": string,"id": string,"period": string,"prescribed": boolean,"start_date": string,"target": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"days"?: (number)[] | null,"end_date"?: string | null,"habit_id": string,"id"?: string,"period": string,"prescribed"?: boolean,"start_date": string,"target": number
                  }
                  Update: {
                    "created_at"?: string,"days"?: (number)[] | null,"end_date"?: string | null,"habit_id"?: string,"id"?: string,"period"?: string,"prescribed"?: boolean,"start_date"?: string,"target"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_logs": {
                  Row: {
                    "chore_id": string | null,"created_at": string,"date": string,"habit_id": string,"health_workout_id": string | null,"id": string,"kind": string,"performed_on": string | null,"player_id": string,"source": string,"tier": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chore_id"?: string | null,"created_at"?: string,"date": string,"habit_id": string,"health_workout_id"?: string | null,"id"?: string,"kind": string,"performed_on"?: string | null,"player_id"?: string,"source": string,"tier"?: string | null
                  }
                  Update: {
                    "chore_id"?: string | null,"created_at"?: string,"date"?: string,"habit_id"?: string,"health_workout_id"?: string | null,"id"?: string,"kind"?: string,"performed_on"?: string | null,"player_id"?: string,"source"?: string,"tier"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_logs_chore_id_fkey"
      columns: ["chore_id"]
isOneToOne: false
      referencedRelation: "chores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_logs_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_logs_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "allow_tap": boolean,"archived_on": string | null,"created_at": string,"domain": string,"health_type": string | null,"id": string,"name": string,"player_id": string,"tier": string,"tiny_version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_tap"?: boolean,"archived_on"?: string | null,"created_at"?: string,"domain": string,"health_type"?: string | null,"id"?: string,"name": string,"player_id"?: string,"tier": string,"tiny_version": string
                  }
                  Update: {
                    "allow_tap"?: boolean,"archived_on"?: string | null,"created_at"?: string,"domain"?: string,"health_type"?: string | null,"id"?: string,"name"?: string,"player_id"?: string,"tier"?: string,"tiny_version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"health_workouts": {
                  Row: {
                    "distance_km": number | null,"duration_min": number,"end_at": string,"from_garmin": boolean,"id": string,"player_id": string,"start_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "distance_km"?: number | null,"duration_min": number,"end_at": string,"from_garmin": boolean,"id": string,"player_id"?: string,"start_at": string,"type": string
                  }
                  Update: {
                    "distance_km"?: number | null,"duration_min"?: number,"end_at"?: string,"from_garmin"?: boolean,"id"?: string,"player_id"?: string,"start_at"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "health_workouts_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"household_invites": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string,"expires_at": string,"household_id": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by": string,"expires_at": string,"household_id": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"household_id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "household_invites_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "household_invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pauses": {
                  Row: {
                    "end_date": string,"habit_ids": (string)[] | null,"id": string,"player_id": string,"reason": string | null,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "end_date": string,"habit_ids"?: (string)[] | null,"id"?: string,"player_id"?: string,"reason"?: string | null,"start_date": string
                  }
                  Update: {
                    "end_date"?: string,"habit_ids"?: (string)[] | null,"id"?: string,"player_id"?: string,"reason"?: string | null,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pauses_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "class_path_id": string | null,"created_at": string,"display_name": string,"household_id": string | null,"id": string,"sleep_time": string,"started_on": string,"time_zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_path_id"?: string | null,"created_at"?: string,"display_name": string,"household_id"?: string | null,"id": string,"sleep_time"?: string,"started_on": string,"time_zone": string
                  }
                  Update: {
                    "class_path_id"?: string | null,"created_at"?: string,"display_name"?: string,"household_id"?: string | null,"id"?: string,"sleep_time"?: string,"started_on"?: string,"time_zone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "household_id": string,"id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "household_id"?: string,"id"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "household_id"?: string,"id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "invite_code": string }; Returns: string
                           },
"can_see_player":
{ Args: { "p": string }; Returns: boolean
                           },
"create_household":
{ Args: { "house_name": string }; Returns: string
                           },
"create_invite":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"day_is_open":
{ Args: { "d": string,"p": string }; Returns: boolean
                           },
"my_household":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
