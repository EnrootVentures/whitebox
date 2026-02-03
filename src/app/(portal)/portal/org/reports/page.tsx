"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";
import { isValidEmail } from "@/lib/validation";

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  description: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  current_filter_result_id?: number | null;
  filter_result_code?: string | null;
  filter_result_label?: string | null;
  report_statuses?: { code: string; label: string } | null;
  report_filter_results?: { code: string; label: string } | null;
  created_at: string | null;
  incident_location: string | null;
  is_spam: boolean | null;
  reporter_email?: string | null;
  original_language?: string | null;
  assigned_department_id?: number | null;
  triage_workflow_id?: number | null;
  organization_departments?: { name: string } | null;
  triage_workflows?: { name: string } | null;
};

type ReportDetails = {
  report: ReportRow & {
    incident_date: string | null;
    country: string | null;
    severity_level: number | null;
    reporter_email: string | null;
    suggested_remedy: string | null;
    legal_steps_taken: string | null;
    report_code?: string | null;
    title?: string | null;
    incident_location?: string | null;
    created_at?: string | null;
    is_anonymous?: boolean | null;
    share_contact_with_company?: boolean | null;
    alert_direct_suppliers?: boolean | null;
    alert_indirect_suppliers?: boolean | null;
    original_language?: string | null;
    is_incident_is_continuing?: boolean | null;
    intake_payload?: Record<string, unknown> | null;
    assigned_department_id?: number | null;
    triage_workflow_id?: number | null;
    organization_departments?: { name: string } | null;
    triage_workflows?: { name: string } | null;
  };
};

type ActionRow = {
  action_id: number;
  report_id: number;
  action_description: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  report_action_statuses?: { code: string; label: string } | null;
  due_date: string | null;
  created_at: string | null;
};

type CommentRow = {
  comment_id: number;
  report_id: number;
  comment_text: string;
  created_at: string | null;
  attachment_path?: string | null;
};

type StatusHistoryRow = {
  id: number;
  report_id: number;
  status_id: number;
  comment_text?: string | null;
  changed_at?: string | null;
  report_statuses?: { code: string; label: string } | null;
};

type FeedbackRow = {
  id: number;
  report_id: number | null;
  rate: number | null;
  recommed_us: boolean | null;
  created_at: string | null;
};

type RiskRow = {
  category_id: number;
  sub_category_id: number | null;
  report_categories: { name: string } | null;
  report_sub_categories: { name: string } | null;
};

type LanguageRow = {
  language_id: number;
  language_code: string;
  language_name: string;
};

type RiskCategoryRow = {
  category_id: number;
  name: string;
};

type RiskSubCategoryRow = {
  sub_category_id: number;
  category_id: number;
  name: string;
};

const tabs = [
  { key: "all", label: "All Reports" },
  { key: "open_in_progress", label: "Active" },
  { key: "pre_evaluation", label: "Filter" },
  { key: "archived", label: "Archive" },
  { key: "spam", label: "Spam" },
];

const statusOptions = [
  "pre_evaluation",
  "waiting_admitted",
  "open_in_progress",
  "investigation",
  "remediation",
  "archived",
];

const actionStatusOptions = [
  "suggested",
  "action_formulation",
  "action_implemented",
  "failed",
  "extended_due",
  "successful",
  "feedback_requested",
  "resolved",
];

