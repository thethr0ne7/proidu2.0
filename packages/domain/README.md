# Shared domain packages

This package family owns stable TypeScript types, admission enums, institution/program identifiers, route result types and shared invariants. Do not put React components, provider SDKs or database clients in the domain layer.

Rules and eligibility logic belong in packages/rules-engine and must be deterministic, versioned and covered by golden tests.