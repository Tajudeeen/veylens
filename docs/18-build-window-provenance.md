# Veylens: build-window provenance evidence

Audit date: 2026-10-26. Organizer rule, as provided in the Zecathon submission portal: **“All code written during the build window. Libraries are fine; existing products are not.”** The working window for this audit is 2026-09-28 through the 2026-10-28 submission deadline. Confirm any organizer-specific start timestamp if eligibility depends on the hour.

## What GitHub currently establishes

- Repository: [Tajudeeen/veylens](https://github.com/Tajudeeen/veylens), created **2026-10-12 17:57:21 UTC**, as reported by the GitHub repository API.
- Default branch `main`: **32 commits** in GitHub's history at the audit point, dated **2026-10-12 18:09:57 UTC** through **2026-10-26 08:06:17 UTC**, all with author name `Tajudeeen`.
- [First commit `c156199c`](https://github.com/Tajudeeen/veylens/commit/c156199c62d49b0ea97d7443adb6cac2f0c171aa), dated 2026-10-12 18:09 UTC, initializes a .gitignore.
- [First substantive code import `61b7e493`](https://github.com/Tajudeeen/veylens/commit/61b7e493c), dated 2026-10-12 18:10 UTC, is explicitly labelled “Import Veylens v0.6.0: Zcash evidence checks, private workspace, and 151 passing tests”. **This represents pre-existing development at the time of import; GitHub does not timestamp the original creation of every included line.**
- [Veylens v0.7 `5ddfa00b`](https://github.com/Tajudeeen/veylens/commit/5ddfa00ba), 2026-10-12: live evidence intake and transaction handling.
- [Veylens v0.8 `87790258`](https://github.com/Tajudeeen/veylens/commit/877902585), 2026-10-12: combined cases and source replay.
- [Testnet refund experiment `bf47c5df`](https://github.com/Tajudeeen/veylens/commit/bf47c5dfb), 2026-10-13: mined transaction regression.
- [Veylens 1.0 `558149b4`](https://github.com/Tajudeeen/veylens/commit/558149b49), 2026-10-17: evidence collection and inclusion proofs.
- [Veylens 1.1 `0e2a3e0e`](https://github.com/Tajudeeen/veylens/commit/0e2a3e0ef), 2026-10-21: recovery, verification handoff and protection.
- [Final readiness gate `9b3b32ec`](https://github.com/Tajudeeen/veylens/commit/9b3b32ec988b7ef82714a3015453566054bdfbbf), 2026-10-25.
- [Production live-network smoke `75ec1d8d`](https://github.com/Tajudeeen/veylens/commit/75ec1d8d6f98ae39e10d7bee6e60dffa10ed4126) and [passing Actions run 40288820275](https://github.com/Tajudeeen/veylens/actions/runs/40288820275), 2026-10-26.

## Reproduce the chronological audit

Run in a freshly cloned repository:

```sh
git fetch --all --tags
git log --reverse --format='%H %aI %cI %an %s' main
git log --all --before='2026-09-28T00:00:00Z' --format='%H %aI %an %s'
git show --stat 61b7e493c
git branch -a
git tag -l
```

For a complete determination, inspect every remote/local branch, tags, PR commit history and any development repository or worktree where the imported v0.6.0 was written. Commit author dates are not cryptographic creation timestamps and may be rewritten. A post-start upload is not proof of post-start authorship, and third-party libraries must be distinguished from original code.

## Evidence to attach if the organizer questions eligibility

1. Original worktree or earlier repository history showing file creation and incremental commits during the allowed window, particularly **September 28 to October 12**.
2. Contemporaneous Codespaces creation/activity records, relevant file-version history, build/test logs, deployment timestamps, and GitHub Actions runs.
3. Dated design notes and prompts/screenshots from the actual development process, with secrets and unrelated personal information redacted. These support chronology but do not prove code authorship on their own.
4. A dependency/license declaration distinguishing installed third-party libraries and official test vectors from Veylens's original code.
5. If evidence for imported v0.6.0 is incomplete, an honest clarification from the organizers about the rule's application to a new project whose initial source was imported into this repository during the window.

## Conclusion and claim boundary

**Established:** the visible default-branch history and repository creation are within the stated build window, and the project has substantial independently recorded engineering and testing during that window. **Not independently established:** the original writing dates of all v0.6.0 imported code, existence/absence of earlier code copies, and definitive organizer eligibility. Do not state “every line written during the window” as a verified fact until the earlier development provenance is checked. Do not rewrite dates or omit the import commit.
