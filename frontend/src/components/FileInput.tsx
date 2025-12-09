import React from 'react';
import { Upload } from 'lucide-react';

interface FileInputProps {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
  file: File | null;
}

const FileInput: React.FC<FileInputProps> = ({ label, accept, onChange, file }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">PDF, DOCX, DOC, TXT or ODT files</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileInput;