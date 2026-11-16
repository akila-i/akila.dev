/**
 * The single source of truth for akila.dev.
 *
 * Every rendering reads from `profile`: the human page, the YAML view,
 * /akila.yaml, /akila.json and (later) the `curl akila.dev` card.
 * It is validated with Zod when the module loads, so a bad edit fails the build.
 */
import { z } from 'zod';

/* ----------------------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------------------- */

const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');
const Href = z.url({ protocol: /^https$/ });
const Text = z.string().trim().min(1);

export const PostSchema = z.object({
  title: Text,
  venue: Text,
  date: z.iso.date(),
  href: Href,
});

const LinkSchema = z.object({ label: Text, href: Href });

const HighlightSchema = z.object({
  what: Text,
  links: z.array(LinkSchema).min(1),
});

/** edu, work and oss map to the trace legend: education, industry, open source. */
export const SpanKindSchema = z.enum(['edu', 'work', 'oss']);
export const KIND_LABEL = { edu: 'education', work: 'industry', oss: 'open source' } as const;

export const SpanSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    /** org.role in lowerCamelCase, e.g. wso2.seniorSoftwareEngineer */
    name: z.string().regex(/^[a-z0-9]+\.[a-z][a-zA-Z]*$/, 'expected org.role in lowerCamelCase'),
    kind: SpanKindSchema,
    /** First month, inclusive. */
    start: YearMonth,
    /** Last month, inclusive. null means ongoing. */
    end: YearMonth.nullable(),
    summary: Text,
    attrs: z.record(z.string(), Text),
    highlights: z.array(HighlightSchema),
  })
  .refine((s) => s.end === null || s.end >= s.start, { message: 'span ends before it starts' });

const RoleSchema = z.object({
  title: Text,
  org: Text,
  /** Set for project roles, e.g. "CNCF Sandbox". */
  note: Text.optional(),
  href: Href.optional(),
});

const IngressSchema = z.object({
  via: z.string().regex(/^[a-z]+$/),
  to: Text,
  href: Href,
});

export const ProfileSchema = z
  .object({
    name: Text,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    summary: Text,
    handles: z.object({ github: Text, linkedin: Text, medium: Text }),
    roles: z.array(RoleSchema).min(1),
    location: z.object({
      city: Text,
      country: Text,
      countryCode: z.string().regex(/^[A-Z]{2}$/),
      timeZone: Text,
      utcOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/),
    }),
    labels: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
    condition: z.object({
      type: Text,
      status: z.enum(['True', 'False', 'Unknown']),
      reason: z.string().regex(/^[A-Z][A-Za-z]+$/, 'expected a CamelCase reason'),
      message: Text,
    }),
    focus: z.array(z.object({ name: z.string().regex(/^[a-z-]+$/), text: Text, stack: z.array(Text).min(1) })).min(1),
    writing: z.array(PostSchema),
    ingress: z.array(IngressSchema).min(1),
    career: z.array(SpanSchema).min(1),
    /** The trace row that starts expanded. */
    openSpan: z.string(),
  })
  .superRefine((p, ctx) => {
    const ids = p.career.map((s) => s.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'career span ids must be unique', path: ['career'] });
    if (!ids.includes(p.openSpan)) ctx.addIssue({ code: 'custom', message: `openSpan "${p.openSpan}" is not a career span id`, path: ['openSpan'] });
    try {
      new Intl.DateTimeFormat('en', { timeZone: p.location.timeZone });
    } catch {
      ctx.addIssue({ code: 'custom', message: `unknown time zone "${p.location.timeZone}"`, path: ['location', 'timeZone'] });
    }
  });

export type Post = z.infer<typeof PostSchema>;
export type Span = z.infer<typeof SpanSchema>;
export type SpanKind = z.infer<typeof SpanKindSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

/* ----------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------- */

const GH = 'https://github.com/';

