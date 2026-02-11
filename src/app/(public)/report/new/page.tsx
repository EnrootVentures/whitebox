"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const steps = [
  "Languages",
  "Policies",
  "Stakeholder",
  "Reported company",
  "NGO representation",
  "Direct & indirect",
  "Incident details",
  "Review",
  "Complete",
];

type CountryOption = { id: string; name: string };
type LanguageOption = { id: string; name: string; code: string };
type OrganisationOption = {
  id: number;
  name: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  type?: string | null;
};
type WorksiteOption = {
  id: number;
  name: string;
  country?: string | null;
  city?: string | null;
};
type CategoryOption = { id: number; name: string };
type SubCategoryOption = { id: number; name: string; categoryId: number };
type RelatedOrgOption = {
  id: number;
  name: string;
  relationTypeName: string;
  relationKind: "direct" | "indirect" | "other";
};
type IntakeOrganizationRow = {
  organization_id: number;
  name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  organization_type: string | null;
  approval_status: string | null;
  account_status: string | null;
};
type IntakeCopyMap = Record<string, unknown>;
type AudioAssetRow = {
  id: number;
  audio_url: string | null;
  text_content: string | null;
  language: string | null;
  text_id: string | null;
};
type FieldHelpState = {
  title: string;
  standard: string;
  easy: string;
};

const isEnglishLanguage = (language: Pick<LanguageOption, "name" | "code">) => {
  const code = (language.code || "").trim().toLowerCase();
  const name = (language.name || "").trim().toLowerCase();
  return code === "en" || code === "en-us" || code.startsWith("en-") || name.includes("english");
};

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

const fallbackCountries: CountryOption[] = fallbackCountryNames.map((name) => ({
  id: name,
  name,
}));

const fallbackLanguages: LanguageOption[] = [
  { id: "en-US", name: "English (US)", code: "en-US" },
];

const fallbackOrgTypeOptions = [
  { value: "company", label: "Company" },
  { value: "supplier", label: "Supplier" },
  { value: "ngo", label: "NGO" },
  { value: "regulatory", label: "Regulatory" },
  { value: "service_provider", label: "Service Provider" },
];

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type ProcedureType = "grievance" | "whistleblowing";

type FormState = {
  formCountry: string;
  formLanguage: string;
  inputLanguage: string;
  useDifferentInputLanguage: boolean;
  formType: "text" | "audio";
  procedureType: ProcedureType;
  acceptPrivacy: boolean;
  acceptDataShare: boolean;
  acceptDataTransfer: boolean;
  acceptSensitive: boolean;
  acceptProcedureRules: boolean;
  isAnonymous: boolean;
  reporterEmail: string;
  reporterPassword: string;
  reporterName: string;
  reporterPhone: string;
  reporterCountry: string;
  reporterAge: string;
  reporterGender: string;
  reportingForSomeoneElse: boolean;
  representativeRelation: string;
  representativeReason: string;
  representedEmail: string;
  representedPassword: string;
  representedName: string;
  representedPhone: string;
  incidentCompany: string;
  incidentCompanyEmployment: string;
  worksiteId: string;
  worksitedEmployee: string;
  ngoRepresentation: "yes" | "no" | "";
  ngoName: string;
  ngoContact: string;
  ngoSupportDetails: string;
  alertDirectCustomers: "yes" | "no" | "";
  directCustomerTargets: string[];
  alertIndirectCustomers: "yes" | "no" | "";
  indirectCustomerTargets: string[];
  incidentType: "violation" | "risk" | "both" | "";
  subject: string;
  description: string;
  incidentStartDate: string;
  incidentStartTime: string;
  incidentIsContinuing: boolean;
  incidentEndDate: string;
  incidentEndTime: string;
  addressedBefore: "yes" | "no" | "";
  legalStepsTaken: "yes" | "no" | "";
  legalStepsDetails: string;
  riskCategory: string;
  riskSubCategory: string;
  remedy: string;
};

