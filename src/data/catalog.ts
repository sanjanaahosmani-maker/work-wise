import type { ExperienceLevel, InterviewQuestion, ResumeFormData, StudyPathMap } from '../types';

export const AVAILABLE_ROLES: string[] = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Data Analyst',
  'DevOps Engineer',
  'Cloud Architect',
  'Machine Learning Engineer',
  'Product Manager',
  'UI/UX Designer',
  'QA Engineer',
  'Security Engineer',
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'junior', label: 'Junior (0-2 yrs)' },
  { value: 'mid', label: 'Mid-Level (2-5 yrs)' },
  { value: 'senior', label: 'Senior (5+ yrs)' },
];

export const SAMPLE_RESUME_PROFILE: ResumeFormData = {
  name: 'Priya Nair',
  email: 'priya.nair@example.com',
  phone: '+1 (415) 555-0194',
  target_role: 'Full Stack Developer',
  education: 'B.S. in Computer Science, University of Washington (2020)',
  experience:
    'Software Engineer at Northstar Cloud (2021-2025)\n- Architected React and TypeScript customer portal serving 48,000 monthly active users, cutting initial page load time by 42%.\n- Built Node.js and PostgreSQL REST APIs with Redis caching, improving p95 response latency from 380ms to 110ms.\n- Led CI/CD migration to GitHub Actions and Docker, reducing deployment rollbacks by 60%.',
  skills: 'TypeScript, JavaScript, React, Node.js, Express, PostgreSQL, SQL, Docker, AWS, Git, REST APIs, CI/CD',
  projects:
    'PulseBoard Analytics: Built a real-time dashboard using React, WebSockets, and PostgreSQL supporting 500 concurrent team sessions.\nResumeLint CLI: Created an open-source keyword analyzer in TypeScript with 95% unit test coverage.',
  certifications: 'AWS Certified Developer - Associate (2023)',
};

export const SAMPLE_ATS_RESUME = `PRIYA NAIR
priya.nair@example.com | +1 (415) 555-0194 | Seattle, WA

PROFESSIONAL SUMMARY
Full Stack Developer with 4+ years of experience designing scalable React, TypeScript, and Node.js web applications.

EXPERIENCE
Software Engineer — Northstar Cloud (2021 - Present)
- Built React and TypeScript dashboards serving 48,000+ monthly active users with 42% faster load times.
- Engineered REST APIs with Node.js, Express, and PostgreSQL handling 1.2M daily requests.
- Implemented Docker containerization and GitHub Actions CI/CD pipelines.

EDUCATION
B.S. in Computer Science, University of Washington (2020)

SKILLS
TypeScript, JavaScript, React, Node.js, Express, PostgreSQL, SQL, REST APIs, Docker, AWS, Git, CI/CD

PROJECTS
PulseBoard Analytics — Real-time reporting workspace built with React, Node.js, and PostgreSQL.`;

export const SAMPLE_JOB_DESCRIPTION = `We are hiring a Full Stack Developer to build modern SaaS products.
Requirements:
- 3+ years of production experience with React, TypeScript, and Node.js
- Strong knowledge of REST APIs, PostgreSQL, SQL query optimization, and Redis caching
- Experience with Docker, Kubernetes, AWS, and automated CI/CD testing pipelines
- Familiarity with GraphQL, accessibility standards, and performance monitoring`;