const posts = {
  cncf: {
    title: 'OpenTelemetry-powered distributed tracing and Kubernetes events in OpenChoreo',
    venue: 'CNCF blog',
    date: '2026-10-27',
    href: 'https://www.cncf.io/blog/2026/10/27/opentelemetry-powered-distributed-tracing-and-kubernetes-events-in-openchoreo/',
  },
  cilium: {
    title: 'Zero-Trust Developer Platforms with Cilium Network Policies',
    venue: 'cilium.io blog',
    date: '2026-08-28',
    href: 'https://cilium.io/blog/2026/08/28/zero-trust-developer-platforms-with-cilium-network-policies/',
  },
  alerting: {
    title: 'Alerting at Scale with OpenChoreo: How an IDP Takes Monitoring Off Your Plate',
    venue: 'Medium',
    date: '2026-04-17',
    href: 'https://akila-i.medium.com/alerting-at-scale-with-openchoreo-how-an-idp-takes-monitoring-off-your-plate-6454769c2447',
  },
  gsoc: {
    title: 'GSoC 2023: A Tale of Summer, Code, and Learning',
    venue: 'Learning Equality on Medium',
    date: '2023-09-27',
    href: 'https://medium.com/learning-equality/gsoc-2023-a-tale-of-summer-code-and-learning-79cb33301eac',
  },
  azure: {
    title: 'Deploy Azure Logic Apps with API Connections Using the Layering Method with Terraform',
    venue: 'Medium',
    date: '2023-04-03',
    href: 'https://akila-i.medium.com/deploy-azure-logic-apps-with-api-connections-using-the-layering-method-with-terraform-17558e64e7e7',
  },
} satisfies Record<string, z.input<typeof PostSchema>>;

