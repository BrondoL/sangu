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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          has_credit_card: boolean
          id: string
          is_active: boolean
          is_proxy: boolean
          is_salary_receiver: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          has_credit_card?: boolean
          id?: string
          is_active?: boolean
          is_proxy?: boolean
          is_salary_receiver?: boolean
          name: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          has_credit_card?: boolean
          id?: string
          is_active?: boolean
          is_proxy?: boolean
          is_salary_receiver?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      budget_months: {
        Row: {
          amount: number
          month: string
          recurring_expense_id: string
          user_id: string
        }
        Insert: {
          amount: number
          month: string
          recurring_expense_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          month?: string
          recurring_expense_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_months_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          account_id: string
          id: string
          monthly_amount: number
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          start_month: string
          tenor_months: number
          user_id: string
        }
        Insert: {
          account_id: string
          id?: string
          monthly_amount?: number
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          start_month: string
          tenor_months: number
          user_id?: string
        }
        Update: {
          account_id?: string
          id?: string
          monthly_amount?: number
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          start_month?: string
          tenor_months?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_balances: {
        Row: {
          account_id: string
          balance: number
          period_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          balance?: number
          period_id: string
          user_id?: string
        }
        Update: {
          account_id?: string
          balance?: number
          period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_balances_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "monthly_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_items: {
        Row: {
          account_id: string
          amount: number
          category: Database["public"]["Enums"]["category"]
          id: string
          is_paid: boolean
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          period_id: string
          source_id: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount?: number
          category: Database["public"]["Enums"]["category"]
          id?: string
          is_paid?: boolean
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_id: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: Database["public"]["Enums"]["category"]
          id?: string
          is_paid?: boolean
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_id?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "monthly_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_periods: {
        Row: {
          actual_salary: number | null
          id: string
          month: string
          note: string | null
          user_id: string
        }
        Insert: {
          actual_salary?: number | null
          id?: string
          month: string
          note?: string | null
          user_id?: string
        }
        Update: {
          actual_salary?: number | null
          id?: string
          month?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          account_id: string
          default_amount: number
          id: string
          is_active: boolean
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          user_id: string
        }
        Insert: {
          account_id: string
          default_amount?: number
          id?: string
          is_active?: boolean
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          user_id?: string
        }
        Update: {
          account_id?: string
          default_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          account_id: string
          id: string
          is_active: boolean
          monthly_amount: number
          name: string
          target_amount: number | null
          target_date: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          id?: string
          is_active?: boolean
          monthly_amount?: number
          name: string
          target_amount?: number | null
          target_date?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number
          name?: string
          target_amount?: number | null
          target_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          base_salary: number
          user_id: string
        }
        Insert: {
          base_salary?: number
          user_id?: string
        }
        Update: {
          base_salary?: number
          user_id?: string
        }
        Relationships: []
      }
      spending: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          occurred_on: string
          recurring_expense_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on: string
          recurring_expense_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          recurring_expense_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_budgets: {
        Row: {
          recurring_expense_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          recurring_expense_id: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          recurring_expense_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_budgets_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category: "expense" | "installment" | "saving" | "card_bill"
      payment_method: "debit" | "credit"
      source_type: "recurring" | "installment" | "saving"
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
  public: {
    Enums: {
      category: ["expense", "installment", "saving", "card_bill"],
      payment_method: ["debit", "credit"],
      source_type: ["recurring", "installment", "saving"],
    },
  },
} as const