export const CURATED_STUDY_PATHS: Record<string, StudyPathMap> = {
  'Frontend Developer': {
    beginner: [
      {
        topic: 'HTML Fundamentals',
        description: 'Learn semantic document structure, forms, landmarks, and accessibility basics.',
        importance: 'Foundation for every accessible, crawlable web interface.',
        key_points: ['Semantic elements', 'Forms & validation', 'ARIA landmarks', 'Document outline'],
        resources: ['MDN HTML Guide', 'W3C ARIA Authoring Practices', 'Web.dev Learn HTML'],
      },
      {
        topic: 'CSS Layout & Responsive Design',
        description: 'Master selectors, specificity, the box model, Flexbox, CSS Grid, and container queries.',
        importance: 'Essential for predictable cross-device layouts.',
        key_points: ['Box model & sizing', 'Flexbox alignment', 'CSS Grid tracks', 'Responsive breakpoints'],
        resources: ['MDN CSS Reference', 'CSS-Tricks Complete Guides', 'Can I Use'],
      },
      {
        topic: 'JavaScript Fundamentals',
        description: 'Variables, closures, prototypes, array transforms, ES6+ syntax, and the event loop.',
        importance: 'Core language powering browser runtime logic.',
        key_points: ['Scope & closures', 'Promises & async/await', 'Event loop & microtasks', 'DOM events'],
        resources: ['JavaScript.info', 'MDN JavaScript', 'Eloquent JavaScript'],
      },
    ],
    intermediate: [
      {
        topic: 'React Architecture & Hooks',
        description: 'Functional components, custom hooks, reconciliation, context boundaries, and effect hygiene.',
        importance: 'Dominant component model in modern frontend interviews.',
        key_points: ['State modeling', 'Effect dependencies', 'Custom hooks', 'Memoization trade-offs'],
        resources: ['React Official Docs', 'Patterns.dev', 'React TypeScript Cheatsheet'],
      },
      {
        topic: 'API Integration & State Synchronization',
        description: 'Fetch lifecycle, abort controllers, optimistic updates, error boundaries, and CORS.',
        importance: 'Critical for resilient client-server data flows.',
        key_points: ['AbortController cleanup', 'Retry & backoff', 'Loading/error states', 'HTTP caching'],
        resources: ['MDN Fetch API', 'HTTP Caching RFC Guide', 'REST Client Patterns'],
      },
    ],
    advanced: [
      {
        topic: 'Web Performance Optimization',
        description: 'Core Web Vitals, code splitting, tree shaking, rendering waterfalls, and memory profiling.',
        importance: 'Separates senior frontend engineers in production reviews.',
        key_points: ['LCP / INP / CLS', 'Lazy loading & bundles', 'Virtualization', 'DevTools profiling'],
        resources: ['Web.dev Core Web Vitals', 'Chrome DevTools Docs', 'High Performance Browser Networking'],
      },
      {
        topic: 'Frontend System Design',
        description: 'Designing scalable feeds, collaborative editors, design systems, and micro-frontends.',
        importance: 'Core component of senior and staff interview loops.',
        key_points: ['Normalized stores', 'Real-time sync', 'Component API design', 'Security (XSS/CSP)'],
        resources: ['GreatFrontEnd System Design', 'OWASP Frontend Cheat Sheet', 'Design Systems Handbook'],
      },
    ],
  },
  'Backend Developer': {
    beginner: [
      {
        topic: 'HTTP & REST Fundamentals',
        description: 'HTTP methods, status codes, idempotency, headers, cookies, and stateless API contracts.',
        importance: 'Backbone of every web service and microservice boundary.',
        key_points: ['Idempotent methods', 'Status code semantics', 'Headers & content negotiation', 'Pagination'],
        resources: ['MDN HTTP Overview', 'RESTful API Design Guide', 'RFC 9110 Summary'],
      },
      {
        topic: 'Relational Databases & SQL',
        description: 'Schema modeling, normalization, joins, transactions, and ACID guarantees.',
        importance: 'Reliable persistence underpins production backend systems.',
        key_points: ['Primary & foreign keys', 'INNER/LEFT joins', 'ACID transactions', 'Constraints'],
        resources: ['PostgreSQL Official Tutorial', 'Use The Index, Luke', 'SQLZoo'],
      },
    ],
    intermediate: [
      {
        topic: 'API Security & Authentication',
        description: 'Password hashing, JWT vs session cookies, RBAC, rate limiting, and input validation.',
        importance: 'Prevents account takeover, injection, and abuse.',
        key_points: ['scrypt/bcrypt hashing', 'Token verification', 'Rate limiting', 'OWASP API Top 10'],
        resources: ['OWASP API Security', 'Auth0 Security Docs', 'Node.js Security Checklist'],
      },
      {
        topic: 'Database Indexing & Query Tuning',
        description: 'B-Tree indexes, composite keys, EXPLAIN ANALYZE plans, N+1 queries, and connection pools.',
        importance: 'Prevents bottlenecks as data grows from thousands to millions of rows.',
        key_points: ['B-Tree vs Hash indexes', 'Query execution plans', 'N+1 mitigation', 'Read replicas'],
        resources: ['PostgreSQL Performance Docs', 'Use The Index, Luke', 'Designing Data-Intensive Applications'],
      },
    ],
    advanced: [
      {
        topic: 'Distributed Systems & Architecture',
        description: 'Load balancing, caching layers, message queues, consensus, and fault isolation.',
        importance: 'Essential for high-availability backend system design interviews.',
        key_points: ['CAP & PACELC trade-offs', 'Circuit breakers', 'Event-driven queues', 'Sharding'],
        resources: ['System Design Primer', 'Designing Data-Intensive Applications', 'AWS Well-Architected'],
      },
    ],
  },
  'Data Analyst': {
    beginner: [
      {
        topic: 'SQL Aggregation & Window Functions',
        description: 'GROUP BY, HAVING, CTEs, RANK, ROW_NUMBER, and rolling averages.',
        importance: 'Primary technical screen skill for analytics interviews.',
        key_points: ['CTEs vs subqueries', 'Window framing', 'NULL handling', 'Multi-table joins'],
        resources: ['Mode SQL Tutorial', 'PostgreSQL Window Functions', 'LeetCode Database'],
      },
      {
        topic: 'Data Cleaning & Validation',
        description: 'Detecting missing values, duplicates, schema drift, and outlier bias.',
        importance: 'Ensures executive dashboards reflect trustworthy numbers.',
        key_points: ['Imputation choices', 'Deduplication keys', 'Data lineage', 'Sanity checks'],
        resources: ['Tidy Data Paper', 'Pandas User Guide', 'dbt Testing Guide'],
      },
    ],
    intermediate: [
      {
        topic: 'KPI Design & Visualization',
        description: 'North-star metrics, funnel conversion, cohort retention, and clear chart selection.',
        importance: 'Translates raw tables into business decisions.',
        key_points: ['Cohort tables', 'Funnel drop-off', 'Leading vs lagging KPIs', 'Executive storytelling'],
        resources: ['Storytelling with Data', 'Tableau Public Gallery', 'Amplitude Product Analytics'],
      },
    ],
    advanced: [
      {
        topic: 'Experimentation & A/B Testing',
        description: 'Hypothesis framing, power analysis, p-values, novelty effects, and guardrail metrics.',
        importance: 'Key differentiator for senior product analytics roles.',
        key_points: ['Sample size calculation', 'Type I/II errors', 'Multiple testing', 'Guardrail metrics'],
        resources: ['Trustworthy Online Controlled Experiments', 'Evan Miller A/B Tools', 'Statsmodels Docs'],
      },
    ],
  },
};

export const CURATED_QUESTIONS: Record<string, Record<ExperienceLevel, InterviewQuestion[]>> = {
  'Frontend Developer': {
    junior: [
      {
        question: 'What is the difference between let, const, and var in JavaScript?',
        ideal_answer:
          'var is function-scoped and hoisted with undefined initialization. let and const are block-scoped and stay in the temporal dead zone until declared. const prevents reassignment of the binding while allowing mutation of object properties.',
        key_points: ['Function vs block scope', 'Hoisting & temporal dead zone', 'Reassignment vs immutability'],
        evaluation_criteria: ['Accurately explains scoping', 'Distinguishes const binding from deep freeze'],
      },
      {
        question: 'Explain the CSS Box Model and how box-sizing: border-box changes sizing.',
        ideal_answer:
          'Every element box consists of content, padding, border, and margin. With content-box (default), width applies only to content so padding and border expand total rendered size. With border-box, width and height include padding and border, making responsive layouts predictable.',
        key_points: ['Content, padding, border, margin', 'content-box vs border-box', 'Layout predictability'],
        evaluation_criteria: ['Names all four layers', 'Explains border-box behavior clearly'],
      },
      {
        question: 'How does event delegation work in the DOM and when is it useful?',
        ideal_answer:
          'Event delegation attaches a single listener to a common ancestor instead of individual child nodes, relying on event bubbling. It reduces memory overhead for large lists and automatically handles dynamically added elements.',
        key_points: ['Event bubbling', 'event.target vs event.currentTarget', 'Dynamic elements & memory savings'],
        evaluation_criteria: ['Explains bubbling mechanism', 'Gives a concrete list/table example'],
      },
    ],
    mid: [
      {
        question: 'How does React reconciliation work, and why do stable keys matter in lists?',
        ideal_answer:
          'React compares the previous and next element trees to compute minimal DOM mutations. Stable, unique keys let React match existing component instances across reorders or insertions; using array indices can cause stale local state and unnecessary DOM updates.',
        key_points: ['Virtual tree diffing', 'Component instance identity', 'Pitfalls of index keys'],
        evaluation_criteria: ['Connects keys to state preservation', 'Identifies reordering bugs'],
      },
      {
        question: 'How do you prevent race conditions when fetching data inside React effects?',
        ideal_answer:
          'Use an AbortController in the effect cleanup to cancel superseded requests, or track a local cancelled boolean so stale responses are ignored. Better yet, lift async caching to a query library that deduplicates and cancels requests automatically.',
        key_points: ['AbortController cleanup', 'Stale response guarding', 'Dependency array accuracy'],
        evaluation_criteria: ['Demonstrates cleanup function usage', 'Explains out-of-order response risk'],
      },
    ],
    senior: [
      {
        question: 'How would you diagnose and optimize a sluggish large-scale React application?',
        ideal_answer:
          'Start by profiling with React DevTools and Chrome Performance to measure actual bottlenecks rather than guessing. Common wins include route/component code splitting, virtualizing long lists, colocating state to shrink re-render subtrees, memoizing expensive derivations, and eliminating network waterfalls.',
        key_points: ['Measure-first profiling', 'State colocation', 'List virtualization', 'Bundle & waterfall optimization'],
        evaluation_criteria: ['Prioritizes profiling over premature memoization', 'Covers both JS and network bottlenecks'],
      },
    ],
  },
  'Backend Developer': {
    junior: [
      {
        question: 'Explain the difference between PUT and PATCH in a RESTful API.',
        ideal_answer:
          'PUT replaces the entire target resource at a URI and is idempotent—repeating the exact same PUT leaves the resource in the same state. PATCH applies a partial modification to specific fields and is not strictly idempotent unless designed carefully.',
        key_points: ['Full replacement vs partial update', 'Idempotency semantics', 'Status codes (200/204)'],
        evaluation_criteria: ['Clearly distinguishes semantics', 'Understands idempotency'],
      },
      {
        question: 'What is SQL injection and how do you prevent it?',
        ideal_answer:
          'SQL injection happens when untrusted user input is concatenated into a SQL string, letting attackers alter query logic. Prevent it by always using parameterized queries / prepared statements, strict input validation, and least-privilege database roles.',
        key_points: ['Parameterized queries', 'Separation of code and data', 'Least privilege'],
        evaluation_criteria: ['Explains root cause', 'Recommends prepared statements over manual escaping'],
      },
    ],
    mid: [
      {
        question: 'How do database indexes speed up reads, and what trade-offs do they introduce?',
        ideal_answer:
          'B-Tree indexes keep sorted pointers to table rows, turning O(N) full table scans into O(log N) lookups. Trade-offs include extra disk/memory storage and slower INSERT/UPDATE/DELETE operations because every write must also maintain the index structures.',
        key_points: ['B-Tree lookup complexity', 'Write amplification', 'Storage overhead', 'Composite index column order'],
        evaluation_criteria: ['Balances read gains vs write costs', 'Mentions selectivity or column order'],
      },
      {
        question: 'Explain the CAP theorem and give a real-world system trade-off.',
        ideal_answer:
          'During a network partition, a distributed datastore must choose between Consistency (every read sees the latest write or errors) and Availability (every non-failing node returns a response, potentially stale). Banking ledgers favor CP, whereas shopping carts or social feeds often favor AP with eventual consistency.',
        key_points: ['Partition tolerance is mandatory', 'CP vs AP choices', 'Concrete domain examples'],
        evaluation_criteria: ['Explains partition constraint accurately', 'Gives practical examples'],
      },
    ],
    senior: [
      {
        question: 'How would you design an idempotent payment processing API at scale?',
        ideal_answer:
          'Require clients to send a unique Idempotency-Key header stored alongside a request hash in a transactional database table. Wrap ledger writes and idempotency key commits in a single atomic transaction, use asynchronous queues with outbox patterns for downstream webhooks, and return the cached response on retries.',
        key_points: ['Idempotency keys', 'Atomic DB transactions', 'Transactional outbox', 'Retry safety'],
        evaluation_criteria: ['Handles concurrent duplicate requests', 'Prevents double-charging under network timeouts'],
      },
    ],
  },
};
