import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { AVAILABLE_ROLES, SAMPLE_RESUME_PROFILE } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type { ResumeFormData, ResumeOptimization } from '../types';
import type { ResumeDownloadFormat } from '../utils/fileParsing';
import { exportResumeFile } from '../utils/resumeExport';
import { parseResumeMarkdown } from '../utils/resumeHelpers';

interface ResumeBuilderPageProps {
  onResumeGenerated: (resumeText: string) => void;
  onSendToAts: (resumeText: string) => void;
}

const EMPTY_FORM: ResumeFormData = {
  name: '',
  email: '',
  phone: '',
  target_role: '',
  education: '',
  experience: '',
  skills: '',
  projects: '',
  certifications: '',
};

export function ResumeBuilderPage({
  onResumeGenerated,
  onSendToAts,
}: ResumeBuilderPageProps) {
  const [form, setForm] = useState<ResumeFormData>(EMPTY_FORM);
  const [resumeMarkdown, setResumeMarkdown] = useState('');
  const [optimization, setOptimization] = useState<ResumeOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<ResumeDownloadFormat>('pdf');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const updateField = <K extends keyof ResumeFormData>(key: K, value: ResumeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLoadSample = () => {
    setForm(SAMPLE_RESUME_PROFILE);
    setError('');
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setResumeMarkdown('');
    setOptimization(null);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.target_role.trim() ||
      !form.skills.trim()
    ) {
      setError('Please fill in Full Name, Email, Target Role, and Skills before generating.');
      return;
    }

    setLoading(true);
    try {
      const genRes = await apiRequest<{ success: boolean; resume: string }>(
        '/resume/generate',
        {
          method: 'POST',
          body: JSON.stringify(form),
        }
      );

      setResumeMarkdown(genRes.resume);
      onResumeGenerated(genRes.resume);

      // Fetch optimization suggestions (non-blocking)
      try {
        const optRes = await apiRequest<{
          success: boolean;
          suggestions: ResumeOptimization;
        }>('/resume/optimize', {
          method: 'POST',
          body: JSON.stringify({
            resume_text: genRes.resume,
            target_role: form.target_role,
          }),
        });
        setOptimization(optRes.suggestions);
      } catch {
        setOptimization(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!resumeMarkdown) return;
    try {
      await navigator.clipboard.writeText(resumeMarkdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard in this browser context.');
    }
  };

  const handleDownload = async () => {
    if (!resumeMarkdown || downloading) return;
    setError('');
    setDownloading(true);
    try {
      await exportResumeFile(resumeMarkdown, form.name, downloadFormat);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to export resume as .${downloadFormat}.`
      );
    } finally {
      setDownloading(false);
    }
  };

  const parsedBlocks = resumeMarkdown ? parseResumeMarkdown(resumeMarkdown) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resume Builder</h1>
          <p className="text-sm text-slate-600 mt-1">
            Enter your profile details to generate an ATS-friendly resume and role-specific optimization tips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Load Sample Profile
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Input Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 no-print"
        >
          <div className="pb-2.5 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Candidate Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fields marked with * are required.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rb-name" className="block text-xs font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                id="rb-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Priya Nair"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="rb-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                id="rb-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rb-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                id="rb-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (415) 555-0194"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="rb-role" className="block text-xs font-medium text-slate-700 mb-1">
                Target Role *
              </label>
              <select
                id="rb-role"
                value={form.target_role}
                onChange={(e) => updateField('target_role', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a role...</option>
                {AVAILABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rb-skills" className="block text-xs font-medium text-slate-700 mb-1">
              Skills *
            </label>
            <textarea
              id="rb-skills"
              rows={2}
              value={form.skills}
              onChange={(e) => updateField('skills', e.target.value)}
              placeholder="TypeScript, React, Node.js, PostgreSQL, Docker, AWS"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="rb-experience" className="block text-xs font-medium text-slate-700 mb-1">
              Work Experience
            </label>
            <textarea
              id="rb-experience"
              rows={3}
              value={form.experience}
              onChange={(e) => updateField('experience', e.target.value)}
              placeholder="Role, company, dates, and measurable accomplishments..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rb-education" className="block text-xs font-medium text-slate-700 mb-1">
                Education
              </label>
              <textarea
                id="rb-education"
                rows={2}
                value={form.education}
                onChange={(e) => updateField('education', e.target.value)}
                placeholder="B.S. in Computer Science (2020)"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="rb-certifications"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Certifications
              </label>
              <textarea
                id="rb-certifications"
                rows={2}
                value={form.certifications}
                onChange={(e) => updateField('certifications', e.target.value)}
                placeholder="AWS Certified Developer"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rb-projects" className="block text-xs font-medium text-slate-700 mb-1">
              Projects
            </label>
            <textarea
              id="rb-projects"
              rows={2}
              value={form.projects}
              onChange={(e) => updateField('projects', e.target.value)}
              placeholder="Key personal or production projects..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating Resume...
              </>
            ) : (
              'Generate Resume'
            )}
          </button>
        </form>

        {/* Output Preview & Optimization Column */}
        <div className="lg:col-span-7 space-y-6">
          {resumeMarkdown ? (
            <>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Generated Resume</h2>
                    <p className="text-xs text-slate-500">
                      Tailored for {form.target_role}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                      <select
                        aria-label="Download format"
                        value={downloadFormat}
                        onChange={(e) => setDownloadFormat(e.target.value as ResumeDownloadFormat)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border-r border-slate-200 focus:outline-none"
                      >
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="docx">Word (.docx)</option>
                        <option value="md">Markdown (.md)</option>
                        <option value="txt">Plain Text (.txt)</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
                      >
                        {downloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Download .{downloadFormat}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendToAts(resumeMarkdown)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Check in ATS
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Safe React Document Renderer */}
                <article
                  aria-label="Formatted resume preview"
                  className="p-6 sm:p-8 space-y-3 text-slate-800"
                >
                  {parsedBlocks.map((block, idx) => {
                    if (block.type === 'h1') {
                      return (
                        <h3
                          key={idx}
                          className="text-2xl font-bold tracking-tight text-slate-900"
                        >
                          {block.text}
                        </h3>
                      );
                    }
                    if (block.type === 'contact') {
                      return (
                        <p key={idx} className="text-sm text-slate-500 pb-3 border-b border-slate-200">
                          {block.text}
                        </p>
                      );
                    }
                    if (block.type === 'h2') {
                      return (
                        <h4
                          key={idx}
                          className="text-sm font-bold tracking-wide text-slate-900 pt-4 pb-1 border-b border-slate-200"
                        >
                          {block.text}
                        </h4>
                      );
                    }
                    if (block.type === 'h3') {
                      return (
                        <h5 key={idx} className="text-sm font-semibold text-slate-900 pt-1">
                          {block.text}
                        </h5>
                      );
                    }
                    if (block.type === 'bullet') {
                      return (
                        <p key={idx} className="text-sm leading-relaxed pl-4 relative text-slate-700">
                          <span
                            className="absolute left-0 top-0 text-slate-400"
                            aria-hidden="true"
                          >
                            •
                          </span>
                          {block.text}
                        </p>
                      );
                    }
                    return (
                      <p key={idx} className="text-sm leading-relaxed text-slate-700">
                        {block.text}
                      </p>
                    );
                  })}
                </article>
              </div>

              {optimization && (
                <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 no-print">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Optimization Suggestions
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Targeted recommendations for {form.target_role} screening
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                        High-Value Role Keywords
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {optimization.keywords.join(' · ')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                        Recommended Action Verbs
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {optimization.action_verbs.join(' · ')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">
                        Key Improvements
                      </h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                        {optimization.improvements.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-4">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1.5">
                Ready to build your resume
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                Complete your profile on the left and click Generate Resume to draft a clean,
                ATS-ready resume tailored to your target role.
              </p>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Try with Sample Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
