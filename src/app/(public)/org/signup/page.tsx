"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const steps = [
  "Organisation",
  "Admin",
  "Account",
  "Terms",
  "Match",
  "Payment",
  "Complete",
];

const fallbackOrgTypes = [
  { value: "company", label: "Company" },
  { value: "supplier", label: "Supplier" },
  { value: "ngo", label: "NGO" },
  { value: "regulatory", label: "Regulatory" },
  { value: "service_provider", label: "Service Provider" },
];

const fallbackCountryNames = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const fallbackCountries = fallbackCountryNames.map((name) => ({ id: name, name }));

const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const ORG_LOGO_BUCKET = "organisation-logos";

type CountryOption = { id: string; name: string };
type OrganisationOption = { id: number; name: string; country?: string | null };

type FormState = {
  orgType: string;
  orgName: string;
  legalType: string;
  address: string;
  city: string;
  country: string;
  website: string;
  logo: File | null;
  revenue: string;
  employees: string;
  sectors: string;
  countriesActivity: string;
  countriesSuppliers: string;
  referralCode: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhoneCode: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword: string;
  termsPrivacy: boolean;
  termsProcessor: boolean;
  termsSubscription: boolean;
  termsPlatform: boolean;
  termsAuthorization: boolean;
  planStandard: boolean;
  planWhistle: boolean;
  planStatistics: boolean;
  planCompliance: boolean;
};

const initialState: FormState = {
  orgType: "",
  orgName: "",
  legalType: "",
  address: "",
  city: "",
  country: "",
  website: "",
  logo: null,
  revenue: "",
  employees: "",
  sectors: "",
  countriesActivity: "",
  countriesSuppliers: "",
  referralCode: "",
  adminFirstName: "",
  adminLastName: "",
  adminPhoneCode: "+1",
  adminPhone: "",
  adminEmail: "",
  adminPassword: "",
  termsPrivacy: false,
  termsProcessor: false,
  termsSubscription: false,
  termsPlatform: false,
  termsAuthorization: false,
  planStandard: true,
  planWhistle: false,
  planStatistics: false,
  planCompliance: false,
};

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        }
      ) => number;
      enterprise?: {
        render: (
          container: string | HTMLElement,
          params: {
            sitekey: string;
            callback: (token: string) => void;
            "expired-callback": () => void;
          }
        ) => number;
      };
    };
  }
}