const initialState: FormState = {
  formCountry: "",
  formLanguage: "",
  inputLanguage: "",
  useDifferentInputLanguage: false,
  formType: "text",
  procedureType: "grievance",
  acceptPrivacy: false,
  acceptDataShare: false,
  acceptDataTransfer: false,
  acceptSensitive: false,
  acceptProcedureRules: false,
  isAnonymous: true,
  reporterEmail: "",
  reporterPassword: "",
  reporterName: "",
  reporterPhone: "",
  reporterCountry: "",
  reporterAge: "",
  reporterGender: "",
  reportingForSomeoneElse: false,
  representativeRelation: "",
  representativeReason: "",
  representedEmail: "",
  representedPassword: "",
  representedName: "",
  representedPhone: "",
  incidentCompany: "",
  incidentCompanyEmployment: "",
  worksiteId: "",
  worksitedEmployee: "",
  ngoRepresentation: "",
  ngoName: "",
  ngoContact: "",
  ngoSupportDetails: "",
  alertDirectCustomers: "",
  directCustomerTargets: [],
  alertIndirectCustomers: "",
  indirectCustomerTargets: [],
  incidentType: "",
  subject: "",
  description: "",
  incidentStartDate: "",
  incidentStartTime: "",
  incidentIsContinuing: false,
  incidentEndDate: "",
  incidentEndTime: "",
  addressedBefore: "",
  legalStepsTaken: "",
  legalStepsDetails: "",
  riskCategory: "",
  riskSubCategory: "",
  remedy: "",
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
      reset: (id?: number) => void;
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

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidPhone = (value: string) =>
  value.trim() === "" || /^[+()0-9\s-]{6,}$/.test(value.trim());

const isValidAge = (value: string) => {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 120;
};

const isValidEmployeeCount = (value: string) =>
  value.trim() === "" || /^\d+$/.test(value.trim());

const isValidUrl = (value: string) =>
  value.trim() === "" || /^https?:\/\//i.test(value.trim());

const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");

const generateReportCode = () => `WB-${Math.floor(100000 + Math.random() * 900000)}`;

const readDeepString = (obj: unknown, path: string): string | null => {
  if (!obj || typeof obj !== "object") return null;
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key];
  }, obj);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export default function ReportNewPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showWorksiteModal, setShowWorksiteModal] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRendered, setCaptchaRendered] = useState(false);
  const captchaWidgetId = useRef<number | null>(null);
  const [attachments, setAttachments] = useState<(File | null)[]>([null, null, null]);
  const formSectionRef = useRef<HTMLElement | null>(null);

  const [countryOptions, setCountryOptions] = useState<CountryOption[]>(fallbackCountries);
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>(fallbackLanguages);
  const [countryLanguageMap, setCountryLanguageMap] = useState<Record<string, string[]>>({});
  const [orgOptions, setOrgOptions] = useState<OrganisationOption[]>([]);
  const [orgTypeOptions, setOrgTypeOptions] = useState(fallbackOrgTypeOptions);
  const [worksiteOptions, setWorksiteOptions] = useState<WorksiteOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<SubCategoryOption[]>([]);
  const [directRelationshipOptions, setDirectRelationshipOptions] = useState<RelatedOrgOption[]>([]);
  const [indirectRelationshipOptions, setIndirectRelationshipOptions] = useState<RelatedOrgOption[]>([]);
  const [intakeCopy, setIntakeCopy] = useState<IntakeCopyMap>({});
  const [easyReadMode, setEasyReadMode] = useState(false);
  const [audioMode, setAudioMode] = useState(true);
  const [showFieldHelp, setShowFieldHelp] = useState(true);
  const [showInlineHelp, setShowInlineHelp] = useState(true);
  const [activeAudioTextId, setActiveAudioTextId] = useState<string | null>(null);
  const [activeFieldHelp, setActiveFieldHelp] = useState<FieldHelpState | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: "",
    organization_type: "",
    country: "",
    city: "",
    website: "",
    address: "",
    contact_info: "",
    legal_type: "",
    employees_number: "",
    company_code: "",
  });
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  const [worksiteForm, setWorksiteForm] = useState({
    name: "",
    address: "",
    city_code: "",
    country: "",
  });
  const [worksiteErrors, setWorksiteErrors] = useState<Record<string, string>>({});

  const generatedCredentials = useMemo(() => {
    const id = Math.floor(100000 + Math.random() * 900000);
    const pass = Math.random().toString(36).slice(-10);
    return {
      email: `wb${id}@anon.mywhitebox.eu`,
      password: pass,
    };
  }, []);

  const selectedFormLanguageCode = useMemo(
    () =>
      languageOptions.find((item) => item.id === form.formLanguage)?.code?.toLowerCase() ??
      "en",
    [languageOptions, form.formLanguage]
  );

  const getLanguageCandidates = useCallback((rawCode: string) => {
    const normalized = (rawCode || "").trim().toLowerCase();
    const aliasMap: Record<string, string[]> = {
      en: ["en", "english", "en-us", "en-gb"],
      am: ["am", "amh", "amharic"],
      bn: ["bn", "bengali", "bangla"],
      km: ["km", "khmer"],
      zh: ["zh", "chinese", "zh-cn", "zh-tw"],
      hi: ["hi", "hindi"],
      ta: ["ta", "tamil"],
      mr: ["mr", "marathi"],
      or: ["or", "oriya", "odia"],
      tr: ["tr", "turkish"],
      ar: ["ar", "arabic"],
      vi: ["vi", "vietnamese"],
    };

    if (!normalized) return ["en"];

    const candidates = new Set<string>([normalized]);
    const short = normalized.split("-")[0];
    if (short) candidates.add(short);

    Object.entries(aliasMap).forEach(([canonical, aliases]) => {
      if (aliases.includes(normalized) || aliases.includes(short)) {
        candidates.add(canonical);
        aliases.forEach((alias) => candidates.add(alias));
      }
    });

    return Array.from(candidates);
  }, []);
  const selectedInputLanguageCode = useMemo(
    () =>
      languageOptions.find((item) => item.id === form.inputLanguage)?.code?.toLowerCase() ??
      selectedFormLanguageCode,
    [languageOptions, form.inputLanguage, selectedFormLanguageCode]
  );

  const t = useCallback((key: string, fallback: string) => {
    const direct = readDeepString(intakeCopy, key);
    if (direct) return direct;

    const languageCandidates = getLanguageCandidates(selectedFormLanguageCode);
    const paths: string[] = [];
    languageCandidates.forEach((code) => {
      paths.push(`${code}.${key}`);
      paths.push(`languages.${code}.${key}`);
      paths.push(`i18n.${code}.${key}`);
      paths.push(`labels.${code}.${key}`);
      paths.push(`help.${code}.${key}`);
      paths.push(`system.${code}.${key}`);
    });

    for (const path of paths) {
      const resolved = readDeepString(intakeCopy, path);
      if (resolved) return resolved;
    }
    return fallback;
  }, [getLanguageCandidates, intakeCopy, selectedFormLanguageCode]);

  const helpText = (key: string, standard: string, easy: string) =>
    t(key, easyReadMode ? easy : standard);

  const renderInlineHelp = (key: string, standard: string, easy: string) => {
    if (!showInlineHelp) return null;
    return (
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {helpText(`inline_${key}`, standard, easy)}
      </p>
    );
  };

  const toTextId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "field_help";

  const buildFieldHelp = (
    key: string,
    titleFallback: string,
    standardFallback: string,
    easyFallback: string
  ): FieldHelpState => ({
    title: t(`${key}_title`, titleFallback),
    standard: t(`${key}_standard`, standardFallback),
    easy: t(`${key}_easy`, easyFallback),
  });

  const resolveHelpByText = (raw: string): FieldHelpState => {
    const text = raw.toLowerCase();
    if (text.includes("captcha")) {
      return buildFieldHelp(
        "field_help_captcha",
        "Captcha verification",
        "Complete the captcha to confirm this submission is created by a real user before continuing.",
        "Please complete the captcha first."
      );
    }
    if (text.includes("procedure")) {
      return buildFieldHelp(
        "field_help_procedure",
        "Procedure type",
        "Choose the correct procedure. Use Grievance for rights and workplace concerns, and Whistleblowing for misconduct or fraud reporting.",
        "Pick the process that best fits your report."
      );
    }
    if (text.includes("anonymous")) {
      return buildFieldHelp(
        "field_help_anonymous",
        "Anonymous reporting",
        "Enable anonymous mode if you do not want to share your identity. Keep your generated email/password to track updates later.",
        "Turn this on if you want to stay anonymous."
      );
    }
    if (text.includes("privacy")) {
      return buildFieldHelp(
        "field_help_privacy",
        "Privacy and consent",
        "Review each consent item and tick all required checkboxes. The report cannot proceed without mandatory policy acceptance.",
        "Please read and accept all required policy checkboxes."
      );
    }
    if (text.includes("country")) {
      return buildFieldHelp(
        "field_help_country",
        "Country",
        "Select the country linked to this report, reporter profile, or incident location. This affects language, routing, and policy rules.",
        "Choose the right country for this report."
      );
    }
    if (text.includes("language")) {
      return buildFieldHelp(
        "field_help_language",
        "Language",
        "Choose the language for labels and messages. If input language differs, enable the separate input option and select it too.",
        "Choose the language you want to read and write in."
      );
    }
    if (text.includes("email")) {
      return buildFieldHelp(
        "field_help_email",
        "Email",
        "Use an email you can access. It is used to sign in, receive updates, and recover access to your report.",
        "Enter your working email address."
      );
    }
    if (text.includes("password")) {
      return buildFieldHelp(
        "field_help_password",
        "Password",
        "Create a secure password for report access. Use at least one number and one special character if possible.",
        "Create a strong password and save it."
      );
    }
    if (text.includes("phone")) {
      return buildFieldHelp(
        "field_help_phone",
        "Phone",
        "Add a phone number including country code if you are open to phone follow-up. Leave blank if not applicable.",
        "Add your phone number if you want call contact."
      );
    }
    if (text.includes("age")) {
      return buildFieldHelp(
        "field_help_age",
        "Age",
        "Provide age as a number. This helps triage vulnerable group handling and safeguarding workflows where needed.",
        "Type age as a number (example: 24)."
      );
    }
    if (text.includes("gender")) {
      return buildFieldHelp(
        "field_help_gender",
        "Gender",
        "Select the gender option that best matches the reporter or represented person. You may leave it blank if unavailable.",
        "Choose gender if you know it."
      );
    }
    if (text.includes("represent")) {
      return buildFieldHelp(
        "field_help_representation",
        "Representation details",
        "If you report on behalf of someone else, explain your relationship and why you are submitting this case.",
        "Tell us who you represent and why."
      );
    }
    if (text.includes("company")) {
      return buildFieldHelp(
        "field_help_company",
        "Company",
        "Select the reported company accurately. This determines ownership, routing, visibility, and which admins receive the case.",
        "Choose the company this report is about."
      );
    }
    if (text.includes("worksite")) {
      return buildFieldHelp(
        "field_help_worksite",
        "Worksite",
        "Choose the specific worksite where the incident happened. If no worksite exists, add one before continuing.",
        "Pick the location where it happened."
      );
    }
    if (text.includes("ngo")) {
      return buildFieldHelp(
        "field_help_ngo",
        "NGO Representation",
        "Indicate whether an NGO is involved. If yes, provide NGO name, contact, and what support or representation is given.",
        "Tell us if an NGO is helping and add their details."
      );
    }
    if (text.includes("direct") || text.includes("indirect")) {
      return buildFieldHelp(
        "field_help_relationship_alerts",
        "Relationship Alerts",
        "Choose if direct or indirect customer/supplier organizations should be alerted. Select specific target organizations where required.",
        "Pick who should receive alerts."
      );
    }
    if (text.includes("incident")) {
      return buildFieldHelp(
        "field_help_incident",
        "Incident",
        "Describe what happened, when it started, whether it is ongoing, and any key context needed for investigation.",
        "Explain what happened and when it happened."
      );
    }
    if (text.includes("subject")) {
      return buildFieldHelp(
        "field_help_subject",
        "Subject",
        "Write a short, factual title that summarizes the core issue for quick triage and search.",
        "Write a short title for this report."
      );
    }
    if (text.includes("description")) {
      return buildFieldHelp(
        "field_help_description",
        "Description",
        "Describe the issue with concrete facts: actors involved, timeline, what evidence exists, and who is affected.",
        "Explain the issue clearly and include key details."
      );
    }
    if (text.includes("date") || text.includes("time")) {
      return buildFieldHelp(
        "field_help_datetime",
        "Date and time",
        "Provide start/end dates and times as accurately as possible. If unknown, provide the closest estimate in description.",
        "Add when the incident started and ended."
      );
    }
    if (text.includes("risk") || text.includes("category")) {
      return buildFieldHelp(
        "field_help_risk",
        "Risk Classification",
        "Select the risk category and sub-category that best matches the issue. This supports triage workflow and reporting analytics.",
        "Choose the risk type that best matches this case."
      );
    }
    if (text.includes("legal")) {
      return buildFieldHelp(
        "field_help_legal",
        "Legal Steps",
        "Indicate whether legal or formal complaint steps were already taken and summarize outcomes if available.",
        "Tell us if any legal action was already taken."
      );
    }
    if (text.includes("remedy")) {
      return buildFieldHelp(
        "field_help_remedy",
        "Suggested Remedy",
        "Suggest practical remediation actions that could resolve the issue, protect affected people, and prevent recurrence.",
        "Write what should be done to fix this problem."
      );
    }
    if (text.includes("file") || text.includes("attachment")) {
      return buildFieldHelp(
        "field_help_attachments",
        "Attachments",
        "Upload supporting files (photos, documents, recordings) that help validate and investigate the report.",
        "Add files that support your report."
      );
    }
    return buildFieldHelp(
      "field_help_default",
      "Field Help",
      "Fill this field with accurate and complete information so the case can be processed without delay.",
      "Complete this field before moving to the next step."
    );
  };

  const getElementSpeechText = (target: EventTarget | null): string => {
    if (!(target instanceof HTMLElement)) return "";
    const control = target.closest("input,textarea,select,button,label,p,h1,h2,h3,h4,legend");
    if (!control) return "";

    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      const placeholder = control.placeholder?.trim() ?? "";
      const labelInParent = control.closest("label")?.textContent?.trim() ?? "";
      const id = control.id;
      const labelByFor = id
        ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() ?? ""
        : "";
      const value = control.value?.trim() ?? "";
      return [labelInParent || labelByFor, placeholder, value].filter(Boolean).join(" ").trim();
    }

    if (control instanceof HTMLSelectElement) {
      const selected = control.options[control.selectedIndex]?.text ?? "";
      const labelInParent = control.closest("label")?.textContent?.trim() ?? "";
      const id = control.id;
      const labelByFor = id
        ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() ?? ""
        : "";
      return [labelInParent || labelByFor, selected].filter(Boolean).join(" ").trim();
    }

    return (control.textContent ?? "").trim();
  };

  const handleAudioAssist = (target: EventTarget | null) => {
    const text = getElementSpeechText(target);
    if (!text) return;
    const help = resolveHelpByText(text);
    setActiveFieldHelp(help);
    playFormText(toTextId(text), text);
  };

  const handleAudioAssistChange = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    if (target instanceof HTMLInputElement) {
      if (target.type === "checkbox" || target.type === "radio") {
        handleAudioAssist(target);
      }
      return;
    }
    if (target instanceof HTMLSelectElement) {
      handleAudioAssist(target);
    }
  };

  const playFormText = async (textId: string, textValue: string) => {
    if (!audioMode || !textValue.trim()) return;
    setActiveAudioTextId(textId);
    try {
      const languageCode = selectedInputLanguageCode || "en";
      const { data } = await supabase
        .from("Playbacks")
        .select("id,audio_url,text_content,language,text_id")
        .eq("text_id", textId)
        .eq("language", languageCode)
        .limit(1)
        .maybeSingle<AudioAssetRow>();

      if (data?.audio_url) {
        const audio = new Audio(data.audio_url);
        await audio.play();
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(textValue);
        utterance.lang = languageCode;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

      if (!data) {
        const generatedId = Date.now();
        await supabase.from("Playbacks").insert({
          id: generatedId,
          text_id: textId,
          text_content: textValue,
          language: languageCode,
          audio_url: null,
        });
      }
    } catch {
      // Intentionally silent: audio must not block intake submission.
    } finally {
      setTimeout(() => setActiveAudioTextId((prev) => (prev === textId ? null : prev)), 600);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      const [
        { data: countryRows },
        { data: languageRows },
        { data: countryLanguageRows },
        { data: orgRows },
        { data: allOrgRows },
        { data: orgTypeRows },
        { data: categoryRows },
        { data: subCategoryRows },
        { data: intakeCopySetting },
      ] = await Promise.all([
        supabase.from("countries").select("country_id,country_name").order("country_name"),
        supabase.from("languages").select("language_id,language_name,language_code").order("language_name"),
        supabase.from("country_languages").select("country_id,language_id"),
        supabase.rpc("get_intake_organizations_all"),
        supabase.rpc("get_intake_organizations"),
        supabase
          .from("organization_types")
          .select("type_key,label,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order")
          .order("label"),
        supabase.from("report_categories").select("category_id,name").order("name"),
        supabase.from("report_sub_categories").select("sub_category_id,name,category_id").order("name"),
        supabase.from("platform_settings").select("value").eq("key", "intake_i18n_copy").maybeSingle(),
      ]);

      if (!isMounted) return;

      const nextCountries =
        countryRows?.map((row) => ({
          id: String(row.country_id),
          name: row.country_name,
        })) ?? [];

      const nextLanguages =
        (
          languageRows?.map((row) => ({
            id: String(row.language_id),
            name: row.language_name,
            code: row.language_code,
          })) ?? []
        ).sort((a, b) => {
          const aIsEnglish = isEnglishLanguage(a);
          const bIsEnglish = isEnglishLanguage(b);
          if (aIsEnglish && !bIsEnglish) return -1;
          if (!aIsEnglish && bIsEnglish) return 1;
          return a.name.localeCompare(b.name);
        });

      const nextMap: Record<string, string[]> = {};
      (countryLanguageRows ?? []).forEach((row) => {
        const countryId = String(row.country_id);
        const languageId = String(row.language_id);
        if (!nextMap[countryId]) {
          nextMap[countryId] = [];
        }
        nextMap[countryId].push(languageId);
      });

      const mergedOrgMap = new Map<number, OrganisationOption>();
      const allIntakeOrgs = (orgRows as IntakeOrganizationRow[] | null) ?? [];
      const fallbackOrgs = (allOrgRows as IntakeOrganizationRow[] | null) ?? [];
      [...allIntakeOrgs, ...fallbackOrgs].forEach((org) => {
        if (!org?.organization_id || !org?.name) return;
        mergedOrgMap.set(org.organization_id, {
          id: org.organization_id,
          name: org.name,
          country: org.country,
          city: org.city,
          website: org.website,
          type: org.organization_type,
        });
      });
      const nextOrgs = Array.from(mergedOrgMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const nextCategories =
        categoryRows?.map((cat) => ({
          id: cat.category_id,
          name: cat.name,
        })) ?? [];
      const nextOrgTypes =
        orgTypeRows?.map((item) => ({
          value: item.type_key,
          label: item.label,
        })) ?? [];

      const nextSubCategories =
        subCategoryRows?.map((sub) => ({
          id: sub.sub_category_id,
          name: sub.name,
          categoryId: sub.category_id,
        })) ?? [];

      if (nextCountries.length) setCountryOptions(nextCountries);
      if (nextLanguages.length) setLanguageOptions(nextLanguages);
      if (Object.keys(nextMap).length) setCountryLanguageMap(nextMap);
      setOrgOptions(nextOrgs);
      if (nextOrgTypes.length) setOrgTypeOptions(nextOrgTypes);
      setCategoryOptions(nextCategories);
      setSubCategoryOptions(nextSubCategories);
      if (
        intakeCopySetting &&
        typeof intakeCopySetting.value === "object" &&
        intakeCopySetting.value !== null
      ) {
        setIntakeCopy(intakeCopySetting.value as IntakeCopyMap);
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadWorksites = async () => {
      const orgId = Number(form.incidentCompany);
      if (!orgId) {
        setWorksiteOptions([]);
        setForm((prev) => ({ ...prev, worksiteId: "" }));
        return;
      }

      const { data: worksites } = await supabase
        .from("worksites")
        .select("worksite_id,name,country,city_code")
        .eq("organization_id", orgId)
        .order("name");

      const nextWorksites =
        worksites?.map((site) => ({
          id: site.worksite_id,
          name: site.name,
          country: site.country,
          city: site.city_code,
        })) ?? [];

      setWorksiteOptions(nextWorksites);
      setForm((prev) => ({
        ...prev,
        worksiteId: prev.worksiteId && nextWorksites.some((site) => String(site.id) === prev.worksiteId)
          ? prev.worksiteId
          : "",
      }));
    };

    loadWorksites();
  }, [form.incidentCompany]);

  useEffect(() => {
    const loadRelatedOrganizations = async () => {
      const orgId = Number(form.incidentCompany);
      if (!orgId) {
        setDirectRelationshipOptions([]);
        setIndirectRelationshipOptions([]);
        setForm((prev) => ({
          ...prev,
          directCustomerTargets: [],
          indirectCustomerTargets: [],
        }));
        return;
      }

      const { data: relationshipRows } = await supabase
        .from("organization_relationships")
        .select(
          "relationship_id,parent_org_id,child_org_id,relationship_types(name),parent_org:organisations!organization_relationships_parent_org_id_fkey(organization_id,name),child_org:organisations!organization_relationships_child_org_id_fkey(organization_id,name)"
        )
        .or(`parent_org_id.eq.${orgId},child_org_id.eq.${orgId}`)
        .order("relationship_id", { ascending: false });

      const options: RelatedOrgOption[] = (relationshipRows ?? [])
        .map((row) => {
          const parent = Array.isArray(row.parent_org) ? row.parent_org[0] : row.parent_org;
          const child = Array.isArray(row.child_org) ? row.child_org[0] : row.child_org;
          const relationType = Array.isArray(row.relationship_types)
            ? row.relationship_types[0]
            : row.relationship_types;
          const isIncidentParent = row.parent_org_id === orgId;
          const relatedOrg = isIncidentParent ? child : parent;
          if (!relatedOrg?.organization_id || !relatedOrg?.name) return null;
          const typeName = (relationType?.name ?? "").toLowerCase();
          const relationKind: RelatedOrgOption["relationKind"] = typeName.includes("indirect")
            ? "indirect"
            : typeName.includes("direct")
              ? "direct"
              : "other";
          return {
            id: relatedOrg.organization_id,
            name: relatedOrg.name,
            relationTypeName: relationType?.name ?? "Relationship",
            relationKind,
          };
        })
        .filter((item): item is RelatedOrgOption => Boolean(item));

      const uniqueById = Array.from(
        new Map(options.map((item) => [item.id, item])).values()
      );
      const direct = uniqueById.filter((item) => item.relationKind !== "indirect");
      const indirect = uniqueById.filter((item) => item.relationKind !== "direct");

      setDirectRelationshipOptions(direct);
      setIndirectRelationshipOptions(indirect);
      setForm((prev) => ({
        ...prev,
        directCustomerTargets: prev.directCustomerTargets.filter((id) =>
          direct.some((item) => String(item.id) === id)
        ),
        indirectCustomerTargets: prev.indirectCustomerTargets.filter((id) =>
          indirect.some((item) => String(item.id) === id)
        ),
      }));
    };

    loadRelatedOrganizations();
  }, [form.incidentCompany]);

  const countryNameById = useMemo(
    () => Object.fromEntries(countryOptions.map((country) => [country.id, country.name])),
    [countryOptions]
  );

  const languageNameById = useMemo(
    () => Object.fromEntries(languageOptions.map((lang) => [lang.id, lang.name])),
    [languageOptions]
  );

  const orgNameById = useMemo(
    () => Object.fromEntries(orgOptions.map((org) => [String(org.id), org.name])),
    [orgOptions]
  );

  const worksiteNameById = useMemo(
    () => Object.fromEntries(worksiteOptions.map((site) => [String(site.id), site.name])),
    [worksiteOptions]
  );

  const categoryNameById = useMemo(
    () => Object.fromEntries(categoryOptions.map((cat) => [String(cat.id), cat.name])),
    [categoryOptions]
  );

  const subCategoryNameById = useMemo(
    () => Object.fromEntries(subCategoryOptions.map((sub) => [String(sub.id), sub.name])),
    [subCategoryOptions]
  );

  const availableLanguages = useMemo(() => {
    if (!form.formCountry) return languageOptions;
    const ids = countryLanguageMap[form.formCountry];
    if (!ids?.length) return languageOptions;
    return languageOptions.filter((lang) => ids.includes(lang.id));
  }, [form.formCountry, languageOptions, countryLanguageMap]);

  const defaultLanguage = useMemo(() => {
    if (!availableLanguages.length) return null;
    const english = availableLanguages.find((lang) => isEnglishLanguage(lang));
    return english ?? availableLanguages[0];
  }, [availableLanguages]);

  useEffect(() => {
    if (!defaultLanguage) return;
    setForm((prev) => {
      const nextFormLanguage = prev.formLanguage || defaultLanguage.id;
      const nextInputLanguage = prev.inputLanguage || defaultLanguage.id;
      if (nextFormLanguage === prev.formLanguage && nextInputLanguage === prev.inputLanguage) {
        return prev;
      }
      return {
        ...prev,
        formLanguage: nextFormLanguage,
        inputLanguage: nextInputLanguage,
      };
    });
  }, [defaultLanguage]);

  useEffect(() => {
    if (!availableLanguages.length) return;
    const availableIds = new Set(availableLanguages.map((lang) => lang.id));
    const fallbackLanguageId = defaultLanguage?.id ?? availableLanguages[0].id;
    setForm((prev) => {
      const nextFormLanguage =
        prev.formLanguage && availableIds.has(prev.formLanguage)
          ? prev.formLanguage
          : fallbackLanguageId;
      const nextInputLanguage =
        prev.inputLanguage && availableIds.has(prev.inputLanguage)
          ? prev.inputLanguage
          : fallbackLanguageId;
      if (nextFormLanguage === prev.formLanguage && nextInputLanguage === prev.inputLanguage) {
        return prev;
      }
      return {
        ...prev,
        formLanguage: nextFormLanguage,
        inputLanguage: nextInputLanguage,
      };
    });
  }, [availableLanguages, defaultLanguage]);

  useEffect(() => {
    const root = formSectionRef.current;
    if (!root) return;

    const interactive = root.querySelectorAll<HTMLElement>(
      "label,input,textarea,select,button,p,h1,h2,h3,h4,legend"
    );
    interactive.forEach((element) => {
      const text = getElementSpeechText(element) || (element.textContent ?? "").trim();
      if (!text) return;
      const help = resolveHelpByText(text);
      const description = easyReadMode ? help.easy : help.standard;
      element.setAttribute("title", description);
      element.setAttribute("data-help-text", description);
    });
  }, [stepIndex, easyReadMode, form.formLanguage, form.inputLanguage]);

  useEffect(() => {
    if (!form.isAnonymous) return;
    setForm((prev) => ({
      ...prev,
      reporterEmail: prev.reporterEmail || generatedCredentials.email,
      reporterPassword: prev.reporterPassword || generatedCredentials.password,
    }));
  }, [form.isAnonymous, generatedCredentials]);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || captchaRendered) return;

    const renderCaptcha = () => {
      const api =
        window.grecaptcha?.enterprise && typeof window.grecaptcha.enterprise.render === "function"
          ? window.grecaptcha.enterprise
          : window.grecaptcha && typeof window.grecaptcha.render === "function"
            ? window.grecaptcha
            : null;
      const container = document.getElementById("recaptcha-container");
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
    } else {
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
    }
  }, [captchaRendered]);

  useEffect(() => {
    setShowErrors(false);
    setFormErrors({});
  }, [stepIndex]);

  const step1Enabled = Boolean(captchaToken);

  const filteredSubCategories = useMemo(() => {
    if (!form.riskCategory) return [];
    return subCategoryOptions.filter(
      (sub) => String(sub.categoryId) === form.riskCategory
    );
  }, [form.riskCategory, subCategoryOptions]);

  const stepErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!step1Enabled) errors.captcha = t("error_captcha_required", "Complete the captcha to continue.");
      if (!form.formCountry) errors.formCountry = t("error_country_required", "Select a country.");
      if (!form.formLanguage) errors.formLanguage = t("error_form_language_required", "Select a form language.");
      if (form.useDifferentInputLanguage && !form.inputLanguage) {
        errors.inputLanguage = t("error_input_language_required", "Select an input language.");
      }
    }

    if (stepIndex === 1) {
      if (!form.acceptPrivacy) errors.acceptPrivacy = t("error_required", "Required.");
      if (!form.acceptDataShare) errors.acceptDataShare = t("error_required", "Required.");
      if (!form.acceptDataTransfer) errors.acceptDataTransfer = t("error_required", "Required.");
      if (!form.acceptSensitive) errors.acceptSensitive = t("error_required", "Required.");
      if (!form.acceptProcedureRules) errors.acceptProcedureRules = t("error_required", "Required.");
    }

    if (stepIndex === 2) {
      if (!form.isAnonymous) {
        if (!form.reporterEmail.trim()) {
          errors.reporterEmail = t("error_email_required", "Email is required.");
        } else if (!isValidEmail(form.reporterEmail)) {
          errors.reporterEmail = t("error_email_invalid", "Enter a valid email.");
        }
        if (!form.reporterPassword.trim()) {
          errors.reporterPassword = t("error_password_required", "Password is required.");
        }
        if (!isValidPhone(form.reporterPhone)) {
          errors.reporterPhone = t("error_phone_invalid", "Enter a valid phone number.");
        }
        if (!isValidAge(form.reporterAge)) {
          errors.reporterAge = t("error_age_invalid", "Enter a valid age.");
        }
      }
      if (form.reportingForSomeoneElse) {
        if (!form.representativeRelation.trim()) {
          errors.representativeRelation = t("error_relationship_required", "Relationship is required.");
        }
        if (!form.representativeReason.trim()) {
          errors.representativeReason = t("error_reason_required", "Reason is required.");
        }
        if (form.representedEmail && !isValidEmail(form.representedEmail)) {
          errors.representedEmail = t("error_email_invalid", "Enter a valid email.");
        }
        if (!isValidPhone(form.representedPhone)) {
          errors.representedPhone = t("error_phone_invalid", "Enter a valid phone number.");
        }
      }
    }

    if (stepIndex === 3) {
      if (!form.incidentCompany) errors.incidentCompany = t("error_company_required", "Select a company.");
      if (!form.incidentCompanyEmployment) {
        errors.incidentCompanyEmployment = t("error_option_required", "Select an option.");
      }
      if (worksiteOptions.length > 0 && !form.worksiteId) {
        errors.worksiteId = t("error_worksite_required", "Select a worksite.");
      }
      if (!form.worksitedEmployee) {
        errors.worksitedEmployee = t("error_option_required", "Select an option.");
      }
    }

    if (stepIndex === 4) {
      if (!form.ngoRepresentation) {
        errors.ngoRepresentation = t(
          "error_ngo_representation_required",
          "Select whether an NGO is representing this case."
        );
      }
      if (form.ngoRepresentation === "yes") {
        if (!form.ngoName.trim()) errors.ngoName = t("error_ngo_name_required", "NGO name is required.");
        if (!form.ngoContact.trim()) errors.ngoContact = t("error_contact_required", "Contact detail is required.");
        if (!form.ngoSupportDetails.trim()) {
          errors.ngoSupportDetails = t(
            "error_ngo_support_required",
            "Please describe the support provided by the NGO."
          );
        }
      }
    }

    if (stepIndex === 5) {
      if (!form.alertDirectCustomers) {
        errors.alertDirectCustomers = t(
          "error_direct_alert_required",
          "Select whether direct customers should be alerted."
        );
      }
      if (!form.alertIndirectCustomers) {
        errors.alertIndirectCustomers = t(
          "error_indirect_alert_required",
          "Select whether indirect customers should be alerted."
        );
      }
      if (form.alertDirectCustomers === "yes" && form.directCustomerTargets.length === 0) {
        errors.directCustomerTargets = t(
          "error_direct_target_required",
          "Select at least one direct customer target."
        );
      }
      if (form.alertIndirectCustomers === "yes" && form.indirectCustomerTargets.length === 0) {
        errors.indirectCustomerTargets = t(
          "error_indirect_target_required",
          "Select at least one indirect customer target."
        );
      }
    }

    if (stepIndex === 6) {
      if (!form.incidentType) errors.incidentType = t("error_incident_type_required", "Select incident type.");
      if (!form.subject.trim()) errors.subject = t("error_subject_required", "Subject is required.");
      if (!form.description.trim()) errors.description = t("error_description_required", "Description is required.");
      if (!form.incidentStartDate) errors.incidentStartDate = t("error_incident_start_required", "Incident start date is required.");
      if (!form.riskCategory) errors.riskCategory = t("error_category_required", "Select a category.");
      if (!form.addressedBefore) {
        errors.addressedBefore = t(
          "error_addressed_before_required",
          "Indicate if the problem was addressed before."
        );
      }
      if (!form.legalStepsTaken) {
        errors.legalStepsTaken = t("error_legal_steps_required", "Indicate if legal steps were taken.");
      }
      if (form.legalStepsTaken === "yes" && !form.legalStepsDetails.trim()) {
        errors.legalStepsDetails = t("error_legal_steps_details_required", "Provide the legal steps taken.");
      }
      if (!form.incidentIsContinuing && form.incidentEndDate && form.incidentEndDate < form.incidentStartDate) {
        errors.incidentEndDate = t(
          "error_incident_end_before_start",
          "End date cannot be before the start date."
        );
      }
    }

    return errors;
  }, [
    form,
    stepIndex,
    step1Enabled,
    worksiteOptions.length,
    t,
  ]);

  const canContinue = useMemo(() => Object.keys(stepErrors).length === 0, [stepErrors]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const stepLabel = t(`step_${stepIndex + 1}_title`, steps[stepIndex]);


  const ensureReporterAuth = async () => {
    if (form.isAnonymous) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    if (sessionUser?.id) return sessionUser.id;

    if (!form.reporterEmail || !form.reporterPassword) return null;

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: form.reporterEmail,
        password: form.reporterPassword,
      });

    if (!signInError && signInData.user?.id) return signInData.user.id;

    if (signInError?.message?.toLowerCase().includes("invalid login credentials")) {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: form.reporterEmail,
          password: form.reporterPassword,
        });
      if (signUpError) throw signUpError;
      return signUpData.user?.id ?? null;
    }

    if (signInError) throw signInError;
    return null;
  };

  const uploadAttachments = async (reportCode: string) => {
    const files = attachments.filter(Boolean) as File[];
    if (!files.length) return [];

    const uploads = await Promise.all(
      files.map(async (file) => {
        const ext = file.name.split(".").pop() || "file";
        const path = `reports/${reportCode}/${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabase.storage
          .from("report-attachments")
          .upload(path, file, { upsert: false });
        if (error) throw error;
        return data?.path ?? path;
      })
    );

    return uploads;
  };

  const submitReport = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const authId = await ensureReporterAuth();
      const reportCode = generateReportCode();
      const incidentCompanyId = Number(form.incidentCompany);
      const selectedCompany = orgOptions.find((org) => String(org.id) === form.incidentCompany);
      const selectedWorksite = worksiteOptions.find(
        (site) => String(site.id) === form.worksiteId
      );
      const formCountryName = countryNameById[form.formCountry] || form.formCountry || null;
      const reporterCountryName =
        countryNameById[form.reporterCountry] || form.reporterCountry || null;
      const formLanguageName = languageNameById[form.formLanguage] || form.formLanguage || null;
      const inputLanguageName = languageNameById[form.inputLanguage] || form.inputLanguage || null;

      const attachmentPaths = await uploadAttachments(reportCode);

      const reportPayload = {
        report_code: reportCode,
        title: form.subject.trim(),
        description: form.description.trim(),
        reported_org_id: incidentCompanyId,
        reporter_email: form.reporterEmail || null,
        reporter_password: form.reporterPassword || null,
        is_anonymous: form.isAnonymous,
        incident_date: form.incidentStartDate || null,
        incident_location: selectedWorksite?.name || null,
        country: formCountryName,
        event_country: formCountryName,
        suggested_remedy: form.remedy || null,
        legal_steps_taken: form.legalStepsTaken === "yes" ? form.legalStepsDetails : null,
        is_incident_is_continuing: form.incidentIsContinuing,
        risk_violation: form.incidentType || null,
        alert_direct_suppliers: form.alertDirectCustomers === "yes",
        alert_indirect_suppliers: form.alertIndirectCustomers === "yes",
        original_language: inputLanguageName,
        intake_version: "v1",
        intake_payload: {
          form_language: formLanguageName,
          input_language: inputLanguageName,
          form_country: formCountryName,
          reporter_country: reporterCountryName,
          form_type: form.formType,
          procedure_type: form.procedureType,
          incident_company_name: selectedCompany?.name || null,
          incident_company_employment: form.incidentCompanyEmployment,
          worksite_id: form.worksiteId ? Number(form.worksiteId) : null,
          worksite_name: selectedWorksite?.name || null,
          worksite_employee: form.worksitedEmployee,
          ngo_representation: form.ngoRepresentation || null,
          ngo_name: form.ngoName || null,
          ngo_contact: form.ngoContact || null,
          ngo_support_details: form.ngoSupportDetails || null,
          direct_customer_targets: form.directCustomerTargets.map((id) => Number(id)),
          indirect_customer_targets: form.indirectCustomerTargets.map((id) => Number(id)),
          incident_start_time: form.incidentStartTime || null,
          incident_end_date: form.incidentEndDate || null,
          incident_end_time: form.incidentEndTime || null,
          addressed_before: form.addressedBefore || null,
          representative: form.reportingForSomeoneElse
            ? {
                relation: form.representativeRelation,
                reason: form.representativeReason,
                represented_email: form.representedEmail || null,
                represented_name: form.representedName || null,
                represented_phone: form.representedPhone || null,
              }
            : null,
          attachments: attachmentPaths,
        },
        auth_user_id: authId,
        reporter_display_name: form.reporterName || null,
        reporter_phone: form.reporterPhone || null,
        reporter_location: reporterCountryName,
        recaptcha_token: captchaToken,
      };

      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token || "";

      const invokeCreateReport = (token?: string) =>
        supabase.functions.invoke("create-report", {
          body: {
            ...reportPayload,
            risk_categories: form.riskCategory
              ? [
                  {
                    category_id: Number(form.riskCategory),
                    sub_category_id: form.riskSubCategory ? Number(form.riskSubCategory) : null,
                  },
                ]
              : [],
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

      let { data, error } = await invokeCreateReport(sessionToken || anonKey || undefined);

      if (
        error?.message?.toLowerCase().includes("invalid jwt") &&
        anonKey &&
        sessionToken !== anonKey
      ) {
        ({ data, error } = await invokeCreateReport(anonKey));
      }

      if (error) {
        let details = "";
        if (error.context) {
          const raw = await error.context.text();
          try {
            const parsed = JSON.parse(raw) as { error?: string };
            details = parsed.error ?? raw;
          } catch {
            details = raw;
          }
        }
        throw new Error(details || error.message);
      }

      if (form.isAnonymous && data && typeof data === "object") {
        const response = data as { reporter_email?: string; reporter_password?: string };
        if (response.reporter_email && response.reporter_password) {
          setForm((prev) => ({
            ...prev,
            reporterEmail: response.reporter_email || prev.reporterEmail,
            reporterPassword: response.reporter_password || prev.reporterPassword,
          }));
        }
      }

      setStepIndex(8);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("error_submit_failed", "Unable to submit report.");
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
      await submitReport();
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const saveCompany = async () => {
    const nextErrors: Record<string, string> = {};
    if (!companyForm.name.trim()) nextErrors.name = t("error_company_name_required", "Company name is required.");
    if (!companyForm.organization_type) nextErrors.organization_type = t("error_org_type_required", "Select organization type.");
    if (!companyForm.country) nextErrors.country = t("error_country_required", "Country is required.");
    if (!isValidUrl(companyForm.website)) nextErrors.website = t("error_url_invalid", "Enter a valid URL.");
    if (!isValidEmployeeCount(companyForm.employees_number)) {
      nextErrors.employees_number = t("error_employee_count_invalid", "Enter a valid employee count.");
    }

    setCompanyErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const { data, error } = await supabase
      .from("organisations")
      .insert({
        name: companyForm.name.trim(),
        organization_type: companyForm.organization_type,
        country: companyForm.country || null,
        city: companyForm.city || null,
        website: companyForm.website || null,
        address: companyForm.address || null,
        contact_info: companyForm.contact_info || null,
        legal_type: companyForm.legal_type || null,
        employees_number: companyForm.employees_number ? Number(companyForm.employees_number) : null,
        company_code: companyForm.company_code || null,
        is_claimed: false,
      })
      .select("organization_id,name,country,city,website,organization_type")
      .single();

    if (error || !data) {
      setCompanyErrors({ form: error?.message || t("error_company_save_failed", "Unable to save company.") });
      return;
    }

    const newOrg: OrganisationOption = {
      id: data.organization_id,
      name: data.name,
      country: data.country,
      city: data.city,
      website: data.website,
      type: data.organization_type,
    };

    setOrgOptions((prev) => [...prev, newOrg].sort((a, b) => a.name.localeCompare(b.name)));
    update("incidentCompany", String(newOrg.id));
    setShowCompanyModal(false);
    setCompanyForm({
      name: "",
      organization_type: "",
      country: "",
      city: "",
      website: "",
      address: "",
      contact_info: "",
      legal_type: "",
      employees_number: "",
      company_code: "",
    });
    setCompanyErrors({});
  };

  const saveWorksite = async () => {
    const nextErrors: Record<string, string> = {};
    const orgId = Number(form.incidentCompany);
    if (!orgId) nextErrors.organization = t("error_select_company_first", "Select a company first.");
    if (!worksiteForm.name.trim()) nextErrors.name = t("error_worksite_name_required", "Worksite name is required.");
    setWorksiteErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const { data, error } = await supabase
      .from("worksites")
      .insert({
        organization_id: orgId,
        name: worksiteForm.name.trim(),
        address: worksiteForm.address || null,
        city_code: worksiteForm.city_code || null,
        country: worksiteForm.country || null,
      })
      .select("worksite_id,name,country,city_code")
      .single();

    if (error || !data) {
      setWorksiteErrors({ form: error?.message || t("error_worksite_save_failed", "Unable to save worksite.") });
      return;
    }

    const newWorksite: WorksiteOption = {
      id: data.worksite_id,
      name: data.name,
      country: data.country,
      city: data.city_code,
    };

    setWorksiteOptions((prev) => [...prev, newWorksite].sort((a, b) => a.name.localeCompare(b.name)));
    update("worksiteId", String(newWorksite.id));
    setShowWorksiteModal(false);
    setWorksiteForm({
      name: "",
      address: "",
      city_code: "",
      country: "",
    });
    setWorksiteErrors({});
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
      <section
        ref={formSectionRef}
        className="rounded-3xl bg-white p-8 shadow-sm"
        onClickCapture={(event) => {
          if (event.target instanceof HTMLElement) {
            const clickedControl = event.target.closest("input,select,textarea,button,label");
            if (clickedControl) return;
          }
          handleAudioAssist(event.target);
        }}
        onChangeCapture={(event) => handleAudioAssistChange(event.target)}
        onFocusCapture={(event) => handleAudioAssist(event.target)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--wb-navy)]">
              {t("create_report_title", "Create report")}
            </p>
            <h1 className="font-display mt-2 text-3xl">{stepLabel}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {stepIndex + 1} / {steps.length}
            </p>
          </div>
          <div className="mr-3 flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={audioMode}
                onChange={(event) => setAudioMode(event.target.checked)}
              />
              {audioMode
                ? t("audio_mode_enabled", "Audio: On")
                : t("audio_mode_disabled", "Audio: Off")}
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showInlineHelp}
                onChange={(event) => setShowInlineHelp(event.target.checked)}
              />
              {showInlineHelp
                ? t("inline_help_enabled", "Inline help: On")
                : t("inline_help_disabled", "Inline help: Off")}
            </label>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                  index <= stepIndex
                    ? "bg-[var(--wb-navy)] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {index + 1}
              </span>
            ))}
          </div>
        </div>
        {showFieldHelp ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">
              {activeFieldHelp?.title ?? t("field_help_title", "Field help")}
            </p>
            <p className="mt-1">
              {activeFieldHelp
                ? easyReadMode
                  ? activeFieldHelp.easy
                  : activeFieldHelp.standard
                : t(
                    "field_help_click_hint",
                    "Click or focus any label/field. Every control provides contextual help and audio playback."
                  )}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          {stepIndex === 0 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t("captcha_title", "Captcha")}
                </p>
                <div className="mt-3" id="recaptcha-container" />
                {!RECAPTCHA_SITE_KEY ? (
                  <p className="mt-2 text-xs text-red-500">
                    {t("error_recaptcha_key_missing", "Missing reCAPTCHA site key.")}
                  </p>
                ) : null}
                {showErrors && formErrors.captcha ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.captcha}</p>
                ) : null}
              </div>

              <fieldset className="space-y-4" disabled={!step1Enabled}>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {t("country_label", "Country")}
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.formCountry}
                    onChange={(event) => update("formCountry", event.target.value)}
                  >
                    <option value="">{t("country_placeholder", "Select country")}</option>
                    {countryOptions.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {showErrors && formErrors.formCountry ? (
                    <p className="mt-2 text-xs text-rose-500">{formErrors.formCountry}</p>
                  ) : null}
                  {renderInlineHelp(
                    "form_country",
                    "Select the country where this case should be handled. This controls language options, legal routing, and triage assignment logic.",
                    "Choose the country for this report. It decides workflow and language."
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {t("form_language_label", "Form language")}
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.formLanguage}
                    onChange={(event) => update("formLanguage", event.target.value)}
                  >
                    {availableLanguages.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  {showErrors && formErrors.formLanguage ? (
                    <p className="mt-2 text-xs text-rose-500">{formErrors.formLanguage}</p>
                  ) : null}
                  {renderInlineHelp(
                    "form_language",
                    "This sets the display language for all labels, hints, and system messages in this intake form.",
                    "Choose the language you want to read in the form."
                  )}
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.useDifferentInputLanguage}
                    onChange={(event) => update("useDifferentInputLanguage", event.target.checked)}
                  />
                  {t(
                    "different_input_language_label",
                    "I want to use a different input language"
                  )}
                </label>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {t("input_language_label", "Input language")}
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.inputLanguage}
                    onChange={(event) => update("inputLanguage", event.target.value)}
                    disabled={!form.useDifferentInputLanguage}
                  >
                    {availableLanguages.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  {showErrors && formErrors.inputLanguage ? (
                    <p className="mt-2 text-xs text-rose-500">{formErrors.inputLanguage}</p>
                  ) : null}
                  {renderInlineHelp(
                    "input_language",
                    "Use this if the reporter will type answers in a language different from the displayed form language.",
                    "Choose the language you want to type your answers in."
                  )}
                </div>
              </fieldset>

              <fieldset disabled={!step1Enabled}>
                <p className="text-sm font-medium text-slate-700">
                  {t("procedure_type_label", "Procedure type")}
                </p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      type="radio"
                      checked={form.procedureType === "grievance"}
                      onChange={() => update("procedureType", "grievance")}
                    />
                    {t("procedure_grievance_option", "I want to file a Grievance Report")}
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-400">
                    <input type="radio" disabled />
                    {t(
                      "procedure_whistleblowing_option",
                      "I want to file a Whistleblowing Report"
                    )}
                  </label>
                  {form.procedureType === "grievance" ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                      {helpText(
                        "procedure_type_grievance_help",
                        "A grievance report is a complaint or tip about potential human-rights or environmental risks linked to a company or its supply chain. This helps responsible teams investigate, respond with remediation, and prevent recurrence. Reports may be filed by directly affected people or authorized representatives.",
                        "A grievance report is for human-rights or environmental problems. Use it to explain what happened so the case can be investigated and fixed."
                      )}
                    </div>
                  ) : null}
                  {renderInlineHelp(
                    "procedure_type",
                    "Choose the reporting procedure that best matches your case. If unsure, use Grievance and provide clear facts in the incident details step.",
                    "Pick the procedure that best matches your case."
                  )}
                </div>
              </fieldset>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {t("privacy_policy_title", "Privacy Policy")}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {t(
                    "privacy_policy_description",
                    "I have read and agree to the Privacy Policy set forth in the legal documentation (https://mercantilebx.com/docs/)"
                  )}
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {t("grievance_policy_title", "Grievance Procedure Policy")}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {t(
                    "grievance_policy_description",
                    "I have read and agree to the Confirmation of Grievance Procedure Policy (https://mercantilebx.com/docs/)"
                  )}
                </p>
              </div>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptPrivacy}
                  onChange={(event) => update("acceptPrivacy", event.target.checked)}
                />
                {t(
                  "consent_privacy_label",
                  "By marking this box, you confirm that you have read, comprehend, and consent to the Privacy Policy."
                )}
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptDataShare}
                  onChange={(event) => update("acceptDataShare", event.target.checked)}
                />
                {t(
                  "consent_data_share_label",
                  "By marking this box, you give us the authority to share your provided data with third parties, including reported companies, alerted business customers, NGOs, and data processors."
                )}
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptDataTransfer}
                  onChange={(event) => update("acceptDataTransfer", event.target.checked)}
                />
                {t(
                  "consent_data_transfer_label",
                  "By marking this box, you grant permission to transmit your data outside of your jurisdiction."
                )}
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptSensitive}
                  onChange={(event) => update("acceptSensitive", event.target.checked)}
                />
                {t(
                  "consent_sensitive_data_label",
                  "If you provide special categories of personal data, you explicitly consent to its processing in accordance with GDPR Article 9(2)(a)."
                )}
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptProcedureRules}
                  onChange={(event) => update("acceptProcedureRules", event.target.checked)}
                />
                {t(
                  "consent_procedure_rules_label",
                  "By marking this box, you confirm that you have read, comprehended, and consented to the Procedural Rules."
                )}
              </label>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {t("stakeholder_details_title", "Stakeholder Details")}
                </p>
                <p className="mt-2">
                  {t(
                    "stakeholder_details_description",
                    "If you would like to, you can fill in your personal information here. This information might help resolve your issue. Visit our website for more information on the legal protection from reprisals for reporters. If you want to report anonymously, a new anonymous account is automatically created to handle your report. The anonymous account ensures that no information about you is linked to the report. This process maintains your privacy while allowing the issue to be addressed. Please refer to our privacy policy for more information."
                  )}
                </p>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(event) => update("isAnonymous", event.target.checked)}
                />
                <span>
                  {t(
                    "anonymous_login_details_label",
                    "I want to use anonymous login details (an email will be generated for you)."
                  )}
                </span>
              </label>
              {renderInlineHelp(
                "anonymous_mode",
                "Keep this enabled to hide personal identity from the case record while still allowing secure follow-up.",
                "Turn this on if you want to stay anonymous."
              )}

              {form.isAnonymous ? (
                <div className="space-y-4">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterEmail}
                    readOnly
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterPassword}
                    readOnly
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("reporter_email_placeholder", "Email")}
                      value={form.reporterEmail}
                      onChange={(event) => update("reporterEmail", event.target.value)}
                    />
                    {showErrors && formErrors.reporterEmail ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterEmail}</p>
                    ) : null}
                    {renderInlineHelp(
                      "reporter_email",
                      "Enter an email you can access. You will use it to log in and receive case updates.",
                      "Enter your working email."
                    )}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("reporter_password_placeholder", "Password")}
                      type="password"
                      value={form.reporterPassword}
                      onChange={(event) => update("reporterPassword", event.target.value)}
                    />
                    {showErrors && formErrors.reporterPassword ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterPassword}</p>
                    ) : null}
                    {renderInlineHelp(
                      "reporter_password",
                      "Create a secure password to protect report access. Avoid simple or reused passwords.",
                      "Create and remember a secure password."
                    )}
                  </div>
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder={t("reporter_full_name_placeholder", "Full name")}
                    value={form.reporterName}
                    onChange={(event) => update("reporterName", event.target.value)}
                  />
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("phone_number_placeholder", "Phone number")}
                      inputMode="tel"
                      value={form.reporterPhone}
                      onChange={(event) => update("reporterPhone", event.target.value)}
                    />
                    {showErrors && formErrors.reporterPhone ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterPhone}</p>
                    ) : null}
                    {renderInlineHelp(
                      "reporter_phone",
                      "Optional: include phone with country code if you are open to call follow-up.",
                      "Add phone number if you want calls."
                    )}
                  </div>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterCountry}
                    onChange={(event) => update("reporterCountry", event.target.value)}
                  >
                    <option value="">{t("country_of_residence_placeholder", "Country of residence")}</option>
                    {countryOptions.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder={t("age_placeholder", "Age")}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.reporterAge}
                    onChange={(event) => update("reporterAge", digitsOnly(event.target.value))}
                  />
                    {showErrors && formErrors.reporterAge ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterAge}</p>
                    ) : null}
                    {renderInlineHelp(
                      "reporter_age",
                      "Use digits only (0-120). Age helps route safeguarding workflows where needed.",
                      "Type your age as a number."
                    )}
                  </div>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterGender}
                    onChange={(event) => update("reporterGender", event.target.value)}
                  >
                    <option value="">{t("gender_placeholder", "Gender")}</option>
                    <option value="male">{t("gender_male_option", "Male")}</option>
                    <option value="female">{t("gender_female_option", "Female")}</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.reportingForSomeoneElse}
                  onChange={(event) => update("reportingForSomeoneElse", event.target.checked)}
                />
                {t("reporting_for_someone_else_checkbox", "I am reporting for someone else.")}
              </label>

              {form.reportingForSomeoneElse && (
                <div className="space-y-4">
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t(
                        "relationship_to_affected_person_placeholder",
                        "Relationship to the affected person"
                      )}
                      value={form.representativeRelation}
                      onChange={(event) => update("representativeRelation", event.target.value)}
                    />
                    {showErrors && formErrors.representativeRelation ? (
                      <p className="mt-1 text-xs text-rose-500">
                        {formErrors.representativeRelation}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("reason_for_representation_placeholder", "Reason for representation")}
                      rows={4}
                      value={form.representativeReason}
                      onChange={(event) => update("representativeReason", event.target.value)}
                    />
                    {showErrors && formErrors.representativeReason ? (
                      <p className="mt-1 text-xs text-rose-500">
                        {formErrors.representativeReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder={t("represented_person_email_placeholder", "Represented person email")}
                        value={form.representedEmail}
                        onChange={(event) => update("representedEmail", event.target.value)}
                      />
                      {showErrors && formErrors.representedEmail ? (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.representedEmail}
                        </p>
                      ) : null}
                    </div>
                    <input
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t(
                        "represented_person_password_placeholder",
                        "Represented person password"
                      )}
                      type="password"
                      value={form.representedPassword}
                      onChange={(event) => update("representedPassword", event.target.value)}
                    />
                    <input
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("represented_person_name_placeholder", "Represented person name")}
                      value={form.representedName}
                      onChange={(event) => update("representedName", event.target.value)}
                    />
                    <div>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder={t("represented_person_phone_placeholder", "Represented person phone")}
                        inputMode="tel"
                        value={form.representedPhone}
                        onChange={(event) => update("representedPhone", event.target.value)}
                      />
                      {showErrors && formErrors.representedPhone ? (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.representedPhone}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
              {form.reportingForSomeoneElse
                ? renderInlineHelp(
                    "representation_section",
                    "Representation fields are required because you are submitting on behalf of another person.",
                    "Because you report for someone else, fill all representation fields."
                  )
                : null}
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("incident_company_label", "Incident company")}
                </label>
                <div className="mt-2 flex gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.incidentCompany}
                    onChange={(event) => update("incidentCompany", event.target.value)}
                  >
                    <option value="">{t("select_company_placeholder", "Select a company")}</option>
                    {orgOptions.map((org) => (
                      <option key={org.id} value={String(org.id)}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                    type="button"
                    onClick={() => setShowCompanyModal(true)}
                  >
                    {t("add_company_button", "Add Company")}
                  </button>
                </div>
                {showErrors && formErrors.incidentCompany ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.incidentCompany}</p>
                ) : null}
                {renderInlineHelp(
                  "incident_company",
                  "Select the organization this case is about. The list is loaded from the complete intake organization registry.",
                  "Choose the company this report is about."
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t(
                    "incident_company_employment_label",
                    "Do you (or the affected person) work for this company?"
                  )}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("option_yes", "Yes") },
                    { id: "no", label: t("option_no", "No") },
                    { id: "none", label: t("option_none", "None") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.incidentCompanyEmployment === option.id}
                        onChange={() => update("incidentCompanyEmployment", option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.incidentCompanyEmployment ? (
                  <p className="mt-2 text-xs text-rose-500">
                    {formErrors.incidentCompanyEmployment}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("worksite_label", "Worksite")}
                </label>
                <div className="mt-2 flex gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.worksiteId}
                    onChange={(event) => update("worksiteId", event.target.value)}
                    disabled={!form.incidentCompany}
                  >
                    <option value="">
                      {form.incidentCompany
                        ? t("select_worksite_placeholder", "Select a worksite")
                        : t("select_company_first_placeholder", "Select a company first")}
                    </option>
                    {worksiteOptions.map((site) => (
                      <option key={site.id} value={String(site.id)}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                    type="button"
                    onClick={() => setShowWorksiteModal(true)}
                  >
                    {t("add_new_worksite_button", "Add new worksite")}
                  </button>
                </div>
                {showErrors && formErrors.worksiteId ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.worksiteId}</p>
                ) : null}
                {renderInlineHelp(
                  "worksite",
                  "Select the exact site where the incident happened. If missing, add the worksite and then select it.",
                  "Pick the location where the incident happened."
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("worksite_employment_label", "Do you work at this worksite?")}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("option_yes", "Yes") },
                    { id: "no", label: t("option_no", "No") },
                    { id: "none", label: t("option_none", "None") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.worksitedEmployee === option.id}
                        onChange={() => update("worksitedEmployee", option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.worksitedEmployee ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.worksitedEmployee}</p>
                ) : null}
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                <button
                  className="text-left font-semibold text-slate-900 hover:text-[var(--wb-navy)]"
                  type="button"
                  onClick={() =>
                    playFormText(
                      "step4_title",
                      t("step4_title", "NGO Representation")
                    )
                  }
                >
                  {t("step4_title", "NGO Representation")}
                </button>
                <button
                  className="mt-2 text-left text-xs leading-relaxed hover:text-slate-900"
                  type="button"
                  onClick={() =>
                    playFormText(
                      "step4_help",
                      helpText(
                        "step4_help",
                        "Tell us if an NGO is representing or supporting this report. If yes, provide NGO details for follow-up.",
                        "Is an NGO helping you with this report? If yes, write NGO name and contact."
                      )
                    )
                  }
                >
                  {helpText(
                    "step4_help",
                    "Tell us if an NGO is representing or supporting this report. If yes, provide NGO details for follow-up.",
                    "Is an NGO helping you with this report? If yes, write NGO name and contact."
                  )}
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("ngo_representation_label", "Are you represented by an NGO?")}
                </p>
                {renderInlineHelp(
                  "ngo_representation_label",
                  "Choose Yes when an NGO or civil society group is representing, guiding, or supporting this submission.",
                  "Pick Yes if an NGO is helping you submit this report."
                )}
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("yes", "Yes") },
                    { id: "no", label: t("no", "No") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.ngoRepresentation === option.id}
                        onChange={() => update("ngoRepresentation", option.id as "yes" | "no")}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.ngoRepresentation ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.ngoRepresentation}</p>
                ) : null}
              </div>

              {form.ngoRepresentation === "yes" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("ngo_name_placeholder", "NGO name")}
                      value={form.ngoName}
                      onChange={(event) => update("ngoName", event.target.value)}
                    />
                    {renderInlineHelp(
                      "ngo_name",
                      "Enter the legal or common NGO name so case handlers can verify who is supporting this case.",
                      "Write the NGO name."
                    )}
                    {showErrors && formErrors.ngoName ? (
                      <p className="mt-2 text-xs text-rose-500">{formErrors.ngoName}</p>
                    ) : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder={t("ngo_contact_placeholder", "NGO contact (email or phone)")}
                      value={form.ngoContact}
                      onChange={(event) => update("ngoContact", event.target.value)}
                    />
                    {renderInlineHelp(
                      "ngo_contact",
                      "Provide a reachable NGO contact (email or phone with country code) for follow-up and verification.",
                      "Write NGO contact email or phone."
                    )}
                    {showErrors && formErrors.ngoContact ? (
                      <p className="mt-2 text-xs text-rose-500">{formErrors.ngoContact}</p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      rows={4}
                      placeholder={t(
                        "ngo_support_details_placeholder",
                        "What support is the NGO providing?"
                      )}
                      value={form.ngoSupportDetails}
                      onChange={(event) => update("ngoSupportDetails", event.target.value)}
                    />
                    {renderInlineHelp(
                      "ngo_support_details",
                      "Describe what the NGO is doing (representation, legal support, evidence collection, mediation, or referral).",
                      "Explain how the NGO is helping."
                    )}
                    {showErrors && formErrors.ngoSupportDetails ? (
                      <p className="mt-2 text-xs text-rose-500">{formErrors.ngoSupportDetails}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {stepIndex === 5 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                <button
                  className="text-left font-semibold text-slate-900 hover:text-[var(--wb-navy)]"
                  type="button"
                  onClick={() =>
                    playFormText(
                      "step5_title",
                      t("step5_title", "Direct & indirect customers")
                    )
                  }
                >
                  {t("step5_title", "Direct & indirect customers")}
                </button>
                <button
                  className="mt-2 text-left text-xs leading-relaxed hover:text-slate-900"
                  type="button"
                  onClick={() =>
                    playFormText(
                      "step5_help",
                      helpText(
                        "step5_help",
                        "Choose whether direct and indirect customers should be alerted. If yes, select one or more target organizations.",
                        "Should we alert related companies? Pick yes/no, then select names."
                      )
                    )
                  }
                >
                  {helpText(
                    "step5_help",
                    "Choose whether direct and indirect customers should be alerted. If yes, select one or more target organizations.",
                    "Should we alert related companies? Pick yes/no, then select names."
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  {t("alert_direct_label", "Alert direct customers?")}
                </p>
                {renderInlineHelp(
                  "alert_direct_label",
                  "Choose Yes to notify directly related customers/suppliers in the immediate business relationship layer.",
                  "Pick Yes to alert direct related organizations."
                )}
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("yes", "Yes") },
                    { id: "no", label: t("no", "No") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.alertDirectCustomers === option.id}
                        onChange={() =>
                          update("alertDirectCustomers", option.id as "yes" | "no")
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.alertDirectCustomers ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.alertDirectCustomers}</p>
                ) : null}

                {form.alertDirectCustomers === "yes" ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3">
                    {directRelationshipOptions.length ? (
                      directRelationshipOptions.map((option) => {
                        const checked = form.directCustomerTargets.includes(String(option.id));
                        return (
                          <label key={`direct-${option.id}`} className="flex items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextSet = new Set(form.directCustomerTargets);
                                if (event.target.checked) nextSet.add(String(option.id));
                                else nextSet.delete(String(option.id));
                                update("directCustomerTargets", Array.from(nextSet));
                              }}
                            />
                            <span>
                              <span className="font-medium text-slate-800">{option.name}</span>
                              <span className="ml-2 text-xs text-slate-500">
                                {option.relationTypeName}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500">
                        {t(
                          "no_direct_relationship_targets",
                          "No direct relationship targets found for this organization."
                        )}
                      </p>
                    )}
                    {showErrors && formErrors.directCustomerTargets ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.directCustomerTargets}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">
                  {t("alert_indirect_label", "Alert indirect customers?")}
                </p>
                {renderInlineHelp(
                  "alert_indirect_label",
                  "Choose Yes to notify indirect relationships beyond the immediate tier, according to visibility and policy rules.",
                  "Pick Yes to alert indirect related organizations."
                )}
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("yes", "Yes") },
                    { id: "no", label: t("no", "No") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.alertIndirectCustomers === option.id}
                        onChange={() =>
                          update("alertIndirectCustomers", option.id as "yes" | "no")
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.alertIndirectCustomers ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.alertIndirectCustomers}</p>
                ) : null}

                {form.alertIndirectCustomers === "yes" ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3">
                    {indirectRelationshipOptions.length ? (
                      indirectRelationshipOptions.map((option) => {
                        const checked = form.indirectCustomerTargets.includes(String(option.id));
                        return (
                          <label key={`indirect-${option.id}`} className="flex items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextSet = new Set(form.indirectCustomerTargets);
                                if (event.target.checked) nextSet.add(String(option.id));
                                else nextSet.delete(String(option.id));
                                update("indirectCustomerTargets", Array.from(nextSet));
                              }}
                            />
                            <span>
                              <span className="font-medium text-slate-800">{option.name}</span>
                              <span className="ml-2 text-xs text-slate-500">
                                {option.relationTypeName}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500">
                        {t(
                          "no_indirect_relationship_targets",
                          "No indirect relationship targets found for this organization."
                        )}
                      </p>
                    )}
                    {showErrors && formErrors.indirectCustomerTargets ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.indirectCustomerTargets}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {stepIndex === 6 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("incident_type_group_label", "This report is about")}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "violation", label: t("incident_type_violation_option", "An occurred violation") },
                    { id: "risk", label: t("incident_type_risk_option", "Risk") },
                    { id: "both", label: t("incident_type_both_option", "Both") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.incidentType === option.id}
                        onChange={() => update("incidentType", option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {showErrors && formErrors.incidentType ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.incidentType}</p>
                ) : null}
              </div>
              <div>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("subject_placeholder", "Subject")}
                  value={form.subject}
                  onChange={(event) => update("subject", event.target.value)}
                />
                {showErrors && formErrors.subject ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.subject}</p>
                ) : null}
              </div>
              <div>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("description_placeholder", "Description")}
                  rows={5}
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                />
                {showErrors && formErrors.description ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.description}</p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-500">
                    {t("incident_start_date_label", "Incident start date")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    type="date"
                    value={form.incidentStartDate}
                    onChange={(event) => update("incidentStartDate", event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    {t("time_label", "Time")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    type="time"
                    value={form.incidentStartTime}
                    onChange={(event) => update("incidentStartTime", event.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.incidentIsContinuing}
                  onChange={(event) => update("incidentIsContinuing", event.target.checked)}
                />
                {t("incident_continuing_label", "The incident is continuing")}
              </label>
              {!form.incidentIsContinuing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-500">
                      {t("incident_end_date_label", "Incident end date")}
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      type="date"
                      value={form.incidentEndDate}
                      onChange={(event) => update("incidentEndDate", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      {t("time_label", "Time")}
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      type="time"
                      value={form.incidentEndTime}
                      onChange={(event) => update("incidentEndTime", event.target.value)}
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("problem_addressed_before_label", "Has the problem been addressed before?")}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("option_yes", "Yes") },
                    { id: "no", label: t("option_no", "No") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.addressedBefore === option.id}
                        onChange={() => update("addressedBefore", option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("legal_steps_taken_label", "Have legal steps been taken?")}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: t("option_yes", "Yes") },
                    { id: "no", label: t("option_no", "No") },
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.legalStepsTaken === option.id}
                        onChange={() => update("legalStepsTaken", option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {form.legalStepsTaken === "yes" ? (
                  <div>
                    <textarea
                      className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      rows={3}
                      placeholder={t(
                        "legal_steps_details_placeholder",
                        "Please describe the legal steps that were taken."
                      )}
                      value={form.legalStepsDetails}
                      onChange={(event) => update("legalStepsDetails", event.target.value)}
                    />
                    {showErrors && formErrors.legalStepsDetails ? (
                      <p className="mt-2 text-xs text-rose-500">{formErrors.legalStepsDetails}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t(
                    "risk_category_label",
                    "Select a category for the reported risk or violation"
                  )}
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  value={form.riskCategory}
                  onChange={(event) => {
                    update("riskCategory", event.target.value);
                    update("riskSubCategory", "");
                  }}
                >
                  <option value="">{t("risk_category_placeholder", "Select category")}</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {showErrors && formErrors.riskCategory ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.riskCategory}</p>
                ) : null}
              </div>
              {filteredSubCategories.length ? (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {t("risk_subcategory_label", "Sub category")}
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.riskSubCategory}
                    onChange={(event) => update("riskSubCategory", event.target.value)}
                  >
                    <option value="">
                      {t("risk_subcategory_placeholder", "Select sub category")}
                    </option>
                    {filteredSubCategories.map((sub) => (
                      <option key={sub.id} value={String(sub.id)}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("suggested_remedy_label", "What remedy is being suggested?")}
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  rows={3}
                  value={form.remedy}
                  onChange={(event) => update("remedy", event.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("attachments_label", "Attachments")}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {attachments.map((file, index) => (
                    <label
                      key={index}
                      className="cursor-pointer rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500"
                    >
                      <input
                        className="hidden"
                        type="file"
                        onChange={(event) => {
                          const selected = event.target.files?.[0] ?? null;
                          setAttachments((prev) => {
                            const next = [...prev];
                            next[index] = selected;
                            return next;
                          });
                        }}
                      />
                      {file ? file.name : t("upload_file_placeholder", "Upload file")}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stepIndex === 7 && (
            <div className="space-y-6 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {t("review_reporter_details_title", "Reporter details")}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p>{t("review_email_label", "Email")}: {form.reporterEmail || t("anonymous_label", "Anonymous")}</p>
                  <p>{t("review_name_label", "Name")}: {form.reporterName || t("anonymous_label", "Anonymous")}</p>
                  <p>{t("review_phone_label", "Phone")}: {form.reporterPhone || "-"}</p>
                  <p>
                    {t("review_country_label", "Country")}: {countryNameById[form.reporterCountry] || form.reporterCountry || "-"}
                  </p>
                  <p>{t("review_procedure_label", "Procedure")}: {form.procedureType}</p>
                  <p>{t("review_form_language_label", "Form language")}: {languageNameById[form.formLanguage] || form.formLanguage || "-"}</p>
                  <p>
                    {t("review_input_language_label", "Input language")}: {languageNameById[form.inputLanguage] || form.inputLanguage || "-"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {t("review_company_worksite_title", "Reported company & worksite")}
                </p>
                <p className="mt-2">{t("review_company_label", "Company")}: {orgNameById[form.incidentCompany] || "-"}</p>
                <p className="mt-1">{t("review_worksite_label", "Worksite")}: {worksiteNameById[form.worksiteId] || "-"}</p>
                <p className="mt-1">{t("review_employment_label", "Employment")}: {form.incidentCompanyEmployment || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {t("review_incident_details_title", "Incident details")}
                </p>
                <p className="mt-2">{t("review_subject_label", "Subject")}: {form.subject || "-"}</p>
                <p className="mt-1">{t("review_description_label", "Description")}: {form.description || "-"}</p>
                <p className="mt-1">{t("review_incident_start_label", "Incident start")}: {form.incidentStartDate || "-"}</p>
                <p className="mt-1">
                  {t("review_incident_end_label", "Incident end")}: {form.incidentIsContinuing ? t("ongoing_label", "Ongoing") : form.incidentEndDate || "-"}
                </p>
                <p className="mt-1">{t("review_legal_steps_label", "Legal steps")}: {form.legalStepsTaken || "-"}</p>
                {form.legalStepsDetails ? (
                  <p className="mt-1">{t("review_details_label", "Details")}: {form.legalStepsDetails}</p>
                ) : null}
                <p className="mt-1">{t("review_risk_category_label", "Risk category")}: {categoryNameById[form.riskCategory] || "-"}</p>
                <p className="mt-1">
                  {t("review_sub_category_label", "Sub category")}: {subCategoryNameById[form.riskSubCategory] || "-"}
                </p>
                <p className="mt-1">{t("review_suggested_remedy_label", "Suggested remedy")}: {form.remedy || "-"}</p>
              </div>
              {submitError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {submitError}
                </p>
              ) : null}
            </div>
          )}

          {stepIndex === 8 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✓
              </div>
              <h2 className="font-display text-2xl">{t("success_thank_you_title", "Thank you")}</h2>
              <p className="text-sm text-slate-600">
                {t("success_report_submitted", "Your report was submitted successfully.")}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-full bg-[var(--wb-navy)] px-5 py-2 text-sm text-white"
                  onClick={() => setShowFeedback(true)}
                  type="button"
                >
                  {t("leave_feedback_button", "Leave feedback")}
                </button>
                <Link
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600"
                  href="/portal"
                >
                  {t("go_to_portal_button", "Go to Portal")}
                </Link>
              </div>
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
              {t("back_button", "Back")}
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--wb-navy)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canContinue || isSubmitting}
              onClick={handleNext}
            >
              {stepIndex === steps.length - 2
                ? isSubmitting
                  ? t("submitting_button", "Submitting...")
                  : t("create_report_button", "Create report")
                : t("next_step_button", "Next Step")}
            </button>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t("intake_channels_title", "Intake Channels")}
          </p>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">
            {t("intake_channels_subtitle", "Report from other channels")}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {t(
              "intake_channels_description",
              "These options are visible now. Full channel flows will be enabled next."
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="#"
              className="group rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                {t("channel_email_label", "Email")}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {t("channel_email_value", "intake@whitebox.local")}
              </p>
            </a>
            <a
              href="#"
              className="group rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.18 2 2 0 0 1 4.1 1h2.09a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.4 8.7a16 16 0 0 0 6 6l1.06-1.03a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {t("channel_phone_ivr_label", "Phone / IVR")}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {t("channel_phone_ivr_help", "Voice intake channel")}
              </p>
            </a>
            <a
              href="#"
              className="group rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />
                </svg>
                {t("channel_whatsapp_label", "WhatsApp")}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {t("channel_whatsapp_help", "Messaging intake")}
              </p>
            </a>
            <a
              href="#"
              className="group rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m7 10 3 3 7-7" />
                </svg>
                {t("channel_sms_label", "SMS")}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {t("channel_sms_help", "Short message intake")}
              </p>
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t("accessibility_title", "Accessibility")}
          </p>
          <div className="mt-4 space-y-3 rounded-2xl bg-[var(--wb-mist)] p-4 text-sm text-slate-600">
            <label className="flex items-center justify-between gap-3">
              <span>{t("accessibility_easy_read", "Easy Read mode")}</span>
              <input
                type="checkbox"
                checked={easyReadMode}
                onChange={(event) => setEasyReadMode(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t("accessibility_audio_mode", "Audio mode (click text to play)")}</span>
              <input
                type="checkbox"
                checked={audioMode}
                onChange={(event) => setAudioMode(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t("accessibility_field_help", "Show field help")}</span>
              <input
                type="checkbox"
                checked={showFieldHelp}
                onChange={(event) => setShowFieldHelp(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t("accessibility_inline_help", "Show inline help under each field")}</span>
              <input
                type="checkbox"
                checked={showInlineHelp}
                onChange={(event) => setShowInlineHelp(event.target.checked)}
              />
            </label>
            <p className="text-xs">
              {activeAudioTextId
                ? `${t("audio_playing_label", "Playing")}: ${activeAudioTextId}`
                : t(
                    "audio_ready_message",
                    "Audio is ready for clickable labels and help text."
                  )}
            </p>
          </div>
        </div>
        {showFieldHelp ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t("field_help_sidebar_title", "Field Help")}
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              {activeFieldHelp?.title ?? t("field_help_focus_hint", "Click or focus a field")}
            </p>
            <p className="mt-2">
              {activeFieldHelp
                ? easyReadMode
                  ? activeFieldHelp.easy
                  : activeFieldHelp.standard
                : t(
                    "field_help_default",
                    "Each field and label is clickable. Audio and help appear here."
                  )}
            </p>
          </div>
        </div>
        ) : null}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t("about_whitebox_title", "About WhiteBox")}
          </p>
          <p className="mt-4 text-sm text-slate-600">
            {t(
              "about_whitebox_description",
              "WhiteBox is a grievance and whistleblowing portal that enables internal and external stakeholders to report risks or incidents of misconduct related to human rights, sustainability, and ethics in supply chains."
            )}
          </p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-[var(--wb-navy)]"
            href="https://grievance.eu/"
            target="_blank"
            rel="noreferrer"
          >
            {t("about_whitebox_more_info", "More information")}
          </Link>
        </div>
        <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t("support_title", "Support")}
          </p>
          <div className="mt-3 space-y-2">
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/legislation/"
              target="_blank"
              rel="noreferrer"
            >
              {t("support_legislation_link", "Legislation")}
            </a>
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/policies-terms/"
              target="_blank"
              rel="noreferrer"
            >
              {t("support_policies_link", "Policies")}
            </a>
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/for-stakeholders/guides/"
              target="_blank"
              rel="noreferrer"
            >
              {t("support_guides_link", "Guides")}
            </a>
            <a className="block hover:text-slate-900" href="mailto:info@grievance.eu">
              {t("support_email_link", "E-mail Us")}
            </a>
          </div>
        </div>
      </aside>

      {showFeedback ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("feedback_title", "Feedback")}</h3>
              <button type="button" onClick={() => setShowFeedback(false)}>
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {t("feedback_question", "How satisfied are you with the service provided?")}
            </p>
            <div className="mt-3 flex gap-2 text-slate-300">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index}>★</span>
              ))}
            </div>
            <textarea
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              rows={3}
              placeholder={t("feedback_placeholder", "Share feedback or suggestions")}
            />
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => setShowFeedback(false)}
                type="button"
              >
                {t("cancel_button", "Cancel")}
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
              >
                {t("save_button", "Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCompanyModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("add_company_modal_title", "Add Company")}</h3>
              <button type="button" onClick={() => setShowCompanyModal(false)}>
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("company_name_placeholder", "Company name")}
                  value={companyForm.name}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                {companyErrors.name ? (
                  <p className="mt-1 text-xs text-rose-500">{companyErrors.name}</p>
                ) : null}
              </div>
              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  value={companyForm.organization_type}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      organization_type: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("organization_type_placeholder", "Organization type")}</option>
                  {orgTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {companyErrors.organization_type ? (
                  <p className="mt-1 text-xs text-rose-500">
                    {companyErrors.organization_type}
                  </p>
                ) : null}
              </div>
              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  value={companyForm.country}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, country: event.target.value }))
                  }
                >
                  <option value="">{t("country_placeholder", "Country")}</option>
                  {countryOptions.map((country) => (
                    <option key={country.id} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {companyErrors.country ? (
                  <p className="mt-1 text-xs text-rose-500">{companyErrors.country}</p>
                ) : null}
              </div>
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("city_placeholder", "City")}
                value={companyForm.city}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, city: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("website_placeholder", "Website")}
                value={companyForm.website}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, website: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("address_placeholder", "Address")}
                value={companyForm.address}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("contact_info_placeholder", "Contact info")}
                value={companyForm.contact_info}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, contact_info: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("legal_type_placeholder", "Legal type")}
                value={companyForm.legal_type}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, legal_type: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("employees_number_placeholder", "Employees number")}
                value={companyForm.employees_number}
                onChange={(event) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    employees_number: digitsOnly(event.target.value),
                  }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("company_code_placeholder", "Company code")}
                value={companyForm.company_code}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, company_code: event.target.value }))
                }
              />
            </div>
            {companyErrors.website ? (
              <p className="mt-2 text-xs text-rose-500">{companyErrors.website}</p>
            ) : null}
            {companyErrors.employees_number ? (
              <p className="mt-2 text-xs text-rose-500">{companyErrors.employees_number}</p>
            ) : null}
            {companyErrors.form ? (
              <p className="mt-2 text-xs text-rose-500">{companyErrors.form}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => setShowCompanyModal(false)}
                type="button"
              >
                {t("cancel_button", "Cancel")}
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
                onClick={saveCompany}
              >
                {t("save_button", "Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showWorksiteModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("add_worksite_modal_title", "Add Worksite")}</h3>
              <button type="button" onClick={() => setShowWorksiteModal(false)}>
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("worksite_name_placeholder", "Worksite name")}
                value={worksiteForm.name}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("address_placeholder", "Address")}
                value={worksiteForm.address}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={t("city_placeholder", "City")}
                value={worksiteForm.city_code}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, city_code: event.target.value }))
                }
              />
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                value={worksiteForm.country}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, country: event.target.value }))
                }
              >
                <option value="">{t("country_placeholder", "Country")}</option>
                {countryOptions.map((country) => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              {worksiteErrors.name ? (
                <p className="text-xs text-rose-500">{worksiteErrors.name}</p>
              ) : null}
              {worksiteErrors.organization ? (
                <p className="text-xs text-rose-500">{worksiteErrors.organization}</p>
              ) : null}
              {worksiteErrors.form ? (
                <p className="text-xs text-rose-500">{worksiteErrors.form}</p>
              ) : null}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => setShowWorksiteModal(false)}
                type="button"
              >
                {t("cancel_button", "Cancel")}
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
                onClick={saveWorksite}
              >
                {t("save_button", "Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
