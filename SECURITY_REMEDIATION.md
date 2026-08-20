# Security Remediation: Historical Credential Exposure

## Summary

An earlier repository state exposed production credential material. This file
is retained as the incident record, but contains no credential values or
identifying fragments.

The prior record attributes the exposure to commit `997e65f` and the removal of
the tracked `.env.local` file to commit `a6e6bb9`. Those references must be
verified against the complete remote history before any history operation.

## Affected credential types

- Groq API key
- Brave Search API key
- Pexels API key
- GitHub personal access token
- retired cron-route secret

Treat every historical value as compromised regardless of whether it still
appears to work. Do not test an exposed value against a provider.

## Required operator actions

1. Revoke every historical credential at its provider and create replacements
   only where the current system still uses that integration.
2. Store replacements in GitHub Actions secrets or an untracked local
   `.env.local`; never place values or identifying fragments in tickets,
   commits, logs, screenshots, or documentation.
3. Do not reissue the retired cron-route secret: the static GitHub Pages build
   exposes no server cron endpoint.
4. Confirm GitHub secret scanning and push protection are enabled.
5. Run the generation workflow with the replacement credentials and retain the
   successful run URL as the rotation receipt.

## Git-history decision gate

The current working tree is sanitized, but a normal commit cannot remove a
secret from earlier Git objects, forks, cached clones, or provider logs.
Rewriting remote history is destructive and may invalidate open work. Before a
rewrite, an authorized maintainer must:

1. inspect the complete remote history and enumerate affected refs;
2. preserve unique branch and tag work;
3. coordinate the force-push and required re-clones;
4. approve the exact rewrite command and rollback plan; and
5. separately verify that provider-side revocation is complete.

Until that decision is approved and executed, the accurate status is:
**current tracked file redacted; historical exposure and rotation status not
independently verified**.

## Verification checklist

- `git grep` over tracked files returns no credential-shaped literals.
- `.env.local` is untracked and ignored.
- replacement secrets exist only in approved secret stores.
- the hourly generation workflow succeeds with replacement credentials.
- the GitHub Pages build and deploy succeed after generation.
- production serves the expected custom domain and current content.
