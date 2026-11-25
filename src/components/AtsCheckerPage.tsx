import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  CheckCircle2,
  FileSearch,
  FileUp,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SAMPLE_ATS_RESUME, SAMPLE_JOB_DESCRIPTION } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type { AtsAnalysisResult, AtsDeepReview } from '../types';
import {
  ACCEPTED_RESUME_EXTENSIONS,
  getSupportedExtension,
  isSupportedResumeExtension,
  MAX_RESUME_FILE_BYTES,
} from '../utils/fileParsing';

interface AtsCheckerPageProps {
  initialResumeText: string;
  onAnalysisComplete: (score: number) => void;
}

export function AtsCheckerPage({
  initialResumeText,
  onAnalysisComplete,
}: AtsCheckerPageProps) {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);
  const [deepReview, setDeepReview] = useState<AtsDeepReview | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewingAi, setReviewingAi] = useState(false);
  const [extractingFile, setExtractingFile] = useState(false);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    type: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialResumeText) {
      setResumeText(initialResumeText);
    }
  }, [initialResumeText]);

  const handleLoadSample = () => {
    setResumeText(SAMPLE_ATS_RESUME);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setUploadedFileMeta(null);
    setError('');
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read uploaded file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
      reader.readAsDataURL(file);
    });

  const processSelectedFile = async (file: File) => {
    setError('');
    const ext = getSupportedExtension(file.name);
    if (ext === '.doc') {
      setError('Legacy .doc files are not supported directly. Please save as .docx, .pdf, or .txt.');
      return;
    }
    if (!isSupportedResumeExtension(ext)) {
      setError(
        `Unsupported file type (${ext || 'unknown'}). Upload PDF, DOCX, TXT, MD, RTF, or HTML.`
      );
      return;
    }
    if (file.size === 0) {
      setError('Uploaded file appears to be empty.');
      return;
    }
    if (file.size > MAX_RESUME_FILE_BYTES) {
      setError('File exceeds the 5 MB size limit.');
      return;
    }

    setExtractingFile(true);
    try {
      const base64 = await readFileAsBase64(file);
      const res = await apiRequest<{
        success: boolean;
        text: string;
        file_name: string;
        file_type: string;
      }>('/ats/extract-file', {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          content_base64: base64,
        }),
      });
      setResumeText(res.text);
      setUploadedFileMeta({ name: res.file_name, type: res.file_type });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from uploaded file.');
    } finally {
      setExtractingFile(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDeepReview(null);

    if (!resumeText.trim()) {
      setError('Paste your resume text first.');
      return;
    }

    setAnalyzing(true);
    try {
      const data = await apiRequest<AtsAnalysisResult & { success: boolean }>(
        '/ats/analyze',
        {
          method: 'POST',
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );
      setResult(data);
      onAnalysisComplete(data.score);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeepReview = async () => {
    if (!resumeText.trim()) {
      setError('Paste your resume text first.');
      return;
    }
    setError('');
    setReviewingAi(true);
    try {
      const res = await apiRequest<{ success: boolean; review: AtsDeepReview }>(
        '/ats/deep-review',
        {
          method: 'POST',
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );
      setDeepReview(res.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run AI deep review.');
    } finally {
      setReviewingAi(false);
    }
  };

  const scoreLabel =
    result === null
      ? ''
      : result.score >= 80
        ? 'Strong ATS Fit'
        : result.score >= 60
          ? 'Moderate Fit — Needs Keywords'
          : 'Low ATS Fit — Action Required';

  const scoreColorClass =
    result === null
      ? 'text-slate-900'
      : result.score >= 80
        ? 'text-emerald-600'
        : result.score >= 60
          ? 'text-amber-600'
          : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ATS Resume Checker</h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit resume structure, contact completeness, and keyword alignment against a target job description.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          Load Sample Resume &amp; JD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Column */}
        <form
          onSubmit={handleAnalyze}
          noValidate
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label htmlFor="ats-resume" className="block text-sm font-medium text-slate-800">
                Resume Text *
              </label>
              <span className="text-xs text-slate-500">
                Paste text below or upload a resume file
              </span>
            </div>

            {/* File Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mb-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
                isDragging
                  ? 'border-teal-600 bg-teal-50/70'
                  : 'border-slate-300 bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                id="ats-file-upload"
                type="file"
                accept={ACCEPTED_RESUME_EXTENSIONS.join(',')}
                onChange={handleFileInputChange}
                className="sr-only"
                aria-label="Upload resume file"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-teal-600">
                    {extractingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    {uploadedFileMeta ? (
                      <p className="text-xs font-medium text-slate-800 truncate">
                        Loaded {uploadedFileMeta.name} ({uploadedFileMeta.type})
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-slate-700">
                        {extractingFile ? 'Extracting resume text...' : 'Drop a resume file or browse'}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Supports PDF, DOCX, TXT, MD, RTF, HTML (max 5 MB)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {uploadedFileMeta && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileMeta(null);
                        setResumeText('');
                      }}
                      aria-label="Clear uploaded file"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={extractingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Upload File
                  </button>
                </div>
              </div>
            </div>

            <textarea
              id="ats-resume"
              rows={9}
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (uploadedFileMeta) setUploadedFileMeta(null);
              }}
              placeholder="Paste your plain-text or Markdown resume here, or upload PDF / DOCX / TXT above..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label htmlFor="ats-jd" className="block text-sm font-medium text-slate-800 mb-1.5">
              Job Description (Optional)
            </label>
            <textarea
              id="ats-jd"
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description to compare required keywords..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={analyzing}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing...
                </>
              ) : (
                'Analyze Resume'
              )}
            </button>
            <button
              type="button"
              onClick={handleDeepReview}
              disabled={reviewingAi || !resumeText.trim()}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {reviewingAi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reviewing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-teal-600" aria-hidden="true" />
                  AI Recruiter Review
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Column */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              aria-label="ATS analysis results"
              className="bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-6"
            >
              <div className="flex items-baseline justify-between pb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs font-medium text-slate-500">Overall ATS Score</p>
                  <p className={`mt-1 text-4xl font-bold font-mono tabular-nums ${scoreColorClass}`}>
                    {result.score}
                    <span className="text-lg font-normal text-slate-400">/100</span>
                  </p>
                </div>
                <p className={`text-xs font-semibold ${scoreColorClass}`}>{scoreLabel}</p>
              </div>

              {result.keyword_match !== null && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">Job Description Keyword Match</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {result.keyword_match}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.keyword_match}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-teal-600 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Structural Checklist */}
              <div>
                <h2 className="text-xs font-semibold text-slate-700 mb-2.5">
                  Section &amp; Contact Checks
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ['Experience section', result.section_checks.experience],
                      ['Education section', result.section_checks.education],
                      ['Skills section', result.section_checks.skills],
                      ['Projects section', result.section_checks.projects],
                      ['Email address', result.section_checks.email],
                      ['Phone number', result.section_checks.phone],
                    ] as const
                  ).map(([label, passed]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      {passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
                      )}
                      <span className={passed ? 'text-slate-700' : 'text-slate-500'}>
                        {label} — {passed ? 'Found' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched / Missing Keywords */}
              {result.keyword_match !== null && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <h2 className="text-xs font-semibold text-emerald-700 mb-1">
                      Matched Keywords ({result.matched_keywords.length})
                    </h2>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {result.matched_keywords.length > 0
                        ? result.matched_keywords.join(' · ')
                        : 'No direct keyword overlap detected yet.'}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-xs font-semibold text-amber-700 mb-1">
                      Missing Keywords ({result.missing_keywords.length})
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {result.missing_keywords.length > 0
                        ? result.missing_keywords.join(' · ')
                        : 'No missing keywords detected.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="pt-4 border-t border-slate-100">
                <h2 className="text-xs font-semibold text-slate-700 mb-2">Recommendations</h2>
                <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </motion.section>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl card-elevated p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-4">
                <FileSearch className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1.5">
                Ready for ATS analysis
              </h2>
              <p className="text-sm text-slate-500">
                Paste your resume and an optional job description on the left to inspect ATS readiness and keyword gaps.
              </p>
            </div>
          )}

          {deepReview && (
            <section
              aria-label="AI recruiter deep review"
              className="bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-4"
            >
              <h2 className="text-base font-semibold text-slate-900">AI Recruiter Deep Review</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{deepReview.summary}</p>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-emerald-700 mb-1.5">Strengths</h3>
                <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
                  {deepReview.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-amber-700 mb-1.5">Gaps to Address</h3>
                <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
                  {deepReview.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                  Stronger Bullet Rewrites
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                  {deepReview.rewritten_bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
