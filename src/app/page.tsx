'use client';

import { useState, useRef, useEffect } from 'react';

interface Job {
  id: string;
  status: string;
  originalFilename: string;
  originalFileSize: number;
  processedFilename?: string;
  processedFileSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.jobs) {
        setHistory(data.jobs);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop an audio file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('audio', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const jobId = uploadData.jobId;

      setUploading(false);
      setProcessing(true);

      // Process audio
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const processData = await processRes.json();

      // Get final job status
      const statusRes = await fetch(`/api/status/${jobId}`);
      const jobData = await statusRes.json();
      
      setCurrentJob(jobData);
      setProcessing(false);
      loadHistory();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCurrentJob(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Noise Remover</h1>
                <p className="text-sm text-purple-200">Professional Background Noise Removal</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all border border-white/20"
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!showHistory ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Upload Audio File</h2>
              
              {!currentJob ? (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-purple-400 bg-purple-400/20'
                        : 'border-white/30 hover:border-purple-400 hover:bg-white/5'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <svg className="w-16 h-16 mx-auto mb-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    
                    {file ? (
                      <div>
                        <p className="text-white font-semibold mb-2">{file.name}</p>
                        <p className="text-purple-200 text-sm">{formatFileSize(file.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-semibold mb-2">
                          Drop your audio file here
                        </p>
                        <p className="text-purple-200 text-sm">
                          or click to browse
                        </p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleUploadAndProcess}
                    disabled={!file || uploading || processing}
                    className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Uploading...</span>
                      </>
                    ) : processing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Removing Noise...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span>Clean Audio</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Processing Complete!</h3>
                    <p className="text-purple-200">Your audio has been cleaned successfully</p>
                  </div>

                  {/* Audio Players */}
                  <div className="space-y-4">
                    {/* Original Audio Player */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">Original Audio</h4>
                          <p className="text-purple-300 text-xs">With background noise</p>
                        </div>
                      </div>
                      <audio 
                        controls 
                        className="w-full"
                        src={`/api/play-original/${currentJob.originalFilename}`}
                        preload="metadata"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>

                    {/* Cleaned Audio Player */}
                    {currentJob.processedFilename && (
                      <div className="bg-white/5 rounded-xl p-4 border border-green-500/30">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">Cleaned Audio</h4>
                            <p className="text-green-300 text-xs">AI noise removed</p>
                          </div>
                        </div>
                        <audio 
                          controls 
                          className="w-full"
                          src={`/api/play-processed/${currentJob.processedFilename}`}
                          preload="metadata"
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-purple-200">Original Size:</span>
                      <span className="text-white font-semibold">{formatFileSize(currentJob.originalFileSize)}</span>
                    </div>
                    {currentJob.processedFileSize && (
                      <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-purple-200">Processed Size:</span>
                        <span className="text-white font-semibold">{formatFileSize(currentJob.processedFileSize)}</span>
                      </div>
                    )}
                  </div>

                  {currentJob.processedFilename && (
                    <a
                      href={`/api/download/${currentJob.processedFilename}`}
                      download
                      className="block w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg text-center"
                    >
                      Download Cleaned Audio
                    </a>
                  )}

                  <button
                    onClick={handleReset}
                    className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
                  >
                    Process Another File
                  </button>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Upload Audio</h3>
                      <p className="text-purple-200 text-sm">Upload your audio file with background noise (MP3, WAV, OGG, etc.)</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">AI Processing</h3>
                      <p className="text-purple-200 text-sm">Our AI removes noise and enhances voice to sound sweet and pleasant - perfect for tutorials!</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Download Result</h3>
                      <p className="text-purple-200 text-sm">Get your crystal-clear audio file instantly</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">AI Features</h2>
                <ul className="space-y-3">
                  {[
                    'Sweet, pleasant voice quality 🎙️',
                    'Perfect for tutorials & podcasts',
                    'Removes fan & AC noise',
                    'Eliminates air & wind sounds',
                    'Removes breath sounds',
                    'Dereverb (removes echo)',
                    'Warm, natural voice tone',
                    'Reduces harsh frequencies',
                    'Broadcast-quality output',
                    'Compare original vs cleaned',
                    'Listen before download',
                    'Fast processing (~200ms)'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-purple-200">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* History Section */
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Processing History</h2>
            {history.length === 0 ? (
              <p className="text-purple-200 text-center py-8">No processing history yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((job) => (
                  <div key={job.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{job.originalFilename}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        job.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        job.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                        job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-purple-300">Original: </span>
                        <span className="text-white">{formatFileSize(job.originalFileSize)}</span>
                      </div>
                      {job.processedFileSize && (
                        <div>
                          <span className="text-purple-300">Processed: </span>
                          <span className="text-white">{formatFileSize(job.processedFileSize)}</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-purple-300">Date: </span>
                        <span className="text-white">{formatDate(job.createdAt)}</span>
                      </div>
                    </div>
                    {job.processedFilename && (
                      <a
                        href={`/api/download/${job.processedFilename}`}
                        download
                        className="mt-3 inline-block px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition-all text-sm"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-lg border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-purple-200 text-sm">
            © 2024 AI Noise Remover. Professional background noise removal powered by advanced algorithms.
          </p>
        </div>
      </footer>
    </div>
  );
}
