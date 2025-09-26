'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'application/json') {
      setError('Please upload a JSON file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Call analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to analyze data');
      }

      const result = await response.json();
      
      // Redirect to hosts page
      router.push('/hosts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      
      setIsUploading(true);
      setError(null);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to analyze data');
      }

      const result = await response.json();
      router.push('/hosts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON data in clipboard');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Censys Data Summarization Agent
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Upload Censys host data to generate AI-powered security summaries
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="application/json"
              onChange={handleFileInput}
              disabled={isUploading}
            />
            
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <span className="text-lg font-medium text-gray-900">
                Drop JSON file here or{' '}
                <span className="text-blue-600 hover:text-blue-500">browse</span>
              </span>
            </label>
            
            <p className="text-sm text-gray-500 mt-2">
              Supports Censys host data in JSON format
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-500">or</span>
            <button
              onClick={handlePasteData}
              disabled={isUploading}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              Paste from clipboard
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isUploading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">Processing data...</p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Sample Data</h3>
            <p className="text-sm text-gray-500">
              You can use the provided <code className="bg-gray-100 px-1 py-0.5 rounded">hosts_dataset.json</code> file 
              to test the application.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}