import React, { useState } from 'react';
import { AdminGuard } from '../components/AdminGuard';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('idle');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header manually, let browser set boundary
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed');
      }

      setStatus('success');
      setMessage(`Upload successful! Processed ${result.records_processed} records.`);
      setFile(null); // Reset file after success
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Upload className="text-indigo-600" />
          Update PM2.5 Data
        </h2>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload CSV / Excel File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">
                  CSV or Excel files only (max 10MB)
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Preview */}
          {file && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-6 border border-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="text-slate-500" size={20} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload & Process
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-emerald-700">
              <CheckCircle className="shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium">Success</h4>
                <p className="text-sm mt-1">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium">Error</h4>
                <p className="text-sm mt-1">{message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h3>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-2">
            <li>Ensure the file follows the standard format (Date, Time, Station ID columns).</li>
            <li>Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>.</li>
            <li>Duplicate records for the same station/date/time will be updated.</li>
            <li>Processing large files may take a few moments.</li>
          </ul>
        </div>
      </div>
    </AdminGuard>
  );
}
