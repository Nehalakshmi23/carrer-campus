const BASE_URL = "http://127.0.0.1:5000";

/* ================= INTERFACES ================= */

// Raw backend response
export interface AnalyzeResponse {
  final_score: number;
  score_breakdown: {
    skill_match_percent: number;
    keyword_coverage_percent: number;
    semantic_similarity: number;
    model_probability_score: number;
  };
  matched_skills: string[];
  missing_skills: string[];
  years_experience_estimate: number;
  recommendations: string[];
}

// Normalized frontend-friendly response
export interface NormalizedAnalyzeResponse {
  match_score: number;
  skill_match: number;
  keyword_coverage: number;
  semantic_similarity: number;
  model_probability: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_estimate: number;
  recommendations: string[];
}

/* ================= AUTH ================= */

export const signup = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Signup failed");
  }

  return response.json();
};

export const login = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Login failed");
  }

  return response.json();
};

/* ================= ANALYZE (FIXED) ================= */

export const analyze = async (
  resumeText: string,
  jobText: string,
  resumeFile?: File,
  jobFile?: File
): Promise<NormalizedAnalyzeResponse> => {
  const token = localStorage.getItem("cc_token");
  if (!token) throw new Error("Not logged in");

  const formData = new FormData();
  formData.append("resume_text", resumeText);
  formData.append("job_text", jobText);
  if (resumeFile) formData.append("resume", resumeFile);
  if (jobFile) formData.append("job", jobFile);

  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("cc_token");
      throw new Error("Session expired. Please login again.");
    }

    const err = await response.json();
    throw new Error(err.error || err.message || "Analysis failed");
  }

  const data: AnalyzeResponse = await response.json();

  /* 🔥 NORMALIZATION (THIS FIXES EVERYTHING) */
  return {
    match_score: Number(data.final_score ?? 0),
    skill_match: Number(data.score_breakdown?.skill_match_percent ?? 0),
    keyword_coverage: Number(data.score_breakdown?.keyword_coverage_percent ?? 0),
    semantic_similarity: Number(data.score_breakdown?.semantic_similarity ?? 0),
    model_probability: Number(data.score_breakdown?.model_probability_score ?? 0),

    matched_skills: data.matched_skills ?? [],
    missing_skills: data.missing_skills ?? [],
    experience_estimate: Number(data.years_experience_estimate ?? 0),
    recommendations: data.recommendations ?? [],
  };
};
