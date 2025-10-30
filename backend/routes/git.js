/**
 * Git routes - repository validation and branch listing
 */

const express = require('express');
const router = express.Router();
const { validateRepositoryPath } = require('../middleware/validation');
const GitService = require('../services/GitService');

/**
 * POST /api/git/validate
 * Validate a repository path
 * body: { repositoryPath: string }
 */
router.post('/validate', validateRepositoryPath, async (req, res, next) => {
  try {
    const { repositoryPath } = req.body;
    const git = new GitService(repositoryPath || process.cwd());
    const status = await git.getRepositoryStatus();

    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/git/branches
 * Body: { repositoryPath, includeRemotes=true, query='', limit=20 }
 * Server-side filtering to keep payloads small.
 */
router.post('/branches', async (req, res, next) => {
  try {
    const { repositoryPath, includeRemotes = true, query = '', limit = 20 } = req.body || {};
    const git = new GitService(repositoryPath || process.cwd());

    const refsCmd = includeRemotes
      ? "git for-each-ref --format='%(refname:short)' refs/heads refs/remotes"
      : "git for-each-ref --format='%(refname:short)' refs/heads";

    const result = await git.executeGitCommand(refsCmd, { skipEmission: true });
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.stderr || 'Failed to list branches' } });
    }

    const q = String(query || '').toLowerCase();
    const max = Math.max(1, Math.min(Number(limit) || 20, 100));

    const lines = result.stdout
      .split('\n')
      .map(l => l.trim())
      .filter(l => !!l && !l.endsWith('HEAD') && l !== 'HEAD');

    const normalize = (name) => {
      if (name.startsWith('origin/HEAD')) return null;
      if (name.startsWith('remotes/')) {
        const short = name.replace(/^remotes\//, '');
        const [remote, ...rest] = short.split('/');
        return { name: short, scope: 'remote', remote, short: rest.join('/') };
      }
      if (name.includes('/')) {
        const [remote, ...rest] = name.split('/');
        return { name, scope: 'remote', remote, short: rest.join('/') };
      }
      return { name, scope: 'local' };
    };

    const filtered = [];
    for (const line of lines) {
      const entry = normalize(line);
      if (!entry) continue;
      if (!q || entry.name.toLowerCase().includes(q)) {
        filtered.push(entry);
        if (filtered.length >= max) break;
      }
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


