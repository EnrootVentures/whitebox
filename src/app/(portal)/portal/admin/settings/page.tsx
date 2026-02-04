"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";
import { supabase } from "@/lib/supabase/client";

type SettingRow = { key: string; value: unknown };

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[var(--wb-cobalt)] focus:outline-none";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    department: "",
    job_title: "",
    profile_picture_url: "",
  });
  const [password, setPassword] = useState("");
  const [platform, setPlatform] = useState({
    disable_translation: false,
    disable_audio: false,
    enable_ai_recommendations: true,
    risk_filter_prompt: "",
    scope_guidance: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ profile: typeof profile | null }>("getAdminProfile"),
      adminInvoke<{ settings: SettingRow[] }>("getPlatformSettings"),
    ])
      .then(([profileData, settingsData]) => {
        if (!isMounted) return;
        const profileRow = profileData.profile;
        if (profileRow) {
          setProfile((prev) => ({
            ...prev,
            ...profileRow,
            first_name: profileRow.first_name ?? "",
            last_name: profileRow.last_name ?? "",
            display_name: profileRow.display_name ?? "",
            email: profileRow.email ?? "",
            department: profileRow.department ?? "",
            job_title: profileRow.job_title ?? "",
            profile_picture_url: profileRow.profile_picture_url ?? "",
          }));
        }
        const map = new Map(settingsData.settings.map((row) => [row.key, row.value]));
        setPlatform((prev) => ({
          ...prev,
          disable_translation: Boolean(map.get("disable_translation") ?? false),
          disable_audio: Boolean(map.get("disable_audio") ?? false),
          enable_ai_recommendations: Boolean(map.get("enable_ai_recommendations") ?? true),
          risk_filter_prompt: String(map.get("risk_filter_prompt") ?? ""),
          scope_guidance: String(map.get("scope_guidance") ?? ""),
        }));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminInvoke("updateAdminProfile", { updates: profile });
      if (password.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password.trim(),
        });
        if (passwordError) throw new Error(passwordError.message);
        setPassword("");
      }
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const savePlatformSetting = async (key: string, value: unknown) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminInvoke("updatePlatformSettings", { key, value });
      setSuccess("Settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionCard title="Account and security" description="Manage your admin profile and credentials.">
        <div className="grid gap-6 lg:grid-cols-[160px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
              {profile.profile_picture_url ? "Avatar set" : "Upload avatar"}
            </div>
            <input
              className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              placeholder="Avatar URL"
              value={profile.profile_picture_url || ""}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, profile_picture_url: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">First name</label>
              <input
                className={inputClass}
                value={profile.first_name}
                onChange={(event) => setProfile((prev) => ({ ...prev, first_name: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Last name</label>
              <input
                className={inputClass}
                value={profile.last_name}
                onChange={(event) => setProfile((prev) => ({ ...prev, last_name: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Display name</label>
              <input
                className={inputClass}
                value={profile.display_name}
                onChange={(event) => setProfile((prev) => ({ ...prev, display_name: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input className={inputClass} value={profile.email} readOnly />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Department</label>
              <input
                className={inputClass}
                value={profile.department}
                onChange={(event) => setProfile((prev) => ({ ...prev, department: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Role</label>
              <input className={inputClass} value="Administrator" readOnly />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">New password</label>
              <input
                type="password"
                className={inputClass}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-5 py-2 text-xs font-semibold text-white"
            onClick={saveProfile}
            type="button"
            disabled={isSaving}
          >
            Save changes
          </button>
        </div>
      </SectionCard>

      <SectionCard title="General settings" description="Toggle system-wide automation for admin workflows.">
        <div className="space-y-4 text-sm text-slate-600">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={platform.disable_translation}
              onChange={(event) => {
                const next = event.target.checked;
                setPlatform((prev) => ({ ...prev, disable_translation: next }));
                savePlatformSetting("disable_translation", next);
              }}
            />
            <span>
              <span className="font-semibold text-slate-800">Disable translation for reports</span>
              <span className="mt-1 block text-xs text-slate-500">
                Prevents auto-translation in designated sections of the report.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={platform.disable_audio}
              onChange={(event) => {
                const next = event.target.checked;
                setPlatform((prev) => ({ ...prev, disable_audio: next }));
                savePlatformSetting("disable_audio", next);
              }}
            />
            <span>
              <span className="font-semibold text-slate-800">Disable audio playback</span>
              <span className="mt-1 block text-xs text-slate-500">
                Stops audio support from playing automatically in intake flows.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={platform.enable_ai_recommendations}
              onChange={(event) => {
                const next = event.target.checked;
                setPlatform((prev) => ({ ...prev, enable_ai_recommendations: next }));
                savePlatformSetting("enable_ai_recommendations", next);
              }}
            />
            <span>
              <span className="font-semibold text-slate-800">Enable AI risk recommendations</span>
              <span className="mt-1 block text-xs text-slate-500">
                Shows AI-suggested ESG risks during triage for admin review.
              </span>
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Risk AI prompts" description="Configure the prompts used for AI risk triage.">
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Risk filtration prompt</label>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              placeholder="Provide the policy criteria and scope guidance used for AI filtering."
              value={platform.risk_filter_prompt}
              onChange={(event) =>
                setPlatform((prev) => ({ ...prev, risk_filter_prompt: event.target.value }))
              }
              onBlur={(event) => savePlatformSetting("risk_filter_prompt", event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Scope guidance</label>
            <textarea
              className={`${inputClass} min-h-[140px]`}
              placeholder="Describe the HREDD scope criteria and escalation thresholds."
              value={platform.scope_guidance}
              onChange={(event) =>
                setPlatform((prev) => ({ ...prev, scope_guidance: event.target.value }))
              }
              onBlur={(event) => savePlatformSetting("scope_guidance", event.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {success}
        </p>
      ) : null}
    </div>
  );
}
