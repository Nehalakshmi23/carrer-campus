const BASE_URL = 'http://127.0.0.1:5000';

interface AuthResponse {
  token: string;
}

interface AnalyzeResponse {
  match_score: number;
  message: string;
}

export const signup = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('[API] Signup request:', email);
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[API] Signup failed:', error);
    throw new Error(error.message || 'Signup failed');
  }

  const data = await response.json();
  console.log('[API] Signup successful, token received');
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('[API] Login request:', email);
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[API] Login failed:', error);
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  console.log('[API] Login successful, token received');
  return data;
};

export const analyze = async (
  resumeText: string,
  jobText: string,
  resumeFile?: File,
  jobFile?: File
): Promise<AnalyzeResponse> => {
  const token = localStorage.getItem('cc_token');
  
  console.log('[API] Analyze request - Token:', token ? `Present (length: ${token.length})` : 'Missing');
  
  if (!token) {
    console.error('[API] ❌ No authentication token found');
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('resume_text', resumeText);
  formData.append('job_text', jobText);
  
  if (resumeFile) {
    formData.append('resume', resumeFile);
    console.log('[API] Resume file attached:', resumeFile.name);
  }
  
  if (jobFile) {
    formData.append('job', jobFile);
    console.log('[API] Job file attached:', jobFile.name);
  }

  const authHeader = `Bearer ${token}`;
  console.log('[API] Authorization header:', authHeader.substring(0, 30) + '...');
  console.log('[API] Sending FormData analyze request');
  console.log('[API] FormData entries:', {
    resume_text: resumeText.substring(0, 50) + '...',
    job_text: jobText.substring(0, 50) + '...',
    resume_file: resumeFile?.name,
    job_file: jobFile?.name
  });
  
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      // NOTE: Do NOT set Content-Type - let fetch handle it for multipart/form-data
    },
    body: formData,
  };

  console.log('[API] Fetch options prepared', { method: fetchOptions.method, headers: Object.keys(fetchOptions.headers as Record<string, string>) });
  
  const response = await fetch(`${BASE_URL}/analyze`, fetchOptions);

  console.log('[API] Analyze response received');
  console.log('[API] Response status:', response.status);
  console.log('[API] Response OK:', response.ok);

  if (!response.ok) {
    if (response.status === 401) {
      console.error('[API] ❌ Unauthorized (401) - Session token invalid');
      localStorage.removeItem('cc_token');
      throw new Error('Session expired. Please login again.');
    }
    
    let errorMessage = 'Analysis failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      console.error('[API] ❌ Server error:', errorData);
    } catch (e) {
      console.error('[API] ❌ Could not parse error response');
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[API] ✅ Analyze successful:', data);
  return data;
};