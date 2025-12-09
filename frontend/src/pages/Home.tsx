import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import Header from '../components/Header';
import FileInput from '../components/FileInput';
import ScoreCard from '../components/ScoreCard';
import Loader from '../components/Loader';

import { analyze} from '../utils/api';
import type { AnalyzeResponse } from '../utils/api';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // IMPORTANT FIX: result now matches ATS full response
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // Redirect to login if token missing
  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!resumeText.trim() && !resumeFile) {
      toast.error('Please provide resume text or upload a resume file.');
      return;
    }
    if (!jobText.trim() && !jobFile) {
      toast.error('Please provide job description text or upload a job file.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await analyze(
        resumeText,
        jobText,
        resumeFile || undefined,
        jobFile || undefined
      );

      setResult(response);
      toast.success('Analysis completed successfully!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Analysis failed';
      toast.error(msg);

      if (msg.includes('Session expired')) navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResumeText('');
    setJobText('');
    setResumeFile(null);
    setJobFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Resume & Job Match Analyzer
          </h1>
          <p className="text-gray-600">
            Upload your resume and job description to get an AI-powered ATS compatibility score.
          </p>
        </div>

        {/* Input box */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Resume Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Resume</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume Text
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-center">
                <span className="text-gray-400">OR</span>
              </div>

              <FileInput
                label="Upload Resume File"
                accept=".pdf,.doc,.docx,.txt,.odt"
                onChange={setResumeFile}
                file={resumeFile}
              />
            </div>

            {/* Job Description */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Job Description</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description Text
                </label>
                <textarea
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-center">
                <span className="text-gray-400">OR</span>
              </div>

              <FileInput
                label="Upload Job Description File"
                accept=".pdf,.doc,.docx,.txt,.odt"
                onChange={setJobFile}
                file={jobFile}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Match'}
            </button>

            <button
              onClick={handleReset}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Loader />
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ScoreCard data={result} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
