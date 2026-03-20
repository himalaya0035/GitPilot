/**
 * Sample workflows for playground mode
 * Seeded into localStorage on first visit
 */

const sampleWorkflows = [
  {
    id: 'workflow-1774041380016-7cvj87hjc',
    name: 'Sample Release Workflow',
    repositoryPath: null,
    branches: [
      {
        id: 'production-1774041179795',
        name: 'prod',
        type: 'production',
        isRemote: false,
        autoPull: true,
        autoPullRemote: 'origin',
        autoPush: false,
        autoPushRemote: 'origin',
        position: { x: 19.036684392187112, y: 41.66680341771038 },
        tags: []
      },
      {
        id: 'feature-1774041317606',
        name: 'feature/feature-a',
        type: 'feature',
        isRemote: false,
        autoPull: true,
        autoPullRemote: 'origin',
        autoPush: false,
        autoPushRemote: 'origin',
        position: { x: 413.0063327970702, y: -135.74999189044885 },
        tags: []
      },
      {
        id: 'release-1774041320849',
        name: 'release/v1.4.0',
        type: 'release',
        isRemote: false,
        autoPull: false,
        autoPullRemote: 'origin',
        autoPush: true,
        autoPushRemote: 'origin',
        position: { x: 466.92712352798134, y: 43.406183763868825 },
        tags: []
      },
      {
        id: 'feature-1774041340533',
        name: 'feature-b',
        type: 'feature',
        isRemote: false,
        autoPull: true,
        autoPullRemote: 'origin',
        autoPush: false,
        autoPushRemote: 'origin',
        position: { x: 393.00345881624827, y: 242.56523339900832 },
        tags: []
      }
    ],
    operations: [
      {
        id: 'auto-pull-production-1774041179795',
        type: 'pull',
        source: 'production-1774041179795',
        target: 'production-1774041179795',
        params: { rebase: false, remote: 'origin' }
      },
      {
        id: 'auto-pull-feature-1774041317606',
        type: 'pull',
        source: 'feature-1774041317606',
        target: 'feature-1774041317606',
        params: { rebase: false, remote: 'origin' }
      },
      {
        id: 'auto-pull-feature-1774041340533',
        type: 'pull',
        source: 'feature-1774041340533',
        target: 'feature-1774041340533',
        params: { rebase: false, remote: 'origin' }
      },
      {
        id: 'auto-push-release-1774041320849',
        type: 'push',
        source: 'release-1774041320849',
        target: 'release-1774041320849',
        params: { remote: 'origin', upstream: true }
      },
      {
        id: 'edge-1774041322503',
        type: 'checkout',
        source: 'production-1774041179795',
        target: 'release-1774041320849',
        params: { force: false, new: true, reset: false }
      },
      {
        id: 'edge-1774041337835',
        type: 'merge',
        source: 'feature-1774041317606',
        target: 'release-1774041320849',
        params: {}
      },
      {
        id: 'edge-1774041345783',
        type: 'merge',
        source: 'feature-1774041340533',
        target: 'release-1774041320849',
        params: {}
      }
    ],
    createdAt: '2026-03-20T21:16:20.016Z',
    updatedAt: '2026-03-20T21:16:20.016Z',
    version: '1.0'
  }
];

/**
 * Seeds sample workflows into localStorage if none exist yet
 */
export function seedSampleWorkflows() {
  const key = 'git-workflow-workflows';
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) return; // Already has workflows
    } catch { /* fall through to seed */ }
  }
  localStorage.setItem(key, JSON.stringify(sampleWorkflows));
}

export default sampleWorkflows;
