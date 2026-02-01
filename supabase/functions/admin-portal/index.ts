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

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const adminClient = createClient(supabaseUrl, serviceRoleKey);

type AdminActionPayload = {
  action: string;
  payload?: Record<string, unknown>;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(authHeader: string) {
  if (!anonKey) {
    throw new Error("SUPABASE_ANON_KEY is missing for admin auth.");
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }
  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("user_type")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.user_type !== "administrator") {
    throw new Error("Forbidden");
  }
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const adminUser = await requireAdmin(authHeader);

    const { action, payload } = (await req.json()) as AdminActionPayload;

    switch (action) {
      case "dashboard": {
        const { data: statusRows } = await adminClient
          .from("report_statuses")
          .select("status_id,code")
          .in("code", ["pre_evaluation", "investigation", "remediation", "archived"]);
        const statusMap = new Map((statusRows ?? []).map((row) => [row.code, row.status_id]));
        const [
          { count: totalReports },
          { count: spamReports },
          { count: archivedReports },
          { count: waitingFilter },
          { count: investigating },
          { count: remediation },
        ] = await Promise.all([
          adminClient.from("reports").select("report_id", { count: "exact", head: true }),
          adminClient
            .from("reports")
            .select("report_id", { count: "exact", head: true })
            .eq("is_spam", true),
          statusMap.get("archived")
            ? adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status_id", statusMap.get("archived"))
            : adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status", "archived"),
          statusMap.get("pre_evaluation")
            ? adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status_id", statusMap.get("pre_evaluation"))
            : adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status", "waiting_filter"),
          statusMap.get("investigation")
            ? adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status_id", statusMap.get("investigation"))
            : adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status", "investigation"),
          statusMap.get("remediation")
            ? adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status_id", statusMap.get("remediation"))
            : adminClient
                .from("reports")
                .select("report_id", { count: "exact", head: true })
                .eq("status", "escalated"),
        ]);

        return jsonResponse(200, {
          success: true,
          data: {
            totalReports: totalReports ?? 0,
            spamReports: spamReports ?? 0,
            archivedReports: archivedReports ?? 0,
            waitingFilter: waitingFilter ?? 0,
            investigating: investigating ?? 0,
            remediation: remediation ?? 0,
          },
        });
      }
      case "listUsers": {
        const { data: users, error } = await adminClient
          .from("user_profiles")
          .select(
            "user_id,first_name,last_name,display_name,email,department,created_at,user_type,is_active,owned_organization_id",
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const orgIds = Array.from(
          new Set((users ?? []).map((user) => user.owned_organization_id).filter(Boolean)),
        ) as number[];
        const { data: orgs } = orgIds.length
          ? await adminClient.from("organisations").select("organization_id,name").in("organization_id", orgIds)
          : { data: [] };
        const orgMap = new Map((orgs ?? []).map((org) => [org.organization_id, org.name]));

        return jsonResponse(200, {
          success: true,
          data: {
            users: (users ?? []).map((user) => ({
              ...user,
              organisation: user.owned_organization_id
                ? orgMap.get(user.owned_organization_id) ?? "-"
                : "-",
            })),
          },
        });
      }
      case "updateUser": {
        const { user_id, ...updates } = payload ?? {};
        if (!user_id) throw new Error("user_id is required.");
        const allowed = {
          user_type: updates.user_type,
          is_active: updates.is_active,
          department: updates.department,
          job_title: updates.job_title,
        };
        const { error } = await adminClient
          .from("user_profiles")
          .update(allowed)
          .eq("user_id", user_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listOrganisations": {
        const { data: orgs, error } = await adminClient
          .from("organisations")
          .select(
            "organization_id,name,organization_type,country,city,website,is_claimed,created_at",
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const orgIds = (orgs ?? []).map((org) => org.organization_id);
        const { data: orgUsers } = orgIds.length
          ? await adminClient
              .from("organization_users")
              .select("organization_id")
              .in("organization_id", orgIds)
          : { data: [] };
        const { data: orgReports } = orgIds.length
          ? await adminClient
              .from("reports")
              .select("reported_org_id")
              .in("reported_org_id", orgIds)
          : { data: [] };

        const userCount = new Map<number, number>();
        (orgUsers ?? []).forEach((row) => {
          userCount.set(row.organization_id, (userCount.get(row.organization_id) ?? 0) + 1);
        });

        const reportCount = new Map<number, number>();
        (orgReports ?? []).forEach((row) => {
          if (!row.reported_org_id) return;
          reportCount.set(row.reported_org_id, (reportCount.get(row.reported_org_id) ?? 0) + 1);
        });

        return jsonResponse(200, {
          success: true,
          data: {
            organisations: (orgs ?? []).map((org) => ({
              ...org,
              user_count: userCount.get(org.organization_id) ?? 0,
              report_count: reportCount.get(org.organization_id) ?? 0,
            })),
          },
        });
      }
      case "updateOrganisation": {
        const { organization_id, ...updates } = payload ?? {};
        if (!organization_id) throw new Error("organization_id is required.");
        const allowed = {
          name: updates.name,
          organization_type: updates.organization_type,
          website: updates.website,
          country: updates.country,
          city: updates.city,
          is_claimed: updates.is_claimed,
        };
        const { error } = await adminClient
          .from("organisations")
          .update(allowed)
          .eq("organization_id", organization_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listReports": {
        const { data: reports, error } = await adminClient
          .from("reports")
          .select(
            "report_id,report_code,title,description,spam_score,created_at,incident_location,status,status_id,is_spam,reported_org_id,reporter_user_id,report_statuses(code,label)",
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const orgIds = Array.from(
          new Set((reports ?? []).map((r) => r.reported_org_id).filter(Boolean)),
        ) as number[];
        const userIds = Array.from(
          new Set((reports ?? []).map((r) => r.reporter_user_id).filter(Boolean)),
        );

        const { data: orgs } = orgIds.length
          ? await adminClient.from("organisations").select("organization_id,name").in("organization_id", orgIds)
          : { data: [] };
        const { data: users } = userIds.length
          ? await adminClient.from("user_profiles").select("user_id,display_name,email").in("user_id", userIds)
          : { data: [] };

        const orgMap = new Map((orgs ?? []).map((org) => [org.organization_id, org.name]));
        const userMap = new Map(
          (users ?? []).map((user) => [user.user_id, user.display_name || user.email || "-"]),
        );

        return jsonResponse(200, {
          success: true,
          data: {
            reports: (reports ?? []).map((report) => ({
              ...report,
              status_code: report.report_statuses?.code ?? report.status ?? null,
              status_label: report.report_statuses?.label ?? report.status ?? null,
              organisation: report.reported_org_id ? orgMap.get(report.reported_org_id) ?? "-" : "-",
              reporter: report.reporter_user_id ? userMap.get(report.reporter_user_id) ?? "-" : "-",
            })),
          },
        });
      }
      case "getReportDetails": {
        const { report_id } = payload ?? {};
        if (!report_id) throw new Error("report_id is required.");

        const { data: report, error: reportError } = await adminClient
          .from("reports")
          .select("*,report_statuses(code,label)")
          .eq("report_id", report_id)
          .maybeSingle();
        if (reportError) throw reportError;
        if (!report) throw new Error("Report not found.");

        const [{ data: reporter }, { data: organisation }] = await Promise.all([
          report.reporter_user_id
            ? adminClient
                .from("user_profiles")
                .select(
                  "user_id,first_name,last_name,display_name,email,phone,job_title,department,location"
                )
                .eq("user_id", report.reporter_user_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          report.reported_org_id
            ? adminClient
                .from("organisations")
                .select(
                  "organization_id,name,organization_type,country,city,website,legal_type,company_code"
                )
                .eq("organization_id", report.reported_org_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return jsonResponse(200, {
          success: true,
          data: {
            report: {
              ...report,
              status_code: report.report_statuses?.code ?? report.status ?? null,
              status_label: report.report_statuses?.label ?? report.status ?? null,
            },
            reporter,
            organisation,
          },
        });
      }
      case "updateReport": {
        const { report_id, ...updates } = payload ?? {};
        if (!report_id) throw new Error("report_id is required.");
        const statusCode = updates.status_code ?? updates.status ?? null;
        let statusId: number | null = updates.status_id ?? null;
        if (statusCode && !statusId) {
          const { data: statusRow } = await adminClient
            .from("report_statuses")
            .select("status_id")
            .eq("code", statusCode)
            .maybeSingle();
          statusId = statusRow?.status_id ?? null;
        }
        const allowed = {
          status: statusCode ?? updates.status ?? null,
          status_id: statusId ?? undefined,
          is_spam: updates.is_spam,
          spam_score: updates.spam_score,
          rejection_category: updates.rejection_category,
          need_super_admin_review: updates.need_super_admin_review,
          responsible_organisation: updates.responsible_organisation,
          share_contact_with_company: updates.share_contact_with_company,
          alert_direct_suppliers: updates.alert_direct_suppliers,
          alert_indirect_suppliers: updates.alert_indirect_suppliers,
        };
        const { error } = await adminClient
          .from("reports")
          .update(allowed)
          .eq("report_id", report_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listRiskESG": {
        const { data: risks, error } = await adminClient
          .from("risk_esg")
          .select("risk_id,risk_name,category_id,sub_category_id,risk_level,is_active,created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;

        return jsonResponse(200, { success: true, data: { risks: risks ?? [] } });
      }
      case "createRiskESG": {
        const { risk_name, category_id, sub_category_id, risk_level, is_active } = payload ?? {};
        if (!risk_name) throw new Error("risk_name is required.");
        const { error } = await adminClient.from("risk_esg").insert({
          risk_name,
          category_id: category_id ?? null,
          sub_category_id: sub_category_id ?? null,
          risk_level: risk_level ?? null,
          is_active: is_active ?? false,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateRiskESG": {
        const { risk_id, ...updates } = payload ?? {};
        if (!risk_id) throw new Error("risk_id is required.");
        const { error } = await adminClient.from("risk_esg").update(updates).eq("risk_id", risk_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listReportCategories": {
        const { data: categories, error } = await adminClient
          .from("report_categories")
          .select("category_id,name,description,is_active")
          .order("name");
        if (error) throw error;
        const { data: subs } = await adminClient
          .from("report_sub_categories")
          .select("sub_category_id,category_id,name,is_active")
          .order("name");

        return jsonResponse(200, {
          success: true,
          data: { categories: categories ?? [], subCategories: subs ?? [] },
        });
      }
      case "createReportCategory": {
        const { name, description, is_active } = payload ?? {};
        if (!name) throw new Error("name is required.");
        const { error } = await adminClient.from("report_categories").insert({
          name,
          description: description ?? null,
          is_active: is_active ?? true,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateReportCategory": {
        const { category_id, ...updates } = payload ?? {};
        if (!category_id) throw new Error("category_id is required.");
        const { error } = await adminClient
          .from("report_categories")
          .update(updates)
          .eq("category_id", category_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "createReportSubCategory": {
        const { category_id, name, description, is_active } = payload ?? {};
        if (!category_id || !name) throw new Error("category_id and name are required.");
        const { error } = await adminClient.from("report_sub_categories").insert({
          category_id,
          name,
          description: description ?? null,
          is_active: is_active ?? true,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateReportSubCategory": {
        const { sub_category_id, ...updates } = payload ?? {};
        if (!sub_category_id) throw new Error("sub_category_id is required.");
        const { error } = await adminClient
          .from("report_sub_categories")
          .update(updates)
          .eq("sub_category_id", sub_category_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listPolicies": {
        const { data: policies, error } = await adminClient
          .from("policies")
          .select("policy_id,policy_type,organization_id,version,title,description,is_active,created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { policies: policies ?? [] } });
      }
      case "createPolicy": {
        const { policy_type, organization_id, title, description, content } = payload ?? {};
        if (!policy_type || !title || !Array.isArray(content)) {
          throw new Error("policy_type, title, and content are required.");
        }
        const { error } = await adminClient.from("policies").insert({
          policy_type,
          organization_id: organization_id ?? null,
          title,
          description: description ?? null,
          content,
          is_active: true,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updatePolicy": {
        const { policy_id, ...updates } = payload ?? {};
        if (!policy_id) throw new Error("policy_id is required.");
        const { error } = await adminClient.from("policies").update(updates).eq("policy_id", policy_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listLanguages": {
        const { data: languages, error } = await adminClient
          .from("languages")
          .select("language_id,language_code,language_name")
          .order("language_name");
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { languages: languages ?? [] } });
      }
      case "listCountries": {
        const { data: countries, error } = await adminClient
          .from("countries")
          .select("country_id,country_name,flag_url")
          .order("country_name");
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { countries: countries ?? [] } });
      }
      case "createCountry": {
        const { country_name, flag_url } = payload ?? {};
        if (!country_name) {
          throw new Error("country_name is required.");
        }
        const { error } = await adminClient.from("countries").insert({
          country_name,
          flag_url: flag_url ?? null,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateCountry": {
        const { country_id, ...updates } = payload ?? {};
        if (!country_id) throw new Error("country_id is required.");
        const allowed = {
          country_name: updates.country_name,
          flag_url: updates.flag_url ?? null,
        };
        const { error } = await adminClient
          .from("countries")
          .update(allowed)
          .eq("country_id", country_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listCountryLanguages": {
        const { data: rows, error } = await adminClient
          .from("country_languages")
          .select("country_id,language_id")
          .order("country_id");
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { country_languages: rows ?? [] } });
      }
      case "createCountryLanguage": {
        const { country_id, language_id } = payload ?? {};
        if (!country_id || !language_id) {
          throw new Error("country_id and language_id are required.");
        }
        const { error } = await adminClient.from("country_languages").insert({
          country_id,
          language_id,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "deleteCountryLanguage": {
        const { country_id, language_id } = payload ?? {};
        if (!country_id || !language_id) {
          throw new Error("country_id and language_id are required.");
        }
        const { error } = await adminClient
          .from("country_languages")
          .delete()
          .eq("country_id", country_id)
          .eq("language_id", language_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "createLanguage": {
        const { language_code, language_name } = payload ?? {};
        if (!language_code || !language_name) {
          throw new Error("language_code and language_name are required.");
        }
        const { error } = await adminClient.from("languages").insert({
          language_code,
          language_name,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateLanguage": {
        const { language_id, ...updates } = payload ?? {};
        if (!language_id) throw new Error("language_id is required.");
        const { error } = await adminClient
          .from("languages")
          .update(updates)
          .eq("language_id", language_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listRelationships": {
        const { data: relationships, error } = await adminClient
          .from("organization_relationships")
          .select(
            "relationship_id,parent_org_id,child_org_id,relationship_type_id,purchase_volume,contract_start_date,contract_end_date,is_active,created_at",
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        return jsonResponse(200, { success: true, data: { relationships: relationships ?? [] } });
      }
      case "createRelationship": {
        const { parent_org_id, child_org_id, relationship_type_id, purchase_volume, contract_start_date, contract_end_date, is_active } =
          payload ?? {};
        if (!parent_org_id || !child_org_id || !relationship_type_id) {
          throw new Error("parent_org_id, child_org_id, relationship_type_id are required.");
        }
        const { error } = await adminClient.from("organization_relationships").insert({
          parent_org_id,
          child_org_id,
          relationship_type_id,
          purchase_volume: purchase_volume ?? null,
          contract_start_date: contract_start_date ?? null,
          contract_end_date: contract_end_date ?? null,
          is_active: is_active ?? false,
        });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "updateRelationship": {
        const { relationship_id, ...updates } = payload ?? {};
        if (!relationship_id) throw new Error("relationship_id is required.");
        const { error } = await adminClient
          .from("organization_relationships")
          .update(updates)
          .eq("relationship_id", relationship_id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listRelationshipTypes": {
        const { data: types, error } = await adminClient
          .from("relationship_types")
          .select("relationship_type_id,name")
          .order("name");
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { types: types ?? [] } });
      }
      case "listFeedbacks": {
        const { data: feedbacks, error } = await adminClient
          .from("feedbacks")
          .select("id,created_at,rate,recommed_us,report_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const reportIds = Array.from(
          new Set((feedbacks ?? []).map((row) => row.report_id).filter(Boolean)),
        ) as number[];
        const { data: reports } = reportIds.length
          ? await adminClient.from("reports").select("report_id,report_code").in("report_id", reportIds)
          : { data: [] };
        const reportMap = new Map((reports ?? []).map((row) => [row.report_id, row.report_code]));

        return jsonResponse(200, {
          success: true,
          data: {
            feedbacks: (feedbacks ?? []).map((row) => ({
              ...row,
              report_code: row.report_id ? reportMap.get(row.report_id) ?? null : null,
            })),
          },
        });
      }
      case "getAdminProfile": {
        const { data: profile, error } = await adminClient
          .from("user_profiles")
          .select("first_name,last_name,display_name,email,department,job_title,profile_picture_url")
          .eq("auth_user_id", adminUser.id)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { profile } });
      }
      case "updateAdminProfile": {
        const { updates } = payload ?? {};
        if (!updates || typeof updates !== "object") {
          throw new Error("updates payload required.");
        }
        const allowed = {
          first_name: (updates as Record<string, unknown>).first_name,
          last_name: (updates as Record<string, unknown>).last_name,
          display_name: (updates as Record<string, unknown>).display_name,
          department: (updates as Record<string, unknown>).department,
          job_title: (updates as Record<string, unknown>).job_title,
          profile_picture_url: (updates as Record<string, unknown>).profile_picture_url,
        };
        const { error } = await adminClient
          .from("user_profiles")
          .update(allowed)
          .eq("auth_user_id", adminUser.id);
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "getPlatformSettings": {
        const { data: settings, error } = await adminClient
          .from("platform_settings")
          .select("key,value");
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { settings: settings ?? [] } });
      }
      case "updatePlatformSettings": {
        const { key, value } = payload ?? {};
        if (!key) throw new Error("key is required.");
        const { error } = await adminClient
          .from("platform_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
        return jsonResponse(200, { success: true });
      }
      case "listSpamReports": {
        const { data: reports, error } = await adminClient
          .from("reports")
          .select("report_id,report_code,title,description,created_at,spam_score")
          .eq("is_spam", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return jsonResponse(200, { success: true, data: { reports: reports ?? [] } });
      }
      case "listArchivedReports": {
        const { data: archivedStatus } = await adminClient
          .from("report_statuses")
          .select("status_id")
          .eq("code", "archived")
          .maybeSingle();
        let reportsQuery = adminClient
          .from("reports")
          .select("report_id,report_code,title,description,created_at,status,status_id,report_statuses(code,label)")
          .order("created_at", { ascending: false });
        if (archivedStatus?.status_id) {
          reportsQuery = reportsQuery.eq("status_id", archivedStatus.status_id);
        } else {
          reportsQuery = reportsQuery.eq("status", "archived");
        }
        const { data: reports, error } = await reportsQuery;
        if (error) throw error;
        return jsonResponse(200, {
          success: true,
          data: {
            reports: (reports ?? []).map((report) => ({
              ...report,
              status_code: report.report_statuses?.code ?? report.status ?? null,
              status_label: report.report_statuses?.label ?? report.status ?? null,
            })),
          },
        });
      }
      case "consentStats": {
        const [{ count: total }, { count: active }] = await Promise.all([
          adminClient.from("user_policy_consents").select("consent_id", { count: "exact", head: true }),
          adminClient
            .from("user_policy_consents")
            .select("consent_id", { count: "exact", head: true })
            .eq("is_revoked", false),
        ]);
        return jsonResponse(200, {
          success: true,
          data: {
            total: total ?? 0,
            active: active ?? 0,
            revoked: (total ?? 0) - (active ?? 0),
          },
        });
      }
      default:
        return jsonResponse(400, { success: false, error: "Unknown action" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { success: false, error: message });
  }
});
