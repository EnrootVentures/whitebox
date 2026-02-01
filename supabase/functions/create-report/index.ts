import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = {
  auth: {
    verifyJWT: false,
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

type RiskCategory = {
  category_id: number;
  sub_category_id?: number | null;
};

type CreateReportPayload = {
  auth_user_id?: string | null;
  is_anonymous?: boolean;
  reporter_email?: string | null;
  reporter_password?: string | null;
  reporter_first_name?: string | null;
  reporter_last_name?: string | null;
  reporter_display_name?: string | null;
  reporter_phone?: string | null;
  reporter_location?: string | null;
  reported_org_id: number;
  title: string;
  description: string;
  country?: string | null;
  event_country?: string | null;
  incident_date?: string | null;
  incident_location?: string | null;
  is_incident_is_continuing?: boolean;
  suggested_remedy?: string | null;
  legal_steps_taken?: string | null;
  problem_addressed_before_details?: string | null;
  share_contact_with_company?: boolean;
  alert_direct_suppliers?: boolean;
  alert_indirect_suppliers?: boolean;
  original_language?: string | null;
  intake_version?: string | null;
  intake_payload?: Record<string, unknown> | null;
  risk_categories?: RiskCategory[];
  recaptcha_token?: string | null;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyRecaptcha(token: string) {
  const secret = Deno.env.get("RECAPTCHA_SECRET");
  if (!secret) return { success: true };

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    return { success: false, error: "recaptcha_failed" };
  }

  const data = await res.json();
  if (!data?.success) {
    return { success: false, error: "recaptcha_invalid", details: data };
  }

  return { success: true };
}

function generateReportCode() {
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `WB-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

async function ensureAuthUser(payload: CreateReportPayload) {
  if (payload.auth_user_id) {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("user_id, auth_user_id, email")
      .eq("auth_user_id", payload.auth_user_id)
      .maybeSingle();

    if (error) throw error;
    if (profile) {
      return {
        auth_user_id: profile.auth_user_id,
        user_id: profile.user_id,
        email: profile.email,
        password: null,
      };
    }

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
      payload.auth_user_id,
    );
    if (authError || !authData?.user) {
      throw new Error(authError?.message ?? "Auth user not found");
    }

    const shouldCreateAnon = payload.is_anonymous || !authData.user.email;
    const email =
      authData.user.email ??
      payload.reporter_email ??
      `${crypto.randomUUID()}@anon.mywhitebox.eu`;
    const userType = shouldCreateAnon ? "anonymous" : "independent";

    const { data: createdProfile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        auth_user_id: authData.user.id,
        email,
        first_name: null,
        last_name: null,
        display_name: payload.reporter_display_name ?? null,
        phone: payload.reporter_phone ?? null,
        location: payload.reporter_location ?? null,
        user_type: userType,
        anonymous_identifier: shouldCreateAnon ? crypto.randomUUID() : null,
        is_verified: !shouldCreateAnon,
        is_active: true,
      })
      .select("user_id, auth_user_id, email")
      .single();

    if (profileError || !createdProfile) {
      throw new Error(profileError?.message ?? "Failed to create user profile");
    }

    return {
      auth_user_id: createdProfile.auth_user_id,
      user_id: createdProfile.user_id,
      email: createdProfile.email,
      password: null,
    };
  }

  const shouldCreateAnon = payload.is_anonymous || !payload.reporter_email;
  const email = shouldCreateAnon
    ? payload.reporter_email ?? `${crypto.randomUUID()}@anon.mywhitebox.eu`
    : payload.reporter_email ?? "";
  const password = payload.reporter_password ?? crypto.randomUUID();

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser?.user) {
    throw new Error(authError?.message ?? "Failed to create auth user");
  }

  const userType = shouldCreateAnon ? "anonymous" : "independent";

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      auth_user_id: authUser.user.id,
      email,
      first_name: payload.reporter_first_name ?? null,
      last_name: payload.reporter_last_name ?? null,
      display_name: payload.reporter_display_name ?? null,
      phone: payload.reporter_phone ?? null,
      location: payload.reporter_location ?? null,
      user_type: userType,
      anonymous_identifier: shouldCreateAnon ? crypto.randomUUID() : null,
      is_verified: !shouldCreateAnon,
      is_active: true,
    })
    .select("user_id, auth_user_id, email")
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Failed to create user profile");
  }

  return {
    auth_user_id: profile.auth_user_id,
    user_id: profile.user_id,
    email: profile.email,
    password: shouldCreateAnon ? password : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" });
  }

  try {
    const payload = (await req.json()) as CreateReportPayload;

    if (!payload.reported_org_id || !payload.title || !payload.description) {
      return jsonResponse(400, {
        success: false,
        error: "reported_org_id, title, and description are required",
      });
    }

    if (payload.recaptcha_token) {
      const captchaResult = await verifyRecaptcha(payload.recaptcha_token);
      if (!captchaResult.success) {
        return jsonResponse(400, { success: false, error: "recaptcha_failed" });
      }
    }

    const reporter = await ensureAuthUser(payload);
    const { data: defaultStatus } = await supabase
      .from("report_statuses")
      .select("status_id")
      .eq("code", "pre_evaluation")
      .maybeSingle();

    let reportCode = generateReportCode();
    let reportInsertError: Error | null = null;
    let reportData: { report_id: number; report_code: string } | null = null;

    for (let i = 0; i < 5; i += 1) {
      const { data, error } = await supabase
        .from("reports")
        .insert({
          report_code: reportCode,
          title: payload.title,
          description: payload.description,
          reported_org_id: payload.reported_org_id,
          reporter_user_id: reporter.user_id,
          reporter_org_id: null,
          reporter_email: payload.reporter_email ?? reporter.email,
          is_anonymous: payload.is_anonymous ?? false,
          status: "pre_evaluation",
          status_id: defaultStatus?.status_id ?? null,
          share_contact_with_company: payload.share_contact_with_company ?? false,
          alert_direct_suppliers: payload.alert_direct_suppliers ?? false,
          alert_indirect_suppliers: payload.alert_indirect_suppliers ?? false,
          incident_date: payload.incident_date ?? null,
          incident_location: payload.incident_location ?? null,
          country: payload.country ?? null,
          event_country: payload.event_country ?? null,
          is_incident_is_continuing: payload.is_incident_is_continuing ?? false,
          suggested_remedy: payload.suggested_remedy ?? null,
          legal_steps_taken: payload.legal_steps_taken ?? null,
          problem_addressed_before_details: payload.problem_addressed_before_details ?? null,
          original_language: payload.original_language ?? null,
          intake_version: payload.intake_version ?? "v1",
          intake_payload: payload.intake_payload ?? null,
        })
        .select("report_id, report_code")
        .single();

      if (!error && data) {
        reportData = data;
        break;
      }

      reportInsertError = error ?? null;
      reportCode = generateReportCode();
    }

    if (!reportData) {
      throw reportInsertError ?? new Error("Failed to create report");
    }

    if (payload.risk_categories?.length) {
      const rows = payload.risk_categories.map((risk) => ({
        report_id: reportData?.report_id,
        category_id: risk.category_id,
        sub_category_id: risk.sub_category_id ?? null,
      }));
      const { error: riskError } = await supabase.from("report_risk_categories").insert(rows);
      if (riskError) throw riskError;
    }

    return jsonResponse(200, {
      success: true,
      report_id: reportData.report_id,
      report_code: reportData.report_code,
      reporter_email: reporter.email,
      reporter_password: reporter.password,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { success: false, error: message });
  }
});