export default function OrgSignupPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRendered, setCaptchaRendered] = useState(false);
  const captchaWidgetId = useRef<number | null>(null);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>(fallbackCountries);
  const [orgOptions, setOrgOptions] = useState<OrganisationOption[]>([]);
  const [orgTypeOptions, setOrgTypeOptions] = useState<{ value: string; label: string }[]>(
    fallbackOrgTypes
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isValidPhone = (value: string) =>
    value.trim() === "" || /^[+()0-9\s-]{6,}$/.test(value.trim());

  const isValidUrl = (value: string) =>
    value.trim() === "" || /^https?:\/\//i.test(value.trim());

  const isValidNumber = (value: string) =>
    value.trim() === "" || /^\d+(\.\d+)?$/.test(value.trim());

  const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");

  const getDomainFromUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const host = new URL(normalized).hostname.toLowerCase();
      return host.startsWith("www.") ? host.slice(4) : host;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      const [{ data: countryRows }, { data: orgRows }, { data: typeRows }] = await Promise.all([
        supabase.from("countries").select("country_id,country_name").order("country_name"),
        supabase.from("organisations").select("organization_id,name,country").order("name"),
        supabase
          .from("organization_types")
          .select("type_key,label,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order")
          .order("label"),
      ]);

      if (!isMounted) return;

      const nextCountries =
        countryRows?.map((row) => ({
          id: String(row.country_id),
          name: row.country_name,
        })) ?? [];
      const nextOrgs =
        orgRows?.map((org) => ({
          id: org.organization_id,
          name: org.name,
          country: org.country,
        })) ?? [];
      const nextOrgTypes =
        typeRows?.map((item) => ({
          value: item.type_key,
          label: item.label,
        })) ?? [];

      if (nextCountries.length) setCountryOptions(nextCountries);
      setOrgOptions(nextOrgs);
      if (nextOrgTypes.length) setOrgTypeOptions(nextOrgTypes);
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || captchaRendered) return;

    const renderCaptcha = () => {
      const api =
        window.grecaptcha?.enterprise && typeof window.grecaptcha.enterprise.render === "function"
          ? window.grecaptcha.enterprise
          : window.grecaptcha && typeof window.grecaptcha.render === "function"
            ? window.grecaptcha
            : null;
      const container = document.getElementById("org-recaptcha");
      if (!api || !container) return;
      if (captchaWidgetId.current !== null) return;
      if (container.childElementCount > 0) return;
      captchaWidgetId.current = api.render(container, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => {
          setCaptchaToken(token);
        },
        "expired-callback": () => {
          setCaptchaToken(null);
        },
      });
      setCaptchaRendered(true);
    };

    if (window.grecaptcha) {
      renderCaptcha();
      return;
    }

    const existing = document.getElementById("recaptcha-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "recaptcha-script";
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderCaptcha;
      document.body.appendChild(script);
    }
  }, [captchaRendered]);

  const captchaRequired = Boolean(RECAPTCHA_SITE_KEY);

  const countryNameById = useMemo(
    () => Object.fromEntries(countryOptions.map((country) => [country.id, country.name])),
    [countryOptions]
  );

  const matchedOrganisations = useMemo(() => {
    if (!form.orgName.trim()) return [];
    const query = form.orgName.trim().toLowerCase();
    return orgOptions.filter((org) => org.name.toLowerCase().includes(query)).slice(0, 6);
  }, [form.orgName, orgOptions]);

  const stepErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (captchaRequired && !captchaToken) errors.captcha = "Complete the captcha to continue.";
      if (!form.orgType) errors.orgType = "Organisation type is required.";
      if (!form.orgName.trim()) errors.orgName = "Organisation name is required.";
      if (!form.address.trim()) errors.address = "Address is required.";
      if (!form.country) errors.country = "Country is required.";
      if (!isValidUrl(form.website)) errors.website = "Enter a valid URL.";
      if (!isValidNumber(form.revenue)) errors.revenue = "Enter a valid revenue amount.";
      if (!isValidNumber(form.employees)) errors.employees = "Enter a valid employee count.";
    }

    if (stepIndex === 1) {
      if (!form.adminFirstName.trim()) errors.adminFirstName = "First name is required.";
      if (!form.adminLastName.trim()) errors.adminLastName = "Last name is required.";
      if (!form.adminEmail.trim()) errors.adminEmail = "Email is required.";
      if (form.adminEmail && !isValidEmail(form.adminEmail)) errors.adminEmail = "Enter a valid email.";
      if (!form.adminPassword.trim()) errors.adminPassword = "Password is required.";
      if (form.adminPassword && form.adminPassword.length < 8) {
        errors.adminPassword = "Password must be at least 8 characters.";
      }
      if (!isValidPhone(form.adminPhone)) errors.adminPhone = "Enter a valid phone number.";
      if (form.website && isValidUrl(form.website)) {
        const websiteDomain = getDomainFromUrl(form.website);
        const emailDomain = form.adminEmail.trim().toLowerCase().split("@")[1] || "";
        if (websiteDomain && emailDomain && websiteDomain !== emailDomain) {
          errors.adminEmail = `Email must match the organisation domain (@${websiteDomain}).`;
        }
      }
    }

    if (stepIndex === 3) {
      if (!form.termsPrivacy) errors.termsPrivacy = "Required.";
      if (!form.termsProcessor) errors.termsProcessor = "Required.";
      if (!form.termsSubscription) errors.termsSubscription = "Required.";
      if (!form.termsPlatform) errors.termsPlatform = "Required.";
      if (!form.termsAuthorization) errors.termsAuthorization = "Required.";
    }

    return errors;
  }, [captchaRequired, captchaToken, form, stepIndex]);

  const canContinue = useMemo(() => Object.keys(stepErrors).length === 0, [stepErrors]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    setShowErrors(false);
    setFormErrors({});
  }, [stepIndex]);

  const uploadLogo = async (orgName: string) => {
    if (!form.logo) return null;
    const ext = form.logo.name.split(".").pop() || "file";
    const path = `orgs/${orgName}-${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(ORG_LOGO_BUCKET)
      .upload(path, form.logo, { upsert: false });
    if (error) throw new Error(error.message);
    return data?.path ?? path;
  };

  const submitSignup = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const countryName = countryNameById[form.country] || form.country;
      const logoPath = await uploadLogo(form.orgName.trim());
      const contactPayload = {
        logo_path: logoPath,
        revenue: form.revenue || null,
        sectors: form.sectors || null,
        countries_activity: form.countriesActivity || null,
        countries_suppliers: form.countriesSuppliers || null,
      };
      const contactInfo = Object.values(contactPayload).some(Boolean)
        ? JSON.stringify(contactPayload)
        : null;

      const { data: orgData, error: orgError } = await supabase
        .from("organisations")
        .insert({
          name: form.orgName.trim(),
          organization_type: form.orgType,
          legal_type: form.legalType || null,
          address: form.address || null,
          city: form.city || null,
          country: countryName || null,
          website: form.website || null,
          employees_number: form.employees ? Number(form.employees) : null,
          company_code: form.referralCode || null,
          contact_info: contactInfo,
          is_claimed: false,
          approval_status: "pending",
          account_status: "inactive",
        })
        .select("organization_id,name")
        .single();

      if (orgError || !orgData) {
        throw new Error(orgError?.message ?? "Unable to create organisation.");
      }

      const adminEmail = form.adminEmail.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: form.adminPassword,
        options: {
          data: {
            first_name: form.adminFirstName.trim(),
            last_name: form.adminLastName.trim(),
            organisation_name: orgData.name,
          },
        },
      });

      if (authError) throw new Error(authError.message);

      if (authData.user?.id) {
        const { data: profileRow, error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            auth_user_id: authData.user.id,
            email: adminEmail,
            first_name: form.adminFirstName.trim(),
            last_name: form.adminLastName.trim(),
            display_name: `${form.adminFirstName.trim()} ${form.adminLastName.trim()}`.trim(),
            phone: form.adminPhone ? `${form.adminPhoneCode} ${form.adminPhone}`.trim() : null,
            location: countryName || null,
            user_type: "organization_owner",
            is_verified: true,
            is_active: true,
            anonymous_identifier: null,
            owned_organization_id: orgData.organization_id,
          })
          .select("user_id")
          .single();

        if (profileError) throw new Error(profileError.message);

        if (profileRow?.user_id) {
          const { data: roleRow } = await supabase
            .from("roles")
            .select("role_id")
            .eq("name", "organization_owner")
            .maybeSingle();

          const { error: orgUserError } = await supabase.from("organization_users").insert({
            user_id: profileRow.user_id,
            organization_id: orgData.organization_id,
            role_id: roleRow?.role_id ?? null,
            is_active: true,
          });

          if (orgUserError) throw new Error(orgUserError.message);
        }
      }

      setStepIndex(6);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Unable to submit signup.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!canContinue) {
      setShowErrors(true);
      setFormErrors(stepErrors);
      return;
    }
    setShowErrors(false);
    setFormErrors({});

    if (stepIndex === steps.length - 2) {
      await submitSignup();
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="font-display text-3xl">Organisation Signup</h1>
          <p className="mt-2 text-sm text-slate-500">Step {stepIndex + 1} of {steps.length}</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                  index <= stepIndex ? "bg-[var(--wb-navy)] text-white" : "bg-slate-100"
                }`}
              >
                {index + 1}
              </span>
              {index < steps.length - 1 ? <span className="h-px w-6 bg-slate-200" /> : null}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          {stepIndex === 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Organisation sign up form
              </h2>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                value={form.orgType}
                onChange={(event) => update("orgType", event.target.value)}
              >
                <option value="">Organisation type</option>
                {orgTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {showErrors && formErrors.orgType ? (
                <p className="text-xs text-rose-500">{formErrors.orgType}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Organisation name"
                value={form.orgName}
                onChange={(event) => update("orgName", event.target.value)}
              />
              {showErrors && formErrors.orgName ? (
                <p className="text-xs text-rose-500">{formErrors.orgName}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Legal type"
                value={form.legalType}
                onChange={(event) => update("legalType", event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Address"
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
              />
              {showErrors && formErrors.address ? (
                <p className="text-xs text-rose-500">{formErrors.address}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="City"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                />
                <select
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  value={form.country}
                  onChange={(event) => update("country", event.target.value)}
                >
                  <option value="">Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {showErrors && formErrors.country ? (
                  <p className="text-xs text-rose-500">{formErrors.country}</p>
                ) : null}
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Website URL"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
              {showErrors && formErrors.website ? (
                <p className="text-xs text-rose-500">{formErrors.website}</p>
              ) : null}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                {form.logo ? form.logo.name : "Logo (Optional)"}
                <input
                  className="hidden"
                  type="file"
                  onChange={(event) =>
                    update("logo", event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Total revenue (optional)"
                  value={form.revenue}
                  onChange={(event) =>
                    update("revenue", event.target.value.replace(/[^0-9.]/g, ""))
                  }
                />
                {showErrors && formErrors.revenue ? (
                  <p className="text-xs text-rose-500">{formErrors.revenue}</p>
                ) : null}
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Total number of employees"
                  value={form.employees}
                  onChange={(event) => update("employees", digitsOnly(event.target.value))}
                />
                {showErrors && formErrors.employees ? (
                  <p className="text-xs text-rose-500">{formErrors.employees}</p>
                ) : null}
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Sector(s) / Industry(s)"
                value={form.sectors}
                onChange={(event) => update("sectors", event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Countries with activity"
                  value={form.countriesActivity}
                  onChange={(event) => update("countriesActivity", event.target.value)}
                />
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Countries with suppliers"
                  value={form.countriesSuppliers}
                  onChange={(event) => update("countriesSuppliers", event.target.value)}
                />
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Referral code (optional)"
                value={form.referralCode}
                onChange={(event) => update("referralCode", event.target.value)}
              />
              <div className="rounded-xl border border-slate-200 p-4">
                <div id="org-recaptcha" />
                {showErrors && formErrors.captcha ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.captcha}</p>
                ) : null}
              </div>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Admin information
              </h2>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Name"
                value={form.adminFirstName}
                onChange={(event) => update("adminFirstName", event.target.value)}
              />
              {showErrors && formErrors.adminFirstName ? (
                <p className="text-xs text-rose-500">{formErrors.adminFirstName}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Surname"
                value={form.adminLastName}
                onChange={(event) => update("adminLastName", event.target.value)}
              />
              {showErrors && formErrors.adminLastName ? (
                <p className="text-xs text-rose-500">{formErrors.adminLastName}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Organisation"
                value={form.orgName}
                readOnly
              />
              <div className="flex gap-2">
                <input
                  className="w-24 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Code"
                  value={form.adminPhoneCode}
                  onChange={(event) => update("adminPhoneCode", event.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="User phone"
                  value={form.adminPhone}
                  onChange={(event) => update("adminPhone", event.target.value)}
                />
              </div>
              {showErrors && formErrors.adminPhone ? (
                <p className="text-xs text-rose-500">{formErrors.adminPhone}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Email"
                value={form.adminEmail}
                onChange={(event) => update("adminEmail", event.target.value)}
              />
              {showErrors && formErrors.adminEmail ? (
                <p className="text-xs text-rose-500">{formErrors.adminEmail}</p>
              ) : null}
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Password"
                type="password"
                value={form.adminPassword}
                onChange={(event) => update("adminPassword", event.target.value)}
              />
              {showErrors && formErrors.adminPassword ? (
                <p className="text-xs text-rose-500">{formErrors.adminPassword}</p>
              ) : null}
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Account overview
              </h2>
              <p className="text-sm text-slate-600">
                Review your organisation and admin information before continuing.
              </p>
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                <p>Organisation: {form.orgName || "-"}</p>
                <p>Type: {form.orgType || "-"}</p>
                <p>Country: {countryNameById[form.country] || "-"}</p>
                <p>Admin: {form.adminFirstName || "-"} {form.adminLastName || ""}</p>
                <p>Email: {form.adminEmail || "-"}</p>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Terms and Conditions
              </h2>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsPrivacy}
                  onChange={(event) => update("termsPrivacy", event.target.checked)}
                />
                I have read and agree to the Privacy Policy (https://mercantilebx.com/docs/)
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsProcessor}
                  onChange={(event) => update("termsProcessor", event.target.checked)}
                />
                I agree to the Data Processor Agreement (https://mercantilebx.com/docs/)
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsSubscription}
                  onChange={(event) => update("termsSubscription", event.target.checked)}
                />
                I agree to the Subscription Agreement (https://mercantilebx.com/docs/)
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsPlatform}
                  onChange={(event) => update("termsPlatform", event.target.checked)}
                />
                I agree to the Platform Usage Terms & Conditions
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsAuthorization}
                  onChange={(event) => update("termsAuthorization", event.target.checked)}
                />
                I agree to the Confirmation of Account Opening Authorization
              </label>
              {showErrors && Object.keys(formErrors).length ? (
                <p className="text-xs text-rose-500">Please accept all required terms.</p>
              ) : null}
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Do you find your organisation below
              </h2>
              {matchedOrganisations.length ? (
                <div className="space-y-3">
                  {matchedOrganisations.map((org) => (
                    <div
                      key={org.id}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
                    >
                      <p className="font-semibold text-slate-900">{org.name}</p>
                      <p className="text-xs text-slate-500">
                        {org.country || "Country not specified"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No suggested organisation yet.</p>
              )}
            </div>
          )}

          {stepIndex === 5 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Complete your payment
              </h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">Standard Pricing / Monthly</p>
                    <p className="text-xs text-slate-500">Up to 50 employees</p>
                  </div>
                  <span className="text-sm font-semibold">€9</span>
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">Whistleblower</p>
                    <p className="text-xs text-slate-500">€9 / Monthly</p>
                  </div>
                  <button
                    className="rounded-lg bg-[var(--wb-navy)] px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() => update("planWhistle", !form.planWhistle)}
                  >
                    {form.planWhistle ? "Added" : "Add"}
                  </button>
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">Statistics</p>
                    <p className="text-xs text-slate-500">€38 / Monthly</p>
                  </div>
                  <button
                    className="rounded-lg bg-[var(--wb-navy)] px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() => update("planStatistics", !form.planStatistics)}
                  >
                    {form.planStatistics ? "Added" : "Add"}
                  </button>
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">Compliance</p>
                    <p className="text-xs text-slate-500">€85 / Yearly</p>
                  </div>
                  <button
                    className="rounded-lg bg-[var(--wb-navy)] px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() => update("planCompliance", !form.planCompliance)}
                  >
                    {form.planCompliance ? "Added" : "Add"}
                  </button>
                </label>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
                Order summary will appear here.
              </div>
            </div>
          )}

          {stepIndex === 6 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✓
              </div>
              <h2 className="font-display text-2xl">Thank you</h2>
              <p className="text-sm text-slate-600">
                Signup submitted successfully. Your organisation is now waiting for System Admin
                approval.
              </p>
              <Link
                className="inline-flex rounded-full bg-[var(--wb-navy)] px-5 py-2 text-sm text-white"
                href="/portal"
              >
                Go to portal
              </Link>
            </div>
          )}
        </div>

        {stepIndex < steps.length - 1 ? (
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600 disabled:opacity-50"
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={stepIndex === 0 || isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--wb-navy)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canContinue || isSubmitting}
              onClick={handleNext}
            >
              {stepIndex === steps.length - 2
                ? isSubmitting
                  ? "Submitting..."
                  : "Purchase"
                : "Next"}
            </button>
          </div>
        ) : null}
        {submitError ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {submitError}
          </p>
        ) : null}
      </div>
    </main>
  );
}