const detailSections = [
  { key: "incident", label: "Incident Details" },
  { key: "reporter", label: "Reporter Information" },
  { key: "location", label: "Incident Location" },
  { key: "risks", label: "Risks" },
  { key: "supply", label: "Supply Chain Information" },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", reporterEmail: "" });
  const [viewOpen, setViewOpen] = useState(false);
  const [details, setDetails] = useState<ReportDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [primaryTab, setPrimaryTab] = useState<
    "details" | "issue" | "actions" | "services" | "activity"
  >("details");
  const [detailTab, setDetailTab] = useState<
    "incident" | "reporter" | "location" | "risks" | "supply"
  >("incident");
  const [attachmentLinks, setAttachmentLinks] = useState<
    { path: string; url: string }[]
  >([]);
  const [statusLookup, setStatusLookup] = useState<
    Record<string, { id: number; label: string }>
  >({});
  const [statusById, setStatusById] = useState<Record<number, { code: string; label: string }>>(
    {}
  );
  const [statusTransitions, setStatusTransitions] = useState<
    Record<number, Record<number, { requiresComment: boolean; requiresAction: boolean }>>
  >({});
  const [commentText, setCommentText] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [notesText, setNotesText] = useState("");
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [translationTarget, setTranslationTarget] = useState("");
  const [riskCategories, setRiskCategories] = useState<RiskCategoryRow[]>([]);
  const [riskSubCategories, setRiskSubCategories] = useState<RiskSubCategoryRow[]>([]);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ categoryId: "", subCategoryId: "" });

  const truncateText = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max).trim()}…` : value;

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        const context = await loadOrgContext();
        const { data: rows, error: reportError } = await supabase
          .from("reports")
          .select(
            "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,reporter_email,original_language,report_statuses(code,label),report_filter_results(code,label)"
          )
          .eq("reported_org_id", context.organizationId)
          .order("created_at", { ascending: false });

        if (reportError) throw new Error(reportError.message);
        if (!isMounted) return;
        const mapped =
          rows?.map((row) => ({
            ...row,
            status_code: row.report_statuses?.code ?? row.status ?? null,
            status_label: row.report_statuses?.label ?? row.status ?? null,
            filter_result_code: row.report_filter_results?.code ?? null,
            filter_result_label: row.report_filter_results?.label ?? null,
          })) ?? [];
        setReports(mapped);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load reports.");
      }
    };

    loadReports();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStatusLookup = async () => {
      const { data: rows, error } = await supabase
        .from("report_statuses")
        .select("status_id,code,label")
        .order("display_order");
      if (error || !isMounted) return;
      const map: Record<string, { id: number; label: string }> = {};
      const byId: Record<number, { code: string; label: string }> = {};
      (rows ?? []).forEach((row) => {
        map[row.code] = { id: row.status_id, label: row.label };
        byId[row.status_id] = { code: row.code, label: row.label };
      });
      setStatusLookup(map);
      setStatusById(byId);
    };
    loadStatusLookup();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadTransitions = async () => {
      const { data: rows, error } = await supabase
        .from("report_status_transitions")
        .select("from_status_id,to_status_id,requires_comment,requires_action");
      if (error || !isMounted) return;
      const map: Record<number, Record<number, { requiresComment: boolean; requiresAction: boolean }>> =
        {};
      (rows ?? []).forEach((row) => {
        if (!map[row.from_status_id]) map[row.from_status_id] = {};
        map[row.from_status_id][row.to_status_id] = {
          requiresComment: Boolean(row.requires_comment),
          requiresAction: Boolean(row.requires_action),
        };
      });
      setStatusTransitions(map);
    };
    loadTransitions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadLanguages = async () => {
      try {
        const { data: rows, error: langError } = await supabase
          .from("languages")
          .select("language_id,language_code,language_name")
          .order("language_name");
        if (langError) throw new Error(langError.message);
        if (!isMounted) return;
        setLanguages(rows ?? []);
      } catch {
        if (!isMounted) return;
        setLanguages([]);
      }
    };
    loadLanguages();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadRiskCatalog = async () => {
      try {
        const [categoryResult, subCategoryResult] = await Promise.all([
          supabase.from("report_categories").select("category_id,name").order("name"),
          supabase
            .from("report_sub_categories")
            .select("sub_category_id,category_id,name")
            .order("name"),
        ]);
        if (!isMounted) return;
        setRiskCategories((categoryResult.data ?? []) as RiskCategoryRow[]);
        setRiskSubCategories((subCategoryResult.data ?? []) as RiskSubCategoryRow[]);
      } catch {
        if (!isMounted) return;
        setRiskCategories([]);
        setRiskSubCategories([]);
      }
    };
    loadRiskCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    if (activeTab === "spam") return reports.filter((row) => row.is_spam);
    if (activeTab === "all") return reports;
    return reports.filter((row) => (row.status_code ?? row.status) === activeTab);
  }, [reports, activeTab]);

  const updateReport = async (
    reportId: number,
    updates: Partial<ReportRow> & { status_code?: string | null; status_comment?: string | null }
  ) => {
    setSaving(true);
    setError(null);
    try {
      let payload = { ...updates } as Record<string, unknown>;
      const statusComment = updates.status_comment ?? null;
      if (updates.status_code) {
        const statusEntry = statusLookup[updates.status_code];
        if (!statusEntry?.id) {
          throw new Error("Status data not loaded yet. Please try again.");
        }
        const { error: statusUpdateError } = await supabase.rpc("set_report_status", {
          p_report_id: reportId,
          p_status_code: updates.status_code,
          p_comment: statusComment ?? null,
        });
        if (statusUpdateError) throw new Error(statusUpdateError.message);

        payload = {
          ...payload,
          status_id: statusEntry?.id ?? null,
        };
        delete payload.status_code;
      }
      delete payload.status_comment;
      const writePayload = { ...payload };
      delete writePayload.status_id;
      const hasWritableFields = Object.keys(writePayload).length > 0;

      let updatedRow: ReportRow | null = null;
      if (hasWritableFields) {
        const { data, error: updateError } = await supabase
          .from("reports")
          .update(writePayload)
          .eq("report_id", reportId)
          .select(
            "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,reporter_email,original_language,report_statuses(code,label),report_filter_results(code,label)"
          )
          .maybeSingle();
        if (updateError) throw new Error(updateError.message);
        updatedRow = (data as ReportRow | null) ?? null;
      }
      if (statusComment && updates.status_code) {
        const statusId = statusLookup[updates.status_code]?.id ?? null;
        if (statusId) {
          const { data: historyRow } = await supabase
            .from("report_status_history")
            .select("id")
            .eq("report_id", reportId)
            .eq("status_id", statusId)
            .order("changed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (historyRow?.id) {
            await supabase
              .from("report_status_history")
              .update({ comment_text: statusComment })
              .eq("id", historyRow.id);
          }
        }
      }
      if (updates.status_code) {
        const { data: historyRows } = await supabase
          .from("report_status_history")
          .select("id,report_id,status_id,comment_text,changed_at,report_statuses(code,label)")
          .eq("report_id", reportId)
          .order("changed_at", { ascending: false });
        setStatusHistory((historyRows ?? []) as StatusHistoryRow[]);
      }
      const effectiveRow =
        updatedRow ??
        (
          await supabase
            .from("reports")
            .select(
              "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,reporter_email,original_language,report_statuses(code,label),report_filter_results(code,label)"
            )
            .eq("report_id", reportId)
            .maybeSingle()
        ).data;

      if (!effectiveRow) {
        throw new Error(
          "Status change could not be confirmed. You may not have permission to update this report."
        );
      }

      const mappedUpdate = {
        ...effectiveRow,
        status_code: effectiveRow.report_statuses?.code ?? effectiveRow.status ?? null,
        status_label: effectiveRow.report_statuses?.label ?? effectiveRow.status ?? null,
        filter_result_code: effectiveRow.report_filter_results?.code ?? null,
        filter_result_label: effectiveRow.report_filter_results?.label ?? null,
      };
      setReports((prev) =>
        prev.map((row) =>
          row.report_id === reportId
            ? {
                ...row,
                ...mappedUpdate,
              }
            : row
        )
      );
      setDetails((prev) =>
        prev && prev.report.report_id === reportId
          ? {
              ...prev,
              report: {
                ...prev.report,
                ...mappedUpdate,
              },
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update report.");
    } finally {
      setSaving(false);
    }
  };

  const applyFilterDecision = async (
    reportId: number,
    resultCode: "admitted" | "out_of_scope" | "unfounded" | "spam",
    reasoning?: string | null
  ) => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("apply_report_filter_decision", {
        p_report_id: reportId,
        p_result_code: resultCode,
        p_reasoning: reasoning ?? null,
        p_is_auto: false,
        p_needs_super_review: false,
      });
      if (rpcError) throw new Error(rpcError.message);

      const { data: updatedRow, error: fetchError } = await supabase
        .from("reports")
        .select(
          "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,reporter_email,original_language,report_statuses(code,label),report_filter_results(code,label)"
        )
        .eq("report_id", reportId)
        .maybeSingle();
      if (fetchError || !updatedRow) {
        throw new Error(fetchError?.message ?? "Unable to refresh report after filter decision.");
      }

      const mappedUpdate = {
        ...updatedRow,
        status_code: updatedRow.report_statuses?.code ?? updatedRow.status ?? null,
        status_label: updatedRow.report_statuses?.label ?? updatedRow.status ?? null,
        filter_result_code: updatedRow.report_filter_results?.code ?? null,
        filter_result_label: updatedRow.report_filter_results?.label ?? null,
      };

      setReports((prev) =>
        prev.map((row) => (row.report_id === reportId ? { ...row, ...mappedUpdate } : row))
      );
      setDetails((prev) =>
        prev && prev.report.report_id === reportId
          ? {
              ...prev,
              report: {
                ...prev.report,
                ...mappedUpdate,
              },
            }
          : prev
      );

      const { data: historyRows } = await supabase
        .from("report_status_history")
        .select("id,report_id,status_id,comment_text,changed_at,report_statuses(code,label)")
        .eq("report_id", reportId)
        .order("changed_at", { ascending: false });
      setStatusHistory((historyRows ?? []) as StatusHistoryRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply filter decision.");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (reportId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const { data: reportRow, error: reportError } = await supabase
        .from("reports")
        .select(
          "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,incident_date,country,severity_level,reporter_email,suggested_remedy,legal_steps_taken,is_anonymous,share_contact_with_company,alert_direct_suppliers,alert_indirect_suppliers,original_language,is_incident_is_continuing,intake_payload,assigned_department_id,triage_workflow_id,report_statuses(code,label),report_filter_results(code,label),organization_departments(name),triage_workflows(name)"
        )
        .eq("report_id", reportId)
        .maybeSingle();
      if (reportError) throw new Error(reportError.message);
      if (!reportRow) throw new Error("Report not found.");
      const mapped = {
        ...reportRow,
        status_code: reportRow.report_statuses?.code ?? reportRow.status ?? null,
        status_label: reportRow.report_statuses?.label ?? reportRow.status ?? null,
        filter_result_code: reportRow.report_filter_results?.code ?? null,
        filter_result_label: reportRow.report_filter_results?.label ?? null,
      };
      setDetails({ report: mapped as ReportDetails["report"] });
      setPrimaryTab("details");
      setDetailTab("incident");
      setCommentText("");
      setCommentFile(null);
      setNotesText("");
      setActionFilter("");
      setTranslationTarget("");
      setShowIssueForm(false);
      setIssueForm({ categoryId: "", subCategoryId: "" });
      setViewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAttachments = async () => {
      if (!details?.report) {
        setAttachmentLinks([]);
        return;
      }
      const intake = (details.report.intake_payload ?? {}) as Record<string, unknown>;
      const attachments = Array.isArray(intake.attachments) ? intake.attachments : [];
      if (!attachments.length) {
        setAttachmentLinks([]);
        return;
      }

      const results = await Promise.all(
        attachments.map(async (path) => {
          const filePath = String(path);
          const { data, error } = await supabase.storage
            .from("report-attachments")
            .createSignedUrl(filePath, 3600);
          if (error || !data?.signedUrl) {
            return { path: filePath, url: "" };
          }
          return { path: filePath, url: data.signedUrl };
        })
      );

      if (!isMounted) return;
      setAttachmentLinks(results.filter((item) => item.url));
    };

    void loadAttachments();
    return () => {
      isMounted = false;
    };
  }, [details]);

  useEffect(() => {
    let isMounted = true;
    const loadSupportingData = async () => {
      if (!details?.report) {
        setComments([]);
        setStatusHistory([]);
        setFeedbacks([]);
        setActions([]);
        setRiskRows([]);
        return;
      }

      const reportId = details.report.report_id;
      let commentRows: CommentRow[] = [];
      const commentsWithAttachment = await supabase
        .from("report_comments")
        .select("comment_id,report_id,comment_text,attachment_path,created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });
      if (commentsWithAttachment.error) {
        const fallback = await supabase
          .from("report_comments")
          .select("comment_id,report_id,comment_text,created_at")
          .eq("report_id", reportId)
          .order("created_at", { ascending: false });
        commentRows = (fallback.data ?? []) as CommentRow[];
      } else {
        commentRows = (commentsWithAttachment.data ?? []) as CommentRow[];
      }

      const [feedbackResult, actionResult, riskResult, statusHistoryResult] = await Promise.all([
        supabase
          .from("feedbacks")
          .select("id,report_id,rate,recommed_us,created_at")
          .eq("report_id", reportId)
          .order("created_at", { ascending: false }),
        supabase
          .from("report_actions")
          .select(
            "action_id,report_id,action_description,status,status_id,due_date,created_at,report_action_statuses(code,label)"
          )
          .eq("report_id", reportId)
          .order("created_at", { ascending: false }),
        supabase
          .from("report_risk_categories")
          .select("category_id,sub_category_id,report_categories(name),report_sub_categories(name)")
          .eq("report_id", reportId),
        supabase
          .from("report_status_history")
          .select("id,report_id,status_id,comment_text,changed_at,report_statuses(code,label)")
          .eq("report_id", reportId)
          .order("changed_at", { ascending: false }),
      ]);

      if (!isMounted) return;
      setComments(commentRows);
      setStatusHistory((statusHistoryResult.data ?? []) as StatusHistoryRow[]);
      setFeedbacks((feedbackResult.data ?? []) as FeedbackRow[]);
      const mappedActions =
        (actionResult.data ?? []).map((action) => ({
          ...action,
          status_code: action.report_action_statuses?.code ?? action.status ?? null,
          status_label: action.report_action_statuses?.label ?? action.status ?? null,
        })) ?? [];
      setActions(mappedActions as ActionRow[]);
      setRiskRows((riskResult.data ?? []) as RiskRow[]);
    };

    void loadSupportingData();
    return () => {
      isMounted = false;
    };
  }, [details?.report?.report_id, details?.report]);

  const uploadCommentAttachment = async (reportId: number, file: File) => {
    const filePath = `comments/${reportId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("report-attachments")
      .upload(filePath, file);
    if (uploadError) throw new Error(uploadError.message);
    return filePath;
  };

  const submitComment = async () => {
    if (!details?.report) return;
    if (!commentText.trim()) {
      setError("Comment text is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const reportId = details.report.report_id;
      let attachmentPath: string | null = null;
      if (commentFile) {
        attachmentPath = await uploadCommentAttachment(reportId, commentFile);
      }
      let insertError;
      if (attachmentPath) {
        const { data, error } = await supabase
          .from("report_comments")
          .insert({
            report_id: reportId,
            comment_text: commentText.trim(),
            attachment_path: attachmentPath,
          })
          .select("comment_id,report_id,comment_text,attachment_path,created_at")
          .single();
        insertError = error;
        if (!error && data) {
          setComments((prev) => [data as CommentRow, ...prev]);
        }
      }
      if (!attachmentPath || insertError) {
        const { data, error } = await supabase
          .from("report_comments")
          .insert({
            report_id: reportId,
            comment_text: commentText.trim(),
          })
          .select("comment_id,report_id,comment_text,created_at")
          .single();
        if (error || !data) {
          throw new Error(error?.message ?? "Unable to post comment.");
        }
        setComments((prev) => [data as CommentRow, ...prev]);
      }
      setCommentText("");
      setCommentFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment.");
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async () => {
    if (!details?.report) return;
    if (!notesText.trim()) {
      setError("Note text is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const reportId = details.report.report_id;
      const noteText = `[Note] ${notesText.trim()}`;
      const { data, error: insertError } = await supabase
        .from("report_comments")
        .insert({ report_id: reportId, comment_text: noteText })
        .select("comment_id,report_id,comment_text,created_at")
        .single();
      if (insertError || !data) {
        throw new Error(insertError?.message ?? "Unable to save note.");
      }
      setComments((prev) => [data as CommentRow, ...prev]);
      setNotesText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note.");
    } finally {
      setSaving(false);
    }
  };

  const filteredActions = useMemo(() => {
    if (!actionFilter) return actions;
    return actions.filter((action) => (action.status_code ?? action.status) === actionFilter);
  }, [actions, actionFilter]);

  const createIssue = async () => {
    if (!details?.report) return;
    if (!issueForm.categoryId) {
      setError("Select a risk category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const categoryId = Number(issueForm.categoryId);
      const subCategoryId = issueForm.subCategoryId ? Number(issueForm.subCategoryId) : null;
      const { error: insertError } = await supabase.from("report_risk_categories").insert({
        report_id: details.report.report_id,
        category_id: categoryId,
        sub_category_id: subCategoryId,
      });
      if (insertError) throw new Error(insertError.message);

      const category = riskCategories.find((item) => item.category_id === categoryId);
      const subCategory = riskSubCategories.find((item) => item.sub_category_id === subCategoryId);
      setRiskRows((prev) => [
        {
          category_id: categoryId,
          sub_category_id: subCategoryId,
          report_categories: category ? { name: category.name } : null,
          report_sub_categories: subCategory ? { name: subCategory.name } : null,
        },
        ...prev,
      ]);
      setIssueForm({ categoryId: "", subCategoryId: "" });
      setShowIssueForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add issue.");
    } finally {
      setSaving(false);
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "pre_evaluation":
        return { text: "text-amber-600", border: "border-amber-200", bg: "bg-amber-500" };
      case "waiting_admitted":
        return { text: "text-slate-600", border: "border-slate-200", bg: "bg-slate-500" };
      case "open_in_progress":
        return { text: "text-sky-600", border: "border-sky-200", bg: "bg-sky-500" };
      case "investigation":
        return { text: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-500" };
      case "remediation":
        return { text: "text-rose-600", border: "border-rose-200", bg: "bg-rose-500" };
      case "archived":
        return { text: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-500" };
      default:
        return { text: "text-slate-400", border: "border-slate-200", bg: "bg-slate-400" };
    }
  };

  const renderStatusStepper = (
    current: string | null | undefined,
    currentStatusId: number | null | undefined,
    reportId: number
  ) => {
    const lookupReady = Object.keys(statusLookup).length > 0;
    const transitionMap =
      currentStatusId && statusTransitions[currentStatusId] ? statusTransitions[currentStatusId] : null;
    const allowedStatusIds = transitionMap ? new Set(Object.keys(transitionMap).map(Number)) : null;
    return (
    <div className="relative ml-1 space-y-3">
      {statusOptions.map((status, index) => {
        const isActive = current === status;
        const isLast = index === statusOptions.length - 1;
        const color = statusStyle(status);
        const targetStatusId = statusLookup[status]?.id ?? null;
        const transitionRule =
          currentStatusId && targetStatusId && transitionMap
            ? transitionMap[targetStatusId]
            : null;
        const isAllowed =
          lookupReady &&
          (!currentStatusId ||
            (transitionMap && targetStatusId && allowedStatusIds?.has(targetStatusId)));
        return (
          <button
            key={status}
            type="button"
            className={`relative flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition ${
              isAllowed ? "hover:bg-slate-50" : "cursor-not-allowed opacity-50"
            }`}
            disabled={!isAllowed}
            onClick={() => {
              if (!isAllowed) return;
              if (transitionRule?.requiresAction && actions.length === 0) {
                setError("Add an action before moving to Remediation.");
                return;
              }
              if (transitionRule?.requiresComment && !commentText.trim()) {
                setError("Add a comment before changing this status.");
                return;
              }
              updateReport(reportId, {
                status_code: status,
                status_comment: transitionRule?.requiresComment ? commentText.trim() : null,
              });
            }}
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  isActive ? `${color.bg} text-white border-transparent` : `bg-white ${color.text} ${color.border}`
                }`}
              >
                {index + 1}
              </div>
              {!isLast ? (
                <div className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2 bg-slate-200" />
              ) : null}
            </div>
            <div>
              <p className={`text-xs font-semibold ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                {status.replace(/_/g, " ")}
              </p>
              {isActive ? <span className="text-[11px] text-slate-400">Current status</span> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
  };

  const createDraft = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (draft.reporterEmail && !isValidEmail(draft.reporterEmail)) {
      setError("Enter a valid reporter email.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const reportCode = `WB-${Math.floor(100000 + Math.random() * 900000)}`;
      const statusEntry = statusLookup.open_in_progress;
      const { data: insertRow, error: insertError } = await supabase
        .from("reports")
        .insert({
          report_code: reportCode,
          title: draft.title.trim(),
          description: draft.description.trim(),
          reported_org_id: context.organizationId,
          reporter_org_id: context.organizationId,
          reporter_user_id: context.userId,
          reporter_email: draft.reporterEmail.trim() || null,
          status: "open_in_progress",
          status_id: statusEntry?.id ?? null,
          is_anonymous: false,
          requires_anonymization: false,
        })
        .select(
          "report_id,report_code,title,description,status,status_id,current_filter_result_id,created_at,incident_location,is_spam,report_statuses(code,label),report_filter_results(code,label)"
        )
        .single();

      if (insertError || !insertRow) {
        throw new Error(insertError?.message ?? "Unable to create report draft.");
      }

      const mapped = insertRow
        ? {
            ...insertRow,
            status_code: insertRow.report_statuses?.code ?? insertRow.status ?? null,
            status_label: insertRow.report_statuses?.label ?? insertRow.status ?? null,
            filter_result_code: insertRow.report_filter_results?.code ?? null,
            filter_result_label: insertRow.report_filter_results?.label ?? null,
          }
        : null;
      setReports((prev) => (mapped ? [mapped, ...prev] : prev));
      setDraft({ title: "", description: "", reporterEmail: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create report draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Reports"
        description="Review reports visible to your organisation and manage escalation."
        actions={
          <div className="flex items-center gap-2">
            <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <option>Newest first</option>
              <option>Oldest first</option>
            </select>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => setOpen(true)}
            >
              New
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[var(--wb-cobalt)] text-white"
                  : "border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {filteredReports.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Creation Date</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Translation</th>
                    <th className="px-4 py-3">Option</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((row, index) => (
                  <tr key={row.report_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.report_code}</td>
                    <td className="px-4 py-3">{truncateText(row.title, 60)}</td>
                    <td className="px-4 py-3">{truncateText(row.description, 90)}</td>
                    <td className="px-4 py-3">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">{row.reporter_email ?? "Anonymous"}</td>
                    <td className="px-4 py-3">
                      {row.status_label ?? row.status_code ?? row.status ?? "-"}
                    </td>
                    <td className="px-4 py-3">{row.original_language ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                        onClick={() => openDetails(row.report_id)}
                        disabled={loadingDetails}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No reports yet"
              description="Once a stakeholder submits a grievance, it will appear here with the correct visibility level."
              actionLabel="Add new"
            />
          )}
        </div>
      </SectionCard>

      <Modal
        open={open}
        title="Create a new report"
        description="Start a manual report entry or invite a stakeholder to submit securely."
        onClose={() => setOpen(false)}
        actions={
          <>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={createDraft}
              disabled={saving}
            >
              Create draft
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Report title</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Stakeholder email (optional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draft.reporterEmail}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, reporterEmail: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={viewOpen}
        title="View & Update Report"
        description="Review grievance details and coordinate follow-up."
        onClose={() => setViewOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
      >
        {details?.report ? (
          (() => {
            const reporterVisible =
              !details.report.is_anonymous && details.report.share_contact_with_company;
            const intake = (details.report.intake_payload ?? {}) as Record<string, unknown>;
            const commentUpdates = comments.filter(
              (comment) => !comment.comment_text.startsWith("[Note]")
            );
            const notes = comments.filter((comment) => comment.comment_text.startsWith("[Note]"));
            const statusUpdates = statusHistory.map((entry) => ({
              id: `status-${entry.id}`,
              created_at: entry.changed_at,
              title:
                entry.report_statuses?.label ??
                statusById[entry.status_id]?.label ??
                statusById[entry.status_id]?.code ??
                "Status updated",
              comment: entry.comment_text ?? null,
              type: "status",
            }));
            const commentEvents = commentUpdates.map((comment) => ({
              id: `comment-${comment.comment_id}`,
              created_at: comment.created_at,
              title: "Comment added",
              comment: comment.comment_text,
              type: "comment",
            }));
            const activityItems = [...statusUpdates, ...commentEvents].sort((a, b) => {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bTime - aTime;
            });

            const copyLink = () => {
              const code = details.report.report_code ?? "";
              if (!code) return;
              const url = `${window.location.origin}/portal/org/reports?report=${code}`;
              void navigator.clipboard.writeText(url);
            };

            return (
              <div className="space-y-6">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Report Source</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {(intake.incident_company_name as string) ?? "WhiteBox"}
                    </p>
                    <p className="text-xs text-slate-400">Report ID</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.report.report_code ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Report Stage</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.status_label ??
                        details.report.status_code ??
                        details.report.status ??
                        "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Assigned Department</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.organization_departments?.name ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Triage Workflow</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.triage_workflows?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Creation Date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {details.report.created_at
                        ? new Date(details.report.created_at).toLocaleString()
                        : "-"}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Original Language</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {details.report.original_language ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Share with others</p>
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(details.report.share_contact_with_company)}
                        onChange={(event) =>
                          updateReport(Number(details.report.report_id), {
                            share_contact_with_company: event.target.checked,
                          })
                        }
                      />
                      Share reporter contact
                    </label>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
                      onClick={copyLink}
                    >
                      Copy Report Link
                    </button>
                    <p className="mt-4 text-xs text-slate-400">Translate to</p>
                    <select
                      className="mt-2 w-full rounded-full border border-slate-200 px-3 py-2 text-xs"
                      value={translationTarget}
                      onChange={(event) => setTranslationTarget(event.target.value)}
                    >
                      <option value="">Choose Language</option>
                      {languages.map((lang) => (
                        <option key={lang.language_id} value={lang.language_code}>
                          {lang.language_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_2fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Report Status</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {details.report.status_label ??
                          details.report.status_code ??
                          details.report.status ??
                          "-"}
                      </p>
                      <div className="mt-4">
                        {renderStatusStepper(
                          details.report.status_id
                            ? statusById[details.report.status_id]?.code ??
                                details.report.status_code ??
                                details.report.status ??
                                undefined
                            : details.report.status_code ?? details.report.status ?? undefined,
                          details.report.status_id ?? null,
                          details.report.report_id
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">AI Filtration Result</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {details.report.filter_result_label ?? "N/A"}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Reasoning: -</p>
                      {(details.report.status_code ?? details.report.status) === "pre_evaluation" ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                            onClick={() => applyFilterDecision(details.report.report_id, "admitted")}
                          >
                            Admit
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-700"
                            onClick={() => applyFilterDecision(details.report.report_id, "out_of_scope")}
                          >
                            Out of Scope
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-700"
                            onClick={() => applyFilterDecision(details.report.report_id, "unfounded")}
                          >
                            Unfounded
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-fuchsia-200 px-3 py-1 text-[11px] font-semibold text-fuchsia-700"
                            onClick={() => applyFilterDecision(details.report.report_id, "spam")}
                          >
                            Spam
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Last Modified</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {details.report.created_at
                          ? new Date(details.report.created_at).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-400">Escalation</p>
                      <div className="mt-3 space-y-3 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Direct Suppliers</span>
                          <button
                            type="button"
                            className="rounded-full bg-[var(--wb-cobalt)] px-3 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              updateReport(details.report.report_id, {
                                alert_direct_suppliers: !details.report.alert_direct_suppliers,
                              })
                            }
                          >
                            {details.report.alert_direct_suppliers ? "Included" : "Escalate"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Indirect Suppliers</span>
                          <button
                            type="button"
                            className="rounded-full bg-[var(--wb-cobalt)] px-3 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              updateReport(details.report.report_id, {
                                alert_indirect_suppliers: !details.report.alert_indirect_suppliers,
                              })
                            }
                          >
                            {details.report.alert_indirect_suppliers ? "Included" : "Escalate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        {[
                          { key: "details", label: "Details" },
                          { key: "issue", label: "Issue" },
                          { key: "actions", label: "Actions" },
                          { key: "services", label: "Services" },
                          { key: "activity", label: "Activity Log" },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            className={`rounded-full px-3 py-1 ${
                              primaryTab === tab.key
                                ? "bg-[var(--wb-cobalt)] text-white"
                                : "border border-slate-200"
                            }`}
                            onClick={() =>
                              setPrimaryTab(
                                tab.key as "details" | "issue" | "actions" | "services" | "activity"
                              )
                            }
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                    {primaryTab === "details" ? (
                      <div className="mt-4 space-y-4 text-sm text-slate-600">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                          {detailSections.map((tab) => (
                            <button
                              key={tab.key}
                              className={`rounded-full px-3 py-1 ${
                                detailTab === tab.key
                                  ? "bg-slate-100 text-slate-900"
                                  : "border border-slate-200"
                              }`}
                              onClick={() =>
                                setDetailTab(
                                  tab.key as "incident" | "reporter" | "location" | "risks" | "supply"
                                )
                              }
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {detailTab === "incident" ? (
                        <div>
                          <p className="text-xs text-slate-400">Report subject</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {details.report.title ?? "-"}
                          </p>
                        </div>
                        ) : null}
                        {detailTab === "incident" ? (
                        <div>
                          <p className="text-xs text-slate-400">Description</p>
                          <p className="mt-1">{details.report.description ?? "-"}</p>
                        </div>
                        ) : null}
                        {detailTab === "incident" ? (
                        <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Incident date</p>
                            <p className="font-semibold">{details.report.incident_date ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Location</p>
                            <p className="font-semibold">{details.report.incident_location ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Country</p>
                            <p className="font-semibold">{details.report.country ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Severity</p>
                            <p className="font-semibold">{details.report.severity_level ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-slate-400">Continuing</p>
                            <p className="font-semibold">
                              {details.report.is_incident_is_continuing ? "Yes" : "No"}
                            </p>
                          </div>
                        </div>
                        ) : null}
                        {detailTab === "incident" && details.report.legal_steps_taken ? (
                          <div>
                            <p className="text-xs text-slate-400">Legal steps taken</p>
                            <p className="mt-1">{details.report.legal_steps_taken}</p>
                          </div>
                        ) : null}
                        {detailTab === "incident" && details.report.suggested_remedy ? (
                          <div>
                            <p className="text-xs text-slate-400">Suggested remedy</p>
                            <p className="mt-1">{details.report.suggested_remedy}</p>
                          </div>
                        ) : null}
                        {detailTab === "incident" ? (
                          <div>
                            <p className="text-xs text-slate-400">Files</p>
                            {attachmentLinks.length ? (
                              <ul className="mt-2 space-y-2 text-xs">
                                {attachmentLinks.map((file) => (
                                  <li key={file.path} className="flex items-center justify-between">
                                    <span className="truncate">{file.path.split("/").pop()}</span>
                                    <a
                                      className="text-[var(--wb-cobalt)]"
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs text-slate-400">No files attached.</p>
                            )}
                          </div>
                        ) : null}

                        {detailTab === "reporter" ? (
                          <div className="space-y-3 text-xs text-slate-600">
                            <div>
                              <p className="text-xs text-slate-400">Email</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {reporterVisible ? details.report.reporter_email ?? "-" : "Hidden"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Country of residence</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {(intake.reporter_country as string) ?? "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Representative</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {intake.representative ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {detailTab === "location" ? (
                          <div className="space-y-2 text-xs text-slate-600">
                            <p className="text-xs text-slate-400">Reported company</p>
                            <p className="font-semibold text-slate-900">
                              {(intake.incident_company_name as string) ?? "-"}
                            </p>
                            <p className="text-xs text-slate-400">Worksite</p>
                            <p className="font-semibold text-slate-900">
                              {(intake.worksite_name as string) ?? details.report.incident_location ?? "-"}
                            </p>
                            <p className="text-xs text-slate-400">Country</p>
                            <p className="font-semibold text-slate-900">{details.report.country ?? "-"}</p>
                          </div>
                        ) : null}

                        {detailTab === "risks" ? (
                          <div className="space-y-3 text-xs text-slate-600">
                            {riskRows.length ? (
                              riskRows.map((risk) => (
                                <div key={`${risk.category_id}-${risk.sub_category_id ?? 0}`}>
                                  <p className="text-xs text-slate-400">Category</p>
                                  <p className="font-semibold text-slate-900">
                                    {risk.report_categories?.name ?? "Uncategorized"}
                                  </p>
                                  <p className="text-xs text-slate-400">Subcategory</p>
                                  <p className="font-semibold text-slate-900">
                                    {risk.report_sub_categories?.name ?? "-"}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400">No risk categories linked yet.</p>
                            )}
                          </div>
                        ) : null}

                        {detailTab === "supply" ? (
                          <div className="space-y-3 text-xs text-slate-600">
                            <div>
                              <p className="text-xs text-slate-400">Direct suppliers</p>
                              <p className="font-semibold text-slate-900">
                                {details.report.alert_direct_suppliers ? "Included" : "Not Included"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Indirect suppliers</p>
                              <p className="font-semibold text-slate-900">
                                {details.report.alert_indirect_suppliers ? "Included" : "Not Included"}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {primaryTab === "issue" ? (
                      <div className="mt-4 space-y-3 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700">Report Issues</p>
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                            onClick={() => setShowIssueForm((prev) => !prev)}
                          >
                            {showIssueForm ? "Close" : "Create"}
                          </button>
                        </div>
                        {showIssueForm ? (
                          <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
                            <select
                              className="w-full rounded-full border border-slate-200 px-3 py-2 text-[11px]"
                              value={issueForm.categoryId}
                              onChange={(event) =>
                                setIssueForm((prev) => ({
                                  ...prev,
                                  categoryId: event.target.value,
                                  subCategoryId: "",
                                }))
                              }
                            >
                              <option value="">Select Category</option>
                              {riskCategories.map((category) => (
                                <option key={category.category_id} value={category.category_id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className="w-full rounded-full border border-slate-200 px-3 py-2 text-[11px]"
                              value={issueForm.subCategoryId}
                              onChange={(event) =>
                                setIssueForm((prev) => ({
                                  ...prev,
                                  subCategoryId: event.target.value,
                                }))
                              }
                              disabled={!issueForm.categoryId}
                            >
                              <option value="">Select Subcategory</option>
                              {riskSubCategories
                                .filter(
                                  (sub) => String(sub.category_id) === issueForm.categoryId
                                )
                                .map((sub) => (
                                  <option key={sub.sub_category_id} value={sub.sub_category_id}>
                                    {sub.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              className="w-full rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-[11px] font-semibold text-white"
                              onClick={createIssue}
                              disabled={saving}
                            >
                              Add Issue
                            </button>
                          </div>
                        ) : null}
                        {riskRows.length ? (
                          <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-left text-[11px] text-slate-500">
                              <thead className="bg-slate-50 uppercase tracking-[0.2em] text-[10px] text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Issue Name</th>
                                  <th className="px-3 py-2">Category</th>
                                  <th className="px-3 py-2">Subcategory</th>
                                </tr>
                              </thead>
                              <tbody>
                                {riskRows.map((risk) => (
                                  <tr
                                    key={`${risk.category_id}-${risk.sub_category_id ?? 0}`}
                                    className="border-t border-slate-100"
                                  >
                                    <td className="px-3 py-2">
                                      {risk.report_sub_categories?.name ??
                                        risk.report_categories?.name ??
                                        "Risk Issue"}
                                    </td>
                                    <td className="px-3 py-2">
                                      {risk.report_categories?.name ?? "Uncategorized"}
                                    </td>
                                    <td className="px-3 py-2">
                                      {risk.report_sub_categories?.name ?? "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No issues linked to this report yet.</p>
                        )}
                      </div>
                    ) : null}

                    {primaryTab === "actions" ? (
                      <div className="mt-4 space-y-3 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700">Actions</p>
                          <select
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value)}
                          >
                            <option value="">Select Action Status</option>
                            {actionStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        {filteredActions.length ? (
                          <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-left text-[11px] text-slate-500">
                              <thead className="bg-slate-50 uppercase tracking-[0.2em] text-[10px] text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Description</th>
                                  <th className="px-3 py-2">Suggested By</th>
                                  <th className="px-3 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredActions.map((action) => (
                                  <tr key={action.action_id} className="border-t border-slate-100">
                                    <td className="px-3 py-2">{action.action_description}</td>
                                    <td className="px-3 py-2">reporter</td>
                                    <td className="px-3 py-2">
                                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                        {action.status_label ??
                                          action.status_code ??
                                          action.status ??
                                          "suggested"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No actions tracked yet.</p>
                        )}
                      </div>
                    ) : null}

                    {primaryTab === "services" ? (
                      <div className="mt-6 text-center text-xs text-slate-500">Coming Soon</div>
                    ) : null}

                    {primaryTab === "activity" ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
                        <p className="text-sm font-semibold text-slate-700">Activity Timeline</p>
                        {activityItems.length ? (
                          <div className="relative mt-4 space-y-4">
                            <span className="absolute left-2 top-2 h-full w-px bg-slate-200" />
                            {activityItems.map((item) => (
                              <div key={item.id} className="relative pl-6">
                                <span className="absolute left-[0.35rem] top-2 h-2 w-2 rounded-full bg-[var(--wb-cobalt)] shadow-[0_0_8px_rgba(59,130,246,0.35)]" />
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-[11px] text-slate-500">
                                    {item.created_at
                                      ? new Date(item.created_at).toLocaleString()
                                      : "-"}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-700">
                                    {item.type === "status"
                                      ? `Status changed to: ${item.title}`
                                      : item.title}
                                  </p>
                                  {item.comment ? (
                                    <p className="mt-1 text-xs text-slate-600">{item.comment}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-slate-400">No activity yet.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-700">Comments & Updates</p>
                    <p className="mt-2 text-[11px] text-slate-400">Message 0/500</p>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      rows={3}
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Please write your comment..."
                    />
                    <p className="mt-2 text-[11px] text-slate-400">Attachment (optional)</p>
                    <input
                      type="file"
                      className="mt-2 w-full text-[11px] text-slate-500"
                      onChange={(event) => setCommentFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      className="mt-3 w-full rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      onClick={submitComment}
                      disabled={saving}
                    >
                      Post Comment
                    </button>
                    <div className="mt-4 space-y-3">
                      {commentUpdates.length ? (
                        commentUpdates.map((comment) => (
                          <div
                            key={comment.comment_id}
                            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                          >
                            <p>{comment.comment_text}</p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {comment.created_at ? new Date(comment.created_at).toLocaleString() : "-"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No comments yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-700">Reporter Feedbacks</p>
                      {feedbacks.length ? (
                        <div className="mt-3 space-y-2 text-xs text-slate-600">
                          {feedbacks.map((feedback) => (
                            <div key={feedback.id} className="rounded-xl border border-slate-100 px-3 py-2">
                              <p className="text-[11px] text-slate-400">Rating</p>
                              <p className="font-semibold text-slate-900">
                                {feedback.rate ?? "-"} / 5
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {feedback.recommed_us ? "Recommends" : "Not sure"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No feedbacks yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-700">Notes</p>
                  <textarea
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    rows={3}
                    value={notesText}
                    onChange={(event) => setNotesText(event.target.value)}
                    placeholder="Add a private note"
                  />
                  <p className="mt-2 text-[11px] text-slate-400">0 / 500</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="space-y-2 text-xs text-slate-500">
                      {notes.length ? (
                        notes.map((note) => (
                          <p key={note.comment_id}>{note.comment_text.replace("[Note] ", "")}</p>
                        ))
                      ) : (
                        <span>No notes yet.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                      onClick={submitNote}
                      disabled={saving}
                    >
                      Take Note
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-slate-500">Select a report to view details.</p>
        )}
      </Modal>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
