import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Header from "../components/Header";
import FileInput from "../components/FileInput";
import Loader from "../components/Loader";
import MatchRateChart from "../components/MatchRateChart";

import { analyze } from "../utils/api";
import type { AnalyzeResponse } from "../utils/api";

const Home: React.FC = () => {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [showLanding, setShowLanding] = useState(true);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<number>(1);

  /* FLOATING AI CHAT */
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);

  useEffect(() => {
    const token = localStorage.getItem("cc_token");
    if (!token) navigate("/login");
  }, [navigate]);

  /* ================= ANALYZE ================= */
  const handleAnalyze = async () => {
    if (!resumeFile || !jobFile) {
      toast.error("Please upload both resume and job description");
      return;
    }

    setIsLoading(true);
    try {
      const res = await analyze("", "", resumeFile, jobFile);
      setResult(res);
      setStep(3);
    } catch {
      toast.error("Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= CHAT ================= */
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !result || chatLoading) return;

    const question = chatInput;
    setMessages((p) => [...p, { role: "user", text: question }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, analysis: result }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", text: "Something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ================= LANDING ================= */
  if (showLanding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-700">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-32 text-center text-white">
          <h1 className="text-6xl font-extrabold mb-10">
            Resume Matching with{" "}
            <span className="text-violet-300">JobFit</span>
          </h1>

          <p className="text-2xl text-purple-100 max-w-4xl mx-auto mb-14">
            Instantly see how your resume matches any job description with
            ATS-aware AI insights.
          </p>

          <button
            onClick={() => {
              setShowLanding(false);
              setStep(1);
            }}
            className="bg-gradient-to-r from-violet-400 to-fuchsia-500 text-black px-10 py-4 rounded-xl font-semibold shadow-xl"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  /* ================= RESULT PAGE ================= */
  if (step === 3 && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <Header />

        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-6">

          {/* SCORE */}
          <div className="col-span-12 md:col-span-4 bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-purple-700">
              Match Score
            </h3>

            <div className="flex justify-center mb-6">
              <MatchRateChart score={Number(result.skill_match)} />
            </div>

            <Row label="Skill Match" value={`${Math.round(result.skill_match)}%`} />
            <Row label="Keyword Coverage" value={`${result.keyword_coverage.toFixed(2)}%`} />
            <Row label="Semantic Similarity" value={`${result.semantic_similarity}/10`} />
            <Row label="ATS Probability" value={`${result.model_probability}/10`} />
          </div>

          {/* RIGHT SIDE */}
          <div className="col-span-12 md:col-span-8 space-y-6">

            <Card title="Skills Analysis">
              <SkillSection title="Matched Skills" skills={result.matched_skills} type="good" />
              <SkillSection title="Missing Skills" skills={result.missing_skills} type="bad" />
            </Card>

            {/* EXPERIENCE ESTIMATE */}
            <Card title="Experience Estimate">
              <p className="text-gray-700">
                <span className="font-semibold text-purple-600">
                  {result.experience_estimate}
                </span>{" "}
                years of relevant experience detected.
              </p>
            </Card>

            {/* RECOMMENDATIONS */}
            <Card title="Recommendations">
  <ul className="list-disc pl-5 space-y-2">

    {/* Skill-gap recommendation (frontend controlled) */}
    {result.missing_skills.length > 0 && (
      <li>
        Consider adding the following skills to your resume if you have
        hands-on experience:{" "}
        <span className="font-semibold">
          {result.missing_skills.join(", ")}
        </span>
        .
      </li>
    )}

    {/* Backend-generated recommendations (filtered to avoid duplicates) */}
    {result.recommendations
      .filter(
        (r) =>
          !r.toLowerCase().includes("consider adding the following skills")
      )
      .map((r, i) => (
        <li key={i}>{r}</li>
      ))}
  </ul>
</Card>

            <div className="text-right">
              <button
                onClick={() => setStep(1)}
                className="text-purple-600 font-medium"
              >
                Analyze another resume →
              </button>
            </div>
          </div>
        </div>

        {/* ================= FLOATING AI ================= */}
        <div className="fixed bottom-6 right-6 z-50">
          {!assistantOpen ? (
            <button
              onClick={() => setAssistantOpen(true)}
              className="bg-purple-600 text-white px-4 py-3 rounded-full shadow-lg"
            >
              🤖 Ask AI
            </button>
          ) : (
            <div className="w-[420px] bg-white rounded-xl shadow-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-purple-700">
                  Career Compass
                </h4>
                <button onClick={() => setAssistantOpen(false)}>✕</button>
              </div>

              <div className="h-[320px] overflow-y-auto border rounded p-3 mb-3 bg-gray-50">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`mb-2 ${
                      m.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <span
                      className={`inline-block px-3 py-2 rounded text-sm ${
                        m.role === "user"
                          ? "bg-purple-600 text-white"
                          : "bg-white border"
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Ask something…"
                />
                <button
                  onClick={sendChatMessage}
                  className="bg-purple-600 text-white px-4 rounded text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= UPLOAD FLOW ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-purple-700">
      <Header />

      <main className="max-w-3xl mx-auto mt-14 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10">

          {step === 1 && (
            <UploadBox title="Upload Resume">
              <FileInput accept=".pdf,.doc,.docx" onChange={setResumeFile} file={resumeFile} />
              <div className="text-right mt-6">
                <button
                  disabled={!resumeFile}
                  onClick={() => setStep(2)}
                  className="bg-purple-600 text-white px-6 py-2 rounded"
                >
                  Continue →
                </button>
              </div>
            </UploadBox>
          )}

          {step === 2 && (
            <UploadBox title="Upload Job Description">
              <FileInput accept=".pdf,.doc,.docx" onChange={setJobFile} file={jobFile} />
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)}>← Back</button>
                <button
                  disabled={!jobFile || isLoading}
                  onClick={handleAnalyze}
                  className="bg-purple-600 text-white px-6 py-2 rounded"
                >
                  Analyze →
                </button>
              </div>
            </UploadBox>
          )}

          {isLoading && <Loader />}
        </div>
      </main>
    </div>
  );
};

/* ================= HELPERS ================= */

const UploadBox = ({ title, children }: any) => (
  <div className="border-2 border-dashed border-purple-400 rounded-xl p-10 text-center">
    <h3 className="text-xl font-semibold mb-4 text-purple-700">{title}</h3>
    {children}
  </div>
);

const Card = ({ title, children }: any) => (
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="text-lg font-semibold mb-4 text-purple-700">{title}</h3>
    {children}
  </div>
);

const Row = ({ label, value }: any) => (
  <div className="flex justify-between border-b py-2">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const SkillSection = ({ title, skills, type }: any) => (
  <div className="mb-4">
    <h4 className="font-medium mb-2">{title}</h4>
    <div className="flex flex-wrap gap-2">
      {skills.map((s: string, i: number) => (
        <span
          key={i}
          className={`px-3 py-1 rounded-full text-sm ${
            type === "good"
              ? "bg-purple-100 text-purple-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  </div>
);

export default Home;
