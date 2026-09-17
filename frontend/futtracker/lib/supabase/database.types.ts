export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      career_entries: {
        Row: {
          category: string | null
          club_name: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          player_id: string
          position: string | null
          start_date: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          club_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          player_id: string
          position?: string | null
          start_date: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          club_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          player_id?: string
          position?: string | null
          start_date?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stats: {
        Row: {
          assists: number
          career_entry_id: string
          clean_sheet: boolean
          competition: string | null
          created_at: string
          goals: number
          id: string
          match_date: string
          minutes_played: number
          opponent: string
          player_id: string
          red_cards: number
          started: boolean
          updated_at: string
          yellow_cards: number
        }
        Insert: {
          assists?: number
          career_entry_id: string
          clean_sheet?: boolean
          competition?: string | null
          created_at?: string
          goals?: number
          id?: string
          match_date: string
          minutes_played?: number
          opponent: string
          player_id: string
          red_cards?: number
          started?: boolean
          updated_at?: string
          yellow_cards?: number
        }
        Update: {
          assists?: number
          career_entry_id?: string
          clean_sheet?: boolean
          competition?: string | null
          created_at?: string
          goals?: number
          id?: string
          match_date?: string
          minutes_played?: number
          opponent?: string
          player_id?: string
          red_cards?: number
          started?: boolean
          updated_at?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_career_entry_id_fkey"
            columns: ["career_entry_id"]
            isOneToOne: false
            referencedRelation: "career_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          height_cm: number | null
          id: string
          is_seeking_team: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          position: string | null
          preferred_foot: string | null
          province: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          height_cm?: number | null
          id: string
          is_seeking_team?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          position?: string | null
          preferred_foot?: string | null
          province?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_seeking_team?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          position?: string | null
          preferred_foot?: string | null
          province?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name: string
          id: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          bio: string | null
          category: string | null
          city: string | null
          club_name: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          crest_path: string | null
          founded_year: number | null
          id: string
          latitude: number | null
          league: string | null
          longitude: number | null
          name: string
          owner_id: string
          province: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          category?: string | null
          city?: string | null
          club_name?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          crest_path?: string | null
          founded_year?: number | null
          id?: string
          latitude?: number | null
          league?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          province?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          category?: string | null
          city?: string | null
          club_name?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          crest_path?: string | null
          founded_year?: number | null
          id?: string
          latitude?: number | null
          league?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_career_totals: {
        Row: {
          clubs_count: number | null
          goals_per_match: number | null
          player_id: string | null
          seasons_count: number | null
          total_assists: number | null
          total_clean_sheets: number | null
          total_goals: number | null
          total_matches: number | null
          total_minutes: number | null
          total_red: number | null
          total_yellow: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      season_stats: {
        Row: {
          assists: number | null
          career_entry_id: string | null
          clean_sheets: number | null
          goals: number | null
          matches_played: number | null
          matches_started: number | null
          minutes_played: number | null
          player_id: string | null
          red_cards: number | null
          season_year: number | null
          yellow_cards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_career_entry_id_fkey"
            columns: ["career_entry_id"]
            isOneToOne: false
            referencedRelation: "career_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_team_owner: { Args: { team: string }; Returns: boolean }
      safe_uuid: { Args: { value: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

