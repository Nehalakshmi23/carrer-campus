import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import FileInput from '../components/FileInput';
import ScoreCard from '../components/ScoreCard';
import Loader from '../components/Loader';
import { analyze } from '../utils/api';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ match_score: number; message: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!resumeText.trim() && !resumeFile) {
      toast.error('Please provide resume text or upload a resume file');
      return;
    }

    if (!jobText.trim() && !jobFile) {
      toast.error('Please provide job description text or upload a job file');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await analyze(resumeText, jobText, resumeFile || undefined, jobFile || undefined);
      setResult(response);
      toast.success('Analysis completed successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
      if (error instanceof Error && error.message.includes('Session expired')) {
        navigate('/login');
      }
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
            Upload your resume and job description to get an AI-powered compatibility score
          </p>
        </div>

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
                  placeholder="Paste your resume text here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <FileInput
                label="Upload Resume File"
                accept=".pdf,.docx,.doc,.txt,.odt"
                onChange={setResumeFile}
                file={resumeFile}
              />
            </div>

            {/* Job Description Section */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <FileInput
                label="Upload Job Description File"
                accept=".pdf,.docx,.doc,.txt,.odt"
                onChange={setJobFile}
                file={jobFile}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Match'}
            </button>
            
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-8 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Loader />
          </div>
        )}

        {result && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ScoreCard score={result.match_score} message={result.message} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;