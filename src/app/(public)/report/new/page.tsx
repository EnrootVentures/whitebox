"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  alertDirectCustomers: "yes" | "no" | "";
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
  alertDirectCustomers: "",
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

  const [countryOptions, setCountryOptions] = useState<CountryOption[]>(fallbackCountries);
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>(fallbackLanguages);
  const [countryLanguageMap, setCountryLanguageMap] = useState<Record<string, string[]>>({});
  const [orgOptions, setOrgOptions] = useState<OrganisationOption[]>([]);
  const [orgTypeOptions, setOrgTypeOptions] = useState(fallbackOrgTypeOptions);
  const [worksiteOptions, setWorksiteOptions] = useState<WorksiteOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<SubCategoryOption[]>([]);

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

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      const [
        { data: countryRows },
        { data: languageRows },
        { data: countryLanguageRows },
        { data: orgRows },
        { data: orgTypeRows },
        { data: categoryRows },
        { data: subCategoryRows },
      ] = await Promise.all([
        supabase.from("countries").select("country_id,country_name").order("country_name"),
        supabase.from("languages").select("language_id,language_name,language_code").order("language_name"),
        supabase.from("country_languages").select("country_id,language_id"),
        supabase
          .from("organisations")
          .select("organization_id,name,country,city,website,organization_type")
          .order("name"),
        supabase
          .from("organization_types")
          .select("type_key,label,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order")
          .order("label"),
        supabase.from("report_categories").select("category_id,name").order("name"),
        supabase.from("report_sub_categories").select("sub_category_id,name,category_id").order("name"),
      ]);

      if (!isMounted) return;

      const nextCountries =
        countryRows?.map((row) => ({
          id: String(row.country_id),
          name: row.country_name,
        })) ?? [];

      const nextLanguages =
        languageRows?.map((row) => ({
          id: String(row.language_id),
          name: row.language_name,
          code: row.language_code,
        })) ?? [];

      const nextMap: Record<string, string[]> = {};
      (countryLanguageRows ?? []).forEach((row) => {
        const countryId = String(row.country_id);
        const languageId = String(row.language_id);
        if (!nextMap[countryId]) {
          nextMap[countryId] = [];
        }
        nextMap[countryId].push(languageId);
      });

      const nextOrgs =
        orgRows?.map((org) => ({
          id: org.organization_id,
          name: org.name,
          country: org.country,
          city: org.city,
          website: org.website,
          type: org.organization_type,
        })) ?? [];

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
    const english = availableLanguages.find((lang) =>
      lang.name.toLowerCase().includes("english") || lang.code.toLowerCase() === "en" || lang.code.toLowerCase() === "en-us"
    );
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
    setForm((prev) => {
      const nextFormLanguage =
        prev.formLanguage && availableIds.has(prev.formLanguage)
          ? prev.formLanguage
          : availableLanguages[0].id;
      const nextInputLanguage =
        prev.inputLanguage && availableIds.has(prev.inputLanguage)
          ? prev.inputLanguage
          : availableLanguages[0].id;
      if (nextFormLanguage === prev.formLanguage && nextInputLanguage === prev.inputLanguage) {
        return prev;
      }
      return {
        ...prev,
        formLanguage: nextFormLanguage,
        inputLanguage: nextInputLanguage,
      };
    });
  }, [availableLanguages]);

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
      if (!step1Enabled) errors.captcha = "Complete the captcha to continue.";
      if (!form.formCountry) errors.formCountry = "Select a country.";
      if (!form.formLanguage) errors.formLanguage = "Select a form language.";
      if (form.useDifferentInputLanguage && !form.inputLanguage) {
        errors.inputLanguage = "Select an input language.";
      }
    }

    if (stepIndex === 1) {
      if (!form.acceptPrivacy) errors.acceptPrivacy = "Required.";
      if (!form.acceptDataShare) errors.acceptDataShare = "Required.";
      if (!form.acceptDataTransfer) errors.acceptDataTransfer = "Required.";
      if (!form.acceptSensitive) errors.acceptSensitive = "Required.";
      if (!form.acceptProcedureRules) errors.acceptProcedureRules = "Required.";
    }

    if (stepIndex === 2) {
      if (!form.isAnonymous) {
        if (!form.reporterEmail.trim()) {
          errors.reporterEmail = "Email is required.";
        } else if (!isValidEmail(form.reporterEmail)) {
          errors.reporterEmail = "Enter a valid email.";
        }
        if (!form.reporterPassword.trim()) {
          errors.reporterPassword = "Password is required.";
        }
        if (!isValidPhone(form.reporterPhone)) {
          errors.reporterPhone = "Enter a valid phone number.";
        }
        if (!isValidAge(form.reporterAge)) {
          errors.reporterAge = "Enter a valid age.";
        }
      }
      if (form.reportingForSomeoneElse) {
        if (!form.representativeRelation.trim()) {
          errors.representativeRelation = "Relationship is required.";
        }
        if (!form.representativeReason.trim()) {
          errors.representativeReason = "Reason is required.";
        }
        if (form.representedEmail && !isValidEmail(form.representedEmail)) {
          errors.representedEmail = "Enter a valid email.";
        }
        if (!isValidPhone(form.representedPhone)) {
          errors.representedPhone = "Enter a valid phone number.";
        }
      }
    }

    if (stepIndex === 3) {
      if (!form.incidentCompany) errors.incidentCompany = "Select a company.";
      if (!form.incidentCompanyEmployment) {
        errors.incidentCompanyEmployment = "Select an option.";
      }
      if (worksiteOptions.length > 0 && !form.worksiteId) {
        errors.worksiteId = "Select a worksite.";
      }
      if (!form.worksitedEmployee) {
        errors.worksitedEmployee = "Select an option.";
      }
    }

    if (stepIndex === 6) {
      if (!form.incidentType) errors.incidentType = "Select incident type.";
      if (!form.subject.trim()) errors.subject = "Subject is required.";
      if (!form.description.trim()) errors.description = "Description is required.";
      if (!form.riskCategory) errors.riskCategory = "Select a category.";
      if (form.legalStepsTaken === "yes" && !form.legalStepsDetails.trim()) {
        errors.legalStepsDetails = "Provide the legal steps taken.";
      }
    }

    return errors;
  }, [
    form,
    stepIndex,
    step1Enabled,
    worksiteOptions.length,
  ]);

  const canContinue = useMemo(() => Object.keys(stepErrors).length === 0, [stepErrors]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const stepLabel = steps[stepIndex];


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
        alert_indirect_suppliers: false,
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
      const message = err instanceof Error ? err.message : "Unable to submit report.";
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
    if (!companyForm.name.trim()) nextErrors.name = "Company name is required.";
    if (!companyForm.organization_type) nextErrors.organization_type = "Select organization type.";
    if (!companyForm.country) nextErrors.country = "Country is required.";
    if (!isValidUrl(companyForm.website)) nextErrors.website = "Enter a valid URL.";
    if (!isValidEmployeeCount(companyForm.employees_number)) {
      nextErrors.employees_number = "Enter a valid employee count.";
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
      setCompanyErrors({ form: error?.message || "Unable to save company." });
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
    if (!orgId) nextErrors.organization = "Select a company first.";
    if (!worksiteForm.name.trim()) nextErrors.name = "Worksite name is required.";
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
      setWorksiteErrors({ form: error?.message || "Unable to save worksite." });
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
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--wb-navy)]">
              Create report
            </p>
            <h1 className="font-display mt-2 text-3xl">{stepLabel}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {stepIndex + 1} / {steps.length}
            </p>
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

        <div className="mt-6">
          {stepIndex === 0 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Captcha
                </p>
                <div className="mt-3" id="recaptcha-container" />
                {!RECAPTCHA_SITE_KEY ? (
                  <p className="mt-2 text-xs text-red-500">Missing reCAPTCHA site key.</p>
                ) : null}
                {showErrors && formErrors.captcha ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.captcha}</p>
                ) : null}
              </div>

              <fieldset className="space-y-4" disabled={!step1Enabled}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.formCountry}
                    onChange={(event) => update("formCountry", event.target.value)}
                  >
                    <option value="">Select country</option>
                    {countryOptions.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {showErrors && formErrors.formCountry ? (
                    <p className="mt-2 text-xs text-rose-500">{formErrors.formCountry}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Form language</label>
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
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.useDifferentInputLanguage}
                    onChange={(event) => update("useDifferentInputLanguage", event.target.checked)}
                  />
                  I want to use a different input language
                </label>
                <div>
                  <label className="text-sm font-medium text-slate-700">Input language</label>
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
                </div>
              </fieldset>

              <fieldset disabled={!step1Enabled}>
                <p className="text-sm font-medium text-slate-700">Procedure type</p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      type="radio"
                      checked={form.procedureType === "grievance"}
                      onChange={() => update("procedureType", "grievance")}
                    />
                    I want to file a Grievance Report
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-400">
                    <input type="radio" disabled />
                    I want to file a Whistleblowing Report
                  </label>
                  {form.procedureType === "grievance" ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                      A grievance (or complaint) report under the Supply Chain Due Diligence Act is
                      a complaint or a tip about potential human rights or environmental risks
                      associated with the economic activities of a company or its supply chain. These
                      reports allow companies to respond promptly with remedial and preventive
                      measures. They also help in continuously improving the processes for maintaining
                      due diligence on human rights within the supply chain. They can be filed by any
                      stakeholder of the supply chain that is being directly affected or by someone
                      who is representing someone directly affected. Please visit our website for more
                      information and read the procedure policy in the next step carefully.
                    </div>
                  ) : null}
                </div>
              </fieldset>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Privacy Policy</p>
                <p className="mt-2 text-xs text-slate-600">
                  I have read and agree to the Privacy Policy set forth in the legal documentation
                  (https://mercantilebx.com/docs/)
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Grievance Procedure Policy
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  I have read and agree to the Confirmation of Grievance Procedure Policy
                  (https://mercantilebx.com/docs/)
                </p>
              </div>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptPrivacy}
                  onChange={(event) => update("acceptPrivacy", event.target.checked)}
                />
                By marking this box, you confirm that you have read, comprehend, and consent to the
                Privacy Policy.
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptDataShare}
                  onChange={(event) => update("acceptDataShare", event.target.checked)}
                />
                By marking this box, you give us the authority to share your provided data with
                third parties, including reported companies, alerted business customers, NGOs, and
                data processors.
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptDataTransfer}
                  onChange={(event) => update("acceptDataTransfer", event.target.checked)}
                />
                By marking this box, you grant permission to transmit your data outside of your
                jurisdiction.
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptSensitive}
                  onChange={(event) => update("acceptSensitive", event.target.checked)}
                />
                If you provide special categories of personal data, you explicitly consent to its
                processing in accordance with GDPR Article 9(2)(a).
              </label>
              <label className="flex gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.acceptProcedureRules}
                  onChange={(event) => update("acceptProcedureRules", event.target.checked)}
                />
                By marking this box, you confirm that you have read, comprehended, and consented to
                the Procedural Rules.
              </label>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Stakeholder Details</p>
                <p className="mt-2">
                  If you would like to, you can fill in your personal information here. This
                  information might help resolve your issue. Visit our website for more information
                  on the legal protection from reprisals for reporters. If you want to report
                  anonymously, a new anonymous account is automatically created to handle your
                  report. The anonymous account ensures that no information about you is linked to
                  the report. This process maintains your privacy while allowing the issue to be
                  addressed. Please refer to our privacy policy for more information.
                </p>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(event) => update("isAnonymous", event.target.checked)}
                />
                <span>I want to use anonymous login details (an email will be generated for you).</span>
              </label>

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
                      placeholder="Email"
                      value={form.reporterEmail}
                      onChange={(event) => update("reporterEmail", event.target.value)}
                    />
                    {showErrors && formErrors.reporterEmail ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterEmail}</p>
                    ) : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Password"
                      type="password"
                      value={form.reporterPassword}
                      onChange={(event) => update("reporterPassword", event.target.value)}
                    />
                    {showErrors && formErrors.reporterPassword ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterPassword}</p>
                    ) : null}
                  </div>
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Full name"
                    value={form.reporterName}
                    onChange={(event) => update("reporterName", event.target.value)}
                  />
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Phone number"
                      inputMode="tel"
                      value={form.reporterPhone}
                      onChange={(event) => update("reporterPhone", event.target.value)}
                    />
                    {showErrors && formErrors.reporterPhone ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterPhone}</p>
                    ) : null}
                  </div>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterCountry}
                    onChange={(event) => update("reporterCountry", event.target.value)}
                  >
                    <option value="">Country of residence</option>
                    {countryOptions.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Age"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.reporterAge}
                    onChange={(event) => update("reporterAge", digitsOnly(event.target.value))}
                  />
                    {showErrors && formErrors.reporterAge ? (
                      <p className="mt-1 text-xs text-rose-500">{formErrors.reporterAge}</p>
                    ) : null}
                  </div>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.reporterGender}
                    onChange={(event) => update("reporterGender", event.target.value)}
                  >
                    <option value="">Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.reportingForSomeoneElse}
                  onChange={(event) => update("reportingForSomeoneElse", event.target.checked)}
                />
                I am reporting for someone else.
              </label>

              {form.reportingForSomeoneElse && (
                <div className="space-y-4">
                  <div>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Relationship to the affected person"
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
                      placeholder="Reason for representation"
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
                        placeholder="Represented person email"
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
                      placeholder="Represented person password"
                      type="password"
                      value={form.representedPassword}
                      onChange={(event) => update("representedPassword", event.target.value)}
                    />
                    <input
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Represented person name"
                      value={form.representedName}
                      onChange={(event) => update("representedName", event.target.value)}
                    />
                    <div>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder="Represented person phone"
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
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700">Incident company</label>
                <div className="mt-2 flex gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.incidentCompany}
                    onChange={(event) => update("incidentCompany", event.target.value)}
                  >
                    <option value="">Select a company</option>
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
                    Add Company
                  </button>
                </div>
                {showErrors && formErrors.incidentCompany ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.incidentCompany}</p>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  Do you (or the affected person) work for this company?
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
                    { id: "none", label: "None" },
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
                <label className="text-sm font-medium text-slate-700">Worksite</label>
                <div className="mt-2 flex gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.worksiteId}
                    onChange={(event) => update("worksiteId", event.target.value)}
                    disabled={!form.incidentCompany}
                  >
                    <option value="">
                      {form.incidentCompany ? "Select a worksite" : "Select a company first"}
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
                    Add new worksite
                  </button>
                </div>
                {showErrors && formErrors.worksiteId ? (
                  <p className="mt-2 text-xs text-rose-500">{formErrors.worksiteId}</p>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Do you work at this worksite?</p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
                    { id: "none", label: "None" },
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
                <p className="font-semibold text-slate-900">NGO Representation</p>
                <p className="mt-2">This step will be available soon.</p>
              </div>
            </div>
          )}

          {stepIndex === 5 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Direct & indirect customers</p>
                <p className="mt-2">This step will be available soon.</p>
              </div>
            </div>
          )}

          {stepIndex === 6 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-700">This report is about</p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "violation", label: "An occurred violation" },
                    { id: "risk", label: "Risk" },
                    { id: "both", label: "Both" },
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
                  placeholder="Subject"
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
                  placeholder="Description"
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
                  <label className="text-xs text-slate-500">Incident start date</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    type="date"
                    value={form.incidentStartDate}
                    onChange={(event) => update("incidentStartDate", event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Time</label>
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
                The incident is continuing
              </label>
              {!form.incidentIsContinuing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-500">Incident end date</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      type="date"
                      value={form.incidentEndDate}
                      onChange={(event) => update("incidentEndDate", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Time</label>
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
                <p className="text-sm font-medium text-slate-700">Has the problem been addressed before?</p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
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
                <p className="text-sm font-medium text-slate-700">Have legal steps been taken?</p>
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  {[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
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
                      placeholder="Please describe the legal steps that were taken."
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
                  Select a category for the reported risk or violation
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  value={form.riskCategory}
                  onChange={(event) => {
                    update("riskCategory", event.target.value);
                    update("riskSubCategory", "");
                  }}
                >
                  <option value="">Select category</option>
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
                  <label className="text-sm font-medium text-slate-700">Sub category</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={form.riskSubCategory}
                    onChange={(event) => update("riskSubCategory", event.target.value)}
                  >
                    <option value="">Select sub category</option>
                    {filteredSubCategories.map((sub) => (
                      <option key={sub.id} value={String(sub.id)}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="text-sm font-medium text-slate-700">What remedy is being suggested?</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  rows={3}
                  value={form.remedy}
                  onChange={(event) => update("remedy", event.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Attachments</p>
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
                      {file ? file.name : "Upload file"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stepIndex === 7 && (
            <div className="space-y-6 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Reporter details</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p>Email: {form.reporterEmail || "Anonymous"}</p>
                  <p>Name: {form.reporterName || "Anonymous"}</p>
                  <p>Phone: {form.reporterPhone || "-"}</p>
                  <p>
                    Country: {countryNameById[form.reporterCountry] || form.reporterCountry || "-"}
                  </p>
                  <p>Procedure: {form.procedureType}</p>
                  <p>Form language: {languageNameById[form.formLanguage] || form.formLanguage || "-"}</p>
                  <p>
                    Input language: {languageNameById[form.inputLanguage] || form.inputLanguage || "-"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Reported company & worksite</p>
                <p className="mt-2">Company: {orgNameById[form.incidentCompany] || "-"}</p>
                <p className="mt-1">Worksite: {worksiteNameById[form.worksiteId] || "-"}</p>
                <p className="mt-1">Employment: {form.incidentCompanyEmployment || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Incident details</p>
                <p className="mt-2">Subject: {form.subject || "-"}</p>
                <p className="mt-1">Description: {form.description || "-"}</p>
                <p className="mt-1">Incident start: {form.incidentStartDate || "-"}</p>
                <p className="mt-1">
                  Incident end: {form.incidentIsContinuing ? "Ongoing" : form.incidentEndDate || "-"}
                </p>
                <p className="mt-1">Legal steps: {form.legalStepsTaken || "-"}</p>
                {form.legalStepsDetails ? (
                  <p className="mt-1">Details: {form.legalStepsDetails}</p>
                ) : null}
                <p className="mt-1">Risk category: {categoryNameById[form.riskCategory] || "-"}</p>
                <p className="mt-1">
                  Sub category: {subCategoryNameById[form.riskSubCategory] || "-"}
                </p>
                <p className="mt-1">Suggested remedy: {form.remedy || "-"}</p>
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
              <h2 className="font-display text-2xl">Thank you</h2>
              <p className="text-sm text-slate-600">Your report was submitted successfully.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-full bg-[var(--wb-navy)] px-5 py-2 text-sm text-white"
                  onClick={() => setShowFeedback(true)}
                  type="button"
                >
                  Leave feedback
                </button>
                <Link
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600"
                  href="/portal"
                >
                  Go to Portal
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
                  : "Create report"
                : "Next Step"}
            </button>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Audio enabled
          </p>
          <div className="mt-4 rounded-2xl bg-[var(--wb-mist)] p-4 text-sm text-slate-600">
            Audio support is enabled. Click on text to hear the content.
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            About WhiteBox
          </p>
          <p className="mt-4 text-sm text-slate-600">
            WhiteBox is a grievance and whistleblowing portal that enables internal and external
            stakeholders to report risks or incidents of misconduct related to human rights,
            sustainability, and ethics in supply chains.
          </p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-[var(--wb-navy)]"
            href="https://grievance.eu/"
            target="_blank"
            rel="noreferrer"
          >
            More information
          </Link>
        </div>
        <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Support</p>
          <div className="mt-3 space-y-2">
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/legislation/"
              target="_blank"
              rel="noreferrer"
            >
              Legislation
            </a>
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/policies-terms/"
              target="_blank"
              rel="noreferrer"
            >
              Policies
            </a>
            <a
              className="block hover:text-slate-900"
              href="https://grievance.eu/resources/for-stakeholders/guides/"
              target="_blank"
              rel="noreferrer"
            >
              Guides
            </a>
            <a className="block hover:text-slate-900" href="mailto:info@grievance.eu">
              E-mail Us
            </a>
          </div>
        </div>
      </aside>

      {showFeedback ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Feedback</h3>
              <button type="button" onClick={() => setShowFeedback(false)}>
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              How satisfied are you with the service provided?
            </p>
            <div className="mt-3 flex gap-2 text-slate-300">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index}>★</span>
              ))}
            </div>
            <textarea
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              rows={3}
              placeholder="Share feedback or suggestions"
            />
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => setShowFeedback(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCompanyModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Company</h3>
              <button type="button" onClick={() => setShowCompanyModal(false)}>
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Company name"
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
                  <option value="">Organization type</option>
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
                  <option value="">Country</option>
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
                placeholder="City"
                value={companyForm.city}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, city: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Website"
                value={companyForm.website}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, website: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Address"
                value={companyForm.address}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Contact info"
                value={companyForm.contact_info}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, contact_info: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Legal type"
                value={companyForm.legal_type}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, legal_type: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Employees number"
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
                placeholder="Company code"
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
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
                onClick={saveCompany}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showWorksiteModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Worksite</h3>
              <button type="button" onClick={() => setShowWorksiteModal(false)}>
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Worksite name"
                value={worksiteForm.name}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Address"
                value={worksiteForm.address}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="City"
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
                <option value="">Country</option>
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
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--wb-navy)] px-4 py-2 text-sm text-white"
                type="button"
                onClick={saveWorksite}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
