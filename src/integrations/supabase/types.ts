export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          account_id: string
          agent_status: string
          created_at: string
        }
        Insert: {
          account_id: string
          agent_status?: string
          created_at?: string
        }
        Update: {
          account_id?: string
          agent_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          doc_key: string
          file_name: string
          file_path: string
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          doc_key: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          doc_key?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_history: {
        Row: {
          actor_id: string | null
          actor_label: string
          application_id: string
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_statuses: {
        Row: {
          position: number
          status: string
        }
        Insert: {
          position: number
          status: string
        }
        Update: {
          position?: number
          status?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          agent_id: string
          code: string
          college_id: string | null
          course_id: string
          created_at: string
          id: string
          status: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          agent_id: string
          code?: string
          college_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          status: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          agent_id?: string
          code?: string
          college_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "applications_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "applications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "application_statuses"
            referencedColumns: ["status"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          account_id: string
          college_name: string
          created_at: string
        }
        Insert: {
          account_id: string
          college_name?: string
          created_at?: string
        }
        Update: {
          account_id?: string
          college_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          city: string
          college_id: string | null
          college_name: string
          course_name: string
          course_type: string
          created_at: string
          description: string
          duration: string
          field: string
          id: string
          intake: string
          is_active: boolean
          language_level: string
          tuition: number
        }
        Insert: {
          city: string
          college_id?: string | null
          college_name: string
          course_name: string
          course_type: string
          created_at?: string
          description?: string
          duration: string
          field: string
          id: string
          intake?: string
          is_active?: boolean
          language_level: string
          tuition?: number
        }
        Update: {
          city?: string
          college_id?: string | null
          college_name?: string
          course_name?: string
          course_type?: string
          created_at?: string
          description?: string
          duration?: string
          field?: string
          id?: string
          intake?: string
          is_active?: boolean
          language_level?: string
          tuition?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["account_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          application_id: string
          created_at: string
          due_date: string | null
          file_name: string
          file_path: string
          id: string
          sent_to_student: boolean
        }
        Insert: {
          amount?: number
          application_id: string
          created_at?: string
          due_date?: string | null
          file_name?: string
          file_path?: string
          id?: string
          sent_to_student?: boolean
        }
        Update: {
          amount?: number
          application_id?: string
          created_at?: string
          due_date?: string | null
          file_name?: string
          file_path?: string
          id?: string
          sent_to_student?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invoices_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      language_tests: {
        Row: {
          expiry_date: string | null
          file_name: string
          file_path: string
          level: string
          score: string
          test_date: string
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          level: string
          score: string
          test_date: string
          test_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          level?: string
          score?: string
          test_date?: string
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_tests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          sent_to_student: boolean
        }
        Insert: {
          application_id: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          sent_to_student?: boolean
        }
        Update: {
          application_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          sent_to_student?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_statuses: {
        Row: {
          status: string
        }
        Insert: {
          status: string
        }
        Update: {
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          application_id: string
          code: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          note: string | null
          paid_date: string
          status: string
          submitted_by: string | null
        }
        Insert: {
          amount?: number
          application_id: string
          code?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          note?: string | null
          paid_date: string
          status: string
          submitted_by?: string | null
        }
        Update: {
          amount?: number
          application_id?: string
          code?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          note?: string | null
          paid_date?: string
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "payment_statuses"
            referencedColumns: ["status"]
          },
          {
            foreignKeyName: "payments_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          firstname: string
          id: string
          lastname: string
          org: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          firstname?: string
          id: string
          lastname?: string
          org?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          firstname?: string
          id?: string
          lastname?: string
          org?: string | null
        }
        Relationships: []
      }
      study_interests: {
        Row: {
          budget: number
          city: string
          course_type: string
          duration: string
          education: string
          field: string
          goal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number
          city?: string
          course_type?: string
          duration?: string
          education?: string
          field?: string
          goal?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          city?: string
          course_type?: string
          duration?: string
          education?: string
          field?: string
          goal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_agent: { Args: { _user_id: string }; Returns: boolean }
      is_party_on: { Args: { p_application_id: string }; Returns: boolean }
      level_rank: { Args: { l: string }; Returns: number }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      post_notification: {
        Args: {
          _application_id: string
          _body: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "agent" | "college" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "agent", "college", "admin"],
    },
  },
} as const
