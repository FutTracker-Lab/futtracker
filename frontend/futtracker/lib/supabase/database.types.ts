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
      api_error_log: {
        Row: {
          created_at: string
          id: number
          method: string
          route: string
          status: number
        }
        Insert: {
          created_at?: string
          id?: never
          method: string
          route: string
          status: number
        }
        Update: {
          created_at?: string
          id?: never
          method?: string
          route?: string
          status?: number
        }
        Relationships: []
      }
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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_report_runs: {
        Row: {
          attempts: number
          created_at: string
          env: string
          fallbacks: string[]
          kpi_date: string
          payload: Json
          response_status: number | null
          run_id: string
        }
        Insert: {
          attempts: number
          created_at?: string
          env: string
          fallbacks?: string[]
          kpi_date: string
          payload: Json
          response_status?: number | null
          run_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          env?: string
          fallbacks?: string[]
          kpi_date?: string
          payload?: Json
          response_status?: number | null
          run_id?: string
        }
        Relationships: []
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
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_highlights: {
        Row: {
          created_at: string
          id: string
          player_id: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_highlights_player_id_fkey"
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
          zone_id: string | null
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
          zone_id?: string | null
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
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
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
      team_follows: {
        Row: {
          created_at: string
          follower_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "team_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_follows_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          zone_id: string | null
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
          zone_id?: string | null
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
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          modality: string
          position: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: string
          modality: string
          position: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          modality?: string
          position?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_applications: {
        Row: {
          created_at: string
          id: string
          player_id: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_applications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          province: string
        }
        Insert: {
          id: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          province: string
        }
        Update: {
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          province?: string
        }
        Relationships: []
      }
    }
    Views: {
      conversation_summaries: {
        Row: {
          created_at: string | null
          id: string | null
          last_message_at: string | null
          last_message_body: string | null
          last_message_created_at: string | null
          last_message_sender_id: string | null
          other_avatar_path: string | null
          other_full_name: string | null
          other_id: string | null
          other_role: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "conversation_summaries"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_kpi_reporter: { Args: never; Returns: boolean }
      is_team_owner: { Args: { team: string }; Returns: boolean }
      kpi_daily_counts: {
        Args: { p_date: string }
        Returns: {
          complete_profiles: number
          contacts_started: number
          contacts_successful: number
          errors_5xx: number
          players_following: number
          players_registered: number
        }[]
      }
      log_api_error: {
        Args: { p_method: string; p_route: string; p_status: number }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      safe_uuid: { Args: { value: string }; Returns: string }
      search_players: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_position?: string
          p_radius_km: number
          p_seeking_only?: boolean
        }
        Returns: {
          age: number
          avatar_path: string
          city: string
          distance_km: number
          full_name: string
          is_seeking_team: boolean
          matches_played: number
          player_id: string
          position: string
          province: string
          total_count: number
        }[]
      }
      suggest_teams: {
        Args: { p_limit?: number; p_offset?: number; p_radius_km?: number }
        Returns: {
          applied: boolean
          category: string
          city: string
          crest_path: string
          description: string
          distance_km: number
          level: string
          modality: string
          position: string
          province: string
          team_id: string
          team_name: string
          total_count: number
          vacancy_id: string
        }[]
      }
      team_follower_count: { Args: { p_team_id: string }; Returns: number }
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

