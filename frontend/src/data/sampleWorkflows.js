/**
 * Sample workflows for playground mode
 * Seeded into localStorage on first visit
 */

const sampleWorkflows = [
  {
    id: 'sample-feature-branch-flow',
    name: 'Feature Branch Flow',
    description: 'Create a feature branch from develop, make changes, and merge back.',
    branches: [
      {
        id: 'branch-develop',
        name: 'develop',
        type: 'develop',
        isRemote: false,
        position: { x: 100, y: 200 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      },
      {
        id: 'branch-feature',
        name: 'feature/new-login',
        type: 'feature',
        isRemote: false,
        position: { x: 450, y: 200 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      }
    ],
    operations: [
      {
        id: 'op-1',
        type: 'checkout',
        source: 'branch-develop',
        target: 'branch-feature',
        params: { new: true, reset: false, force: false }
      },
      {
        id: 'op-2',
        type: 'merge',
        source: 'branch-feature',
        target: 'branch-develop',
        params: { strategy: 'standard', ffOption: 'no-ff' }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  },
  {
    id: 'sample-release-workflow',
    name: 'Release Workflow',
    description: 'Create a release branch, merge to main, tag, and merge back to develop.',
    branches: [
      {
        id: 'branch-develop-r',
        name: 'develop',
        type: 'develop',
        isRemote: false,
        position: { x: 100, y: 100 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      },
      {
        id: 'branch-release',
        name: 'release/1.0',
        type: 'release',
        isRemote: false,
        position: { x: 400, y: 100 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      },
      {
        id: 'branch-main-r',
        name: 'main',
        type: 'production',
        isRemote: false,
        position: { x: 700, y: 100 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: ['v1.0.0']
      }
    ],
    operations: [
      {
        id: 'op-r1',
        type: 'checkout',
        source: 'branch-develop-r',
        target: 'branch-release',
        params: { new: true, reset: false, force: false }
      },
      {
        id: 'op-r2',
        type: 'merge',
        source: 'branch-release',
        target: 'branch-main-r',
        params: { strategy: 'standard', ffOption: 'no-ff' }
      },
      {
        id: 'op-r3',
        type: 'tag',
        source: 'branch-main-r',
        target: 'branch-main-r',
        params: { tagName: 'v1.0.0', message: 'Release 1.0.0' }
      },
      {
        id: 'op-r4',
        type: 'merge',
        source: 'branch-release',
        target: 'branch-develop-r',
        params: { strategy: 'standard', ffOption: 'no-ff' }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  },
  {
    id: 'sample-hotfix-flow',
    name: 'Hotfix Flow',
    description: 'Create a hotfix from main, then merge to both main and develop.',
    branches: [
      {
        id: 'branch-main-h',
        name: 'main',
        type: 'production',
        isRemote: false,
        position: { x: 100, y: 150 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      },
      {
        id: 'branch-hotfix',
        name: 'hotfix/login-fix',
        type: 'hotfix',
        isRemote: false,
        position: { x: 400, y: 150 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      },
      {
        id: 'branch-develop-h',
        name: 'develop',
        type: 'develop',
        isRemote: false,
        position: { x: 700, y: 150 },
        autoPull: false,
        autoPush: false,
        deleteConfig: { enabled: false, remote: false, force: false, remoteName: 'origin' },
        tags: []
      }
    ],
    operations: [
      {
        id: 'op-h1',
        type: 'checkout',
        source: 'branch-main-h',
        target: 'branch-hotfix',
        params: { new: true, reset: false, force: false }
      },
      {
        id: 'op-h2',
        type: 'merge',
        source: 'branch-hotfix',
        target: 'branch-main-h',
        params: { strategy: 'standard', ffOption: 'no-ff' }
      },
      {
        id: 'op-h3',
        type: 'merge',
        source: 'branch-hotfix',
        target: 'branch-develop-h',
        params: { strategy: 'standard', ffOption: 'no-ff' }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
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
