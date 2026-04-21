// ──────────────────────────────────────────
// Content Script — Lovable Project Detector
// Runs on lovable.dev pages to detect project context
// ──────────────────────────────────────────

(function detectLovableProject() {
  const url = window.location.href;

  // Match Lovable project URLs like: https://lovable.dev/projects/abc-123
  const projectMatch = url.match(/lovable\.dev\/projects\/([a-zA-Z0-9-]+)/);
  if (!projectMatch) return;

  const projectId = projectMatch[1];
  const projectUrl = `https://lovable.dev/projects/${projectId}`;

  // Pierces shadow roots to find elements
  function querySelectorAllShadow(selector: string, root: Document | Element | ShadowRoot = document): Element[] {
    const elements = Array.from(root.querySelectorAll(selector));
    const shadowRoots = Array.from(root.querySelectorAll('*'))
      .map(el => el.shadowRoot)
      .filter(Boolean) as ShadowRoot[];
    
    for (const shadowRoot of shadowRoots) {
      elements.push(...querySelectorAllShadow(selector, shadowRoot));
    }
    return elements;
  }

  // Try to detect GitHub connection info from the page
  function extractGitHubInfo(): { owner?: string; repo?: string; branch?: string } {
    console.log('[LovableAuto] Extracting GitHub info (advanced)...');
    const result: { owner?: string; repo?: string; branch?: string } = {};

    // 1. Look for the GitHub link even in Shadow DOM
    const ghLinks = querySelectorAllShadow('a[href*="github.com"]');
    for (const link of ghLinks) {
      const href = (link as HTMLAnchorElement).href;
      const match = href.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match && !match[2].includes('lovable') && !match[2].includes('signup')) {
        result.owner = match[1];
        result.repo = match[2].replace('.git', '').split(/[?#]/)[0];
        console.log('[LovableAuto] Found GitHub repo in shadow link:', result.owner, result.repo);
        break;
      }
    }

    // 2. Fallback: Search all text content for owner/repo pattern
    if (!result.owner) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const repoPattern = /([^/\s]+)\/([^/\s.]+)/;
      
      while (node = walker.nextNode()) {
        const text = node.textContent || '';
        // Look for common patterns in Lovable (usually in the header or menus)
        if (text.includes('/') && text.length < 50) {
          const match = text.match(repoPattern);
          // Simple heuristic: if it looks like owner/repo and we are in a project page
          if (match && match[1].length > 2 && match[2].length > 2) {
             // Avoid common false positives
             if (!['lovable', 'projects', 'docs', 'blog'].includes(match[1].toLowerCase())) {
                result.owner = match[1];
                result.repo = match[2].trim();
                console.log('[LovableAuto] Found GitHub repo in text node:', result.owner, result.repo);
                break;
             }
          }
        }
      }
    }

    // Default branch
    result.branch = 'main';

    return result;
  }

  // Wait for page to fully load, then detect
  function detect() {
    console.log('[LovableAuto] Running detection on:', window.location.href);
    const ghInfo = extractGitHubInfo();

    const message = {
      type: 'LOVABLE_PROJECT_DETECTED',
      data: {
        projectUrl,
        projectId,
        githubOwner: ghInfo.owner,
        githubRepo: ghInfo.repo,
        branch: ghInfo.branch,
      },
    };

    console.log('[LovableAuto] Sending project info to extension:', message.data);
    chrome.runtime.sendMessage(message);
  }

  // Run detection after a short delay to let the page render
  setTimeout(detect, 2000);

  // Also observe for SPA navigation changes
  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl !== url) {
      setTimeout(detect, 1000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
