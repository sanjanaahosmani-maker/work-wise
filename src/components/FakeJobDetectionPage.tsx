import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export function FakeJobDetectionPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sourceUrlOrEmail, setSourceUrlOrEmail] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = (e: FormEvent) => {
    // UI-only component: detection logic intentionally not wired
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fake Job Detection</h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect job postings, recruiter contacts, and offer details for common recruitment scam signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Form Column */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-4"
        >
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Job Posting Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the listing metadata and full posting text to inspect.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fjd-title" className="block text-xs font-medium text-slate-700 mb-1">
                Job Title
              </label>
              <input
                id="fjd-title"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Remote Junior Software Engineer"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="fjd-company" className="block text-xs font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                id="fjd-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Northstar Systems"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fjd-source" className="block text-xs font-medium text-slate-700 mb-1">
                Recruiter Email or Job URL
              </label>
              <input
                id="fjd-source"
                type="text"
                value={sourceUrlOrEmail}
                onChange={(e) => setSourceUrlOrEmail(e.target.value)}
                placeholder="e.g., careers@company.com or https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="fjd-salary" className="block text-xs font-medium text-slate-700 mb-1">
                Offered Compensation
              </label>
              <input
                id="fjd-salary"
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="e.g., $95,000 - $120,000 / yr"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="fjd-description"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Job Description / Recruiter Message
            </label>
            <textarea
              id="fjd-description"
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job listing, interview invitation, or offer message here..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            Analyze Job Posting
          </button>
        </form>

        {/* Results / Verification Signals Column */}
        <div className="lg:col-span-5 space-y-6">
          <section
            aria-label="Authenticity assessment preview"
            className="bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-slate-500">Authenticity Risk Score</p>
                <p className="mt-1 text-3xl font-bold font-mono tabular-nums text-slate-900">
                  —<span className="text-base font-normal text-slate-500">/100</span>
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-slate-700 mb-3">
                Verification Signals
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                    Official company domain match
                  </span>
                  <span className="text-slate-500">Pending</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                    Recruiter contact verification
                  </span>
                  <span className="text-slate-500">Pending</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                    Compensation range realism
                  </span>
                  <span className="text-slate-500">Pending</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                    Upfront payment or equipment fee flags
                  </span>
                  <span className="text-slate-500">Pending</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 mb-1.5">Detected Red Flags</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Submit a job posting on the left to view domain checks, urgency phrasing alerts,
                and recruiter verification signals here.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
