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

## Earlier conversational development record (recovered October 12)

The project owner supplied the original shared [development conversation](https://claude.ai/share/d24d4b7b-effa-457f-b372-96fc7f6a2451), originally titled **“Zcash codebase audit and vulnerability analysis”**. The owner later continued the project in a ChatGPT development environment. The recovered 30-record transcript was archived on **2026-10-12 at approximately 16:49 UTC** as `Veylens-Claude-Conversation.md` (a separate development archive; not committed here). Its first exposed message is dated **2026-10-11 10:22:04 UTC**, after the stated hackathon window opened on September 28.

The transcript records the transition from the initial **Veil Check** concept to **Veylens**, and contains discussion and reported development of a privacy audit engine, four diagnostic rules, a CLI, Ed25519 signed reports, and a browser application through approximately v0.3.0. It precedes the [October 12 v0.6.0 GitHub import](https://github.com/Tajudeeen/veylens/commit/61b7e493c). The October 12 continuation then reported v0.4.0 with 109 tests and v0.6.0 with 151 tests and transaction-vector support, prior to or around the GitHub import.

**Evidence quality and limits:** The recovered transcript's tool execution inputs/outputs are substantially empty or redacted, and no original downloadable source bundle was recovered from it. Statements about earlier test counts or generated code are historical conversation claims, **not** independently verified CI results. The first GitHub import and subsequent successful CI independently attest to the imported repository state, but cannot prove each source line's creation date. The shared conversation may change access status; keep a privately archived copy for the organizer, with unrelated sensitive information removed before sharing. Do not commit the unredacted archive, secrets or any inferred code authorship certificate.

## Evidence to attach if the organizer questions eligibility

1. Original worktree or earlier repository history showing file creation and incremental commits during the allowed window, particularly **September 28 to October 12**.
2. Contemporaneous Codespaces creation/activity records, relevant file-version history, build/test logs, deployment timestamps, and GitHub Actions runs.
3. The original [shared development conversation](https://claude.ai/share/d24d4b7b-effa-457f-b372-96fc7f6a2451) and locally retained `Veylens-Claude-Conversation.md` archive; dated design notes and development screenshots, all reviewed for secrets. These support chronology but do not prove code authorship on their own.
4. A dependency/license declaration distinguishing installed third-party libraries and official test vectors from Veylens's original code.
5. If evidence for imported v0.6.0 is incomplete, an honest clarification from the organizers about the rule's application to a new project whose initial source was imported into this repository during the window.

## Conclusion and claim boundary

**Established:** the visible default-branch history and repository creation are within the stated build window, and the project has substantial independently recorded engineering and testing during that window. **Not independently established:** the original writing dates of all v0.6.0 imported code, existence/absence of earlier code copies, and definitive organizer eligibility. Do not state “every line written during the window” as a verified fact until the earlier development provenance is checked. Do not rewrite dates or omit the import commit.