const raw: z.input<typeof ProfileSchema> = {
  name: 'Akila Induranga',
  slug: 'akila-induranga',
  summary: 'I like finding out how things work, and then making them work better.',
  handles: { github: 'akila-i', linkedin: 'akila-i', medium: 'akila-i' },
  roles: [
    { title: 'Senior Software Engineer', org: 'WSO2' },
    { title: 'Maintainer', org: 'OpenChoreo', note: 'CNCF Sandbox', href: GH + 'openchoreo/openchoreo' },
  ],
  location: { city: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', timeZone: 'Asia/Colombo', utcOffset: '+05:30' },
  labels: ['observability', 'kubernetes', 'platform-engineering', 'cilium', 'opentelemetry'],
  condition: {
    type: 'Ready',
    status: 'True',
    reason: 'OpenToConversations',
    message: 'Happy to talk about developer platforms, observability pipelines, and Kubernetes.',
  },
  focus: [
    {
      name: 'observability',
      text: 'Pipelines for logs, metrics, traces and Kubernetes events, and the query APIs and dashboards on top of them.',
      stack: ['OpenSearch', 'Prometheus', 'Fluent Bit', 'OpenTelemetry Collector', 'OpenObserve'],
    },
    {
      name: 'kubernetes',
      text: 'Controllers, Helm charts and network policy for building and running platforms across clusters and clouds.',
      stack: ['Go', 'Helm', 'Cilium', 'AWS', 'Azure'],
    },
    {
      name: 'platform-engineering',
      text: 'Internal developer platforms that give teams self-service golden paths from code to production, with CI/CD, observability and security built in.',
      stack: ['OpenChoreo', 'Backstage', 'TypeScript', 'React'],
    },
  ],
  writing: [posts.cncf, posts.cilium, posts.alerting, posts.gsoc, posts.azure],
  ingress: [
    { via: 'github', to: 'github.com/akila-i', href: 'https://github.com/akila-i' },
    { via: 'linkedin', to: 'linkedin.com/in/akila-i', href: 'https://www.linkedin.com/in/akila-i' },
    { via: 'medium', to: 'akila-i.medium.com', href: 'https://akila-i.medium.com' },
  ],
  career: [
    {
      id: 'uom',
      name: 'uom.student',
      kind: 'edu',
      start: '2020-01',
      end: '2024-07',
      summary: 'B.Sc. Engineering (Hons) in Computer Science and Engineering at the University of Moratuwa.',
      attrs: { institution: 'University of Moratuwa', batch: 'CSE ’19' },
      highlights: [],
    },
    {
      id: 'intern',
      name: 'wso2.intern',
      kind: 'work',
      start: '2023-01',
      end: '2023-06',
      summary: 'Internship at WSO2. Worked on automating Azure Sentinel deployment using Terraform modules at SRE team.',
      attrs: { org: 'WSO2', stack: 'Terraform, Azure' },
      highlights: [
        {
          what: 'Azure Sentinel and Azure Logic Apps with API connections, deployed with Terraform',
          links: [
            { label: 'Medium post', href: posts.azure.href },
            { label: 'example repo', href: GH + 'akila-i/logic-app-with-api-connections-using-tf' },
          ],
        },
      ],
    },
    {
      id: 'gsoc',
      name: 'gsoc.contributor',
      kind: 'oss',
      start: '2023-06',
      end: '2023-09',
      summary:
        'Google Summer of Code 2023 with Learning Equality. Added custom reading themes to Kolibri’s EPUB renderer: readers pick text, background and link colors, then save, edit or delete the theme.',
      attrs: { org: 'Learning Equality', program: 'Google Summer of Code 2023', stack: 'Vue.js, JavaScript' },
      highlights: [
        {
          what: 'Custom themes in the Kolibri EPUB renderer',
          links: [
            { label: 'merged PRs', href: GH + 'learningequality/kolibri/pulls?q=is%3Apr+author%3Aakila-i+is%3Amerged' },
            { label: 'project report', href: GH + 'akila-i/gsoc-2023' },
          ],
        },
        { what: 'GSoC 2023: A Tale of Summer, Code, and Learning', links: [{ label: 'Medium post', href: posts.gsoc.href }] },
      ],
    },
    {
      id: 'se',
      name: 'wso2.softwareEngineer',
      kind: 'work',
      start: '2024-06',
      end: '2026-02',
      summary:
        'Observability for WSO2’s Choreo SaaS platform, OpenSearch clusters with SSO dashboards, Fluent Bit pipelines, Kubernetes event logs and alerting.',
      attrs: { org: 'WSO2', stack: 'OpenSearch, Fluent Bit, Prometheus, Helm', clouds: 'AWS, Azure' },
      highlights: [],
    },
    {
      id: 'sse',
      name: 'wso2.seniorSoftwareEngineer',
      kind: 'work',
      start: '2026-02',
      end: null,
      summary: 'Choreo SaaS and OpenChoreo: logs, metrics, traces, alerts and Kubernetes events.',
      attrs: { org: 'WSO2', focus: 'Choreo SaaS, OpenChoreo' },
      highlights: [
        { what: 'OpenTelemetry-powered distributed tracing and Kubernetes events', links: [{ label: 'CNCF blog post', href: posts.cncf.href }] },
      ],
    },
    {
      id: 'oc',
      name: 'openchoreo.maintainer',
      kind: 'oss',
      start: '2025-10',
      end: null,
      summary: 'Maintainer of OpenChoreo, an open-source internal developer platform for Kubernetes and a CNCF Sandbox project.',
      attrs: { project: 'OpenChoreo', foundation: 'CNCF Sandbox', lang: 'Go, TypeScript' },
      highlights: [
        {
          what: 'The observer API and the logs, metrics and tracing modules: OpenSearch, OpenObserve, Prometheus, Azure Log Analytics',
          links: [
            { label: 'openchoreo/openchoreo', href: GH + 'openchoreo/openchoreo' },
            { label: 'openchoreo/community-modules', href: GH + 'openchoreo/community-modules' },
          ],
        },
        {
          what: 'Alerting and notification channels for email and webhooks',
          links: [
            { label: 'Alerting at Scale (post)', href: posts.alerting.href },
            { label: 'openchoreo/backstage-plugins', href: GH + 'openchoreo/backstage-plugins' },
          ],
        },
        {
          what: 'Zero-trust networking: CiliumNetworkPolicies generated per project and environment',
          links: [{ label: 'cilium.io post', href: posts.cilium.href }],
        },
      ],
    },
  ],
  openSpan: 'oc',
};

export const profile: Profile = ProfileSchema.parse(raw);
