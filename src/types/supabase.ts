
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"church_warmth": {
                  Row: {
                    "church_id": string,"created_at": string,"prayer_id": string,"seconds": number
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"created_at"?: string,"prayer_id": string,"seconds": number
                  }
                  Update: {
                    "church_id"?: string,"created_at"?: string,"prayer_id"?: string,"seconds"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "church_warmth_church_id_fkey"
      columns: ["church_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "church_warmth_prayer_id_fkey"
      columns: ["prayer_id"]
isOneToOne: false
      referencedRelation: "prayers"
      referencedColumns: ["id"]
    }
                  ]
                },"churches": {
                  Row: {
                    "created_at": string | null,"created_by": string | null,"id": string,"invite_code": string,"lat": number | null,"lng": number | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"lat"?: number | null,"lng"?: number | null,"name": string
                  }
                  Update: {
                    "created_at"?: string | null,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"lat"?: number | null,"lng"?: number | null,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "churches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"invite_codes": {
                  Row: {
                    "code": string,"created_at": string | null,"id": string,"is_active": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string | null,"id"?: string,"is_active"?: boolean | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string | null,"id"?: string,"is_active"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"prayer_topics": {
                  Row: {
                    "created_at": string | null,"id": string,"is_public": boolean | null,"is_representative": boolean | null,"prayer_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"is_public"?: boolean | null,"is_representative"?: boolean | null,"prayer_id"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"is_public"?: boolean | null,"is_representative"?: boolean | null,"prayer_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prayer_topics_prayer_id_fkey"
      columns: ["prayer_id"]
isOneToOne: false
      referencedRelation: "prayers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prayer_topics_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"prayers": {
                  Row: {
                    "church_id": string | null,"duration_seconds": number | null,"id": string,"lat": number,"lng": number,"prayed_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id"?: string | null,"duration_seconds"?: number | null,"id"?: string,"lat": number,"lng": number,"prayed_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "church_id"?: string | null,"duration_seconds"?: number | null,"id"?: string,"lat"?: number,"lng"?: number,"prayed_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prayers_church_id_fkey"
      columns: ["church_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prayers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "church_id": string | null,"country": string | null,"created_at": string | null,"id": string,"nickname": string
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id"?: string | null,"country"?: string | null,"created_at"?: string | null,"id": string,"nickname"?: string
                  }
                  Update: {
                    "church_id"?: string | null,"country"?: string | null,"created_at"?: string | null,"id"?: string,"nickname"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "users_church_id_fkey"
      columns: ["church_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "church_level_for":
{ Args: { "p_seconds": number }; Returns: number
                           },
"church_total_seconds":
{ Args: { "p_church_id": string }; Returns: number
                           },
"create_church":
{ Args: { "p_lat": number,"p_lng": number,"p_name": string }; Returns: string
                           },
"distance_km":
{ Args: { "lat1": number,"lat2": number,"lng1": number,"lng2": number }; Returns: number
                           },
"find_similar_churches":
{ Args: { "p_lat": number,"p_lng": number,"p_name": string,"p_radius_km"?: number }; Returns: {
              "distance_km": number,"id": string,"name": string
            }[]
                           },
"get_my_church":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_prayer_contribution":
{ Args: { "p_prayer_id": string }; Returns: Json
                           },
"get_prayer_stats":
{ Args: { "p_period"?: string,"p_user_id": string }; Returns: Json
                           } |
{ Args: { "p_period"?: string,"p_timezone"?: string,"p_user_id": string }; Returns: Json
                           },
"search_churches":
{ Args: { "p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_query"?: string }; Returns: {
              "distance_km": number,"id": string,"lat": number,"level": number,"lng": number,"name": string
            }[]
                           },
"set_my_church":
{ Args: { "p_church_id": string }; Returns: undefined
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
