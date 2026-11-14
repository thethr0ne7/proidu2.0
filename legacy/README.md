# Legacy source snapshots

This folder contains frozen copies of the old standalone PROIDU and Telegram prototype repositories as they existed at consolidation time.

- legacy/proidu came from thethr0ne7/proidu, main commit 2a22af2ec14e5e00b08ceecdc8c4f9211262eab8.
- legacy/proidu-bot1.1 came from thethr0ne7/proidu-bot1.1, main commit 17eb941440d7abd2f2724dbed03f183904d46e61.
- legacy/ai-platform-core-proidu contains the PROIDU-MAI parser, worker, adapter, direct test dependencies, fixtures, docs and two source migrations copied from thethr0ne7/ai-platform-core at commit 086b94d42d8b08a9583a2f1c13d40093b38a9210. The generic AI Platform Core was not copied.
- thethr0ne7/proidu-bot was empty at audit time.
- the current proidu2.0 source remains at the repository root and under apps/web, docs, scripts and supabase.

These files are archival and must not be deployed. Generated dist output was excluded. The original repositories are not deleted or modified by this consolidation. The MAI worker snapshot is not a proven production worker: its migration/RPC dependencies are absent from the inspected live database.