/**
 * PlaygroundGitApi - Mock git API for playground mode
 * Returns simulated responses without hitting a real backend
 */

const DEMO_BRANCHES = [
  { name: 'main', type: 'production', isRemote: false, current: true },
  { name: 'develop', type: 'develop', isRemote: false, current: false },
  { name: 'feature/auth', type: 'feature', isRemote: false, current: false },
  { name: 'feature/dashboard', type: 'feature', isRemote: false, current: false },
  { name: 'release/1.0', type: 'release', isRemote: false, current: false },
  { name: 'hotfix/login-fix', type: 'hotfix', isRemote: false, current: false },
];

export async function validateRepo(repositoryPath) {
  // Simulate a short delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    isValid: true,
    currentBranch: 'main',
    isClean: true,
    workingDirectory: repositoryPath || '/playground/demo-repo'
  };
}

export async function getBranches(repositoryPath, query = '', limit = 20, includeRemotes = true) {
  await new Promise(resolve => setTimeout(resolve, 200));
  let branches = [...DEMO_BRANCHES];
  if (query) {
    branches = branches.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));
  }
  return branches.slice(0, limit);
}
