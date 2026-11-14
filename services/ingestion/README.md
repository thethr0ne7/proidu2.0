# PROIDU ingestion workers

Workers discover, fetch, archive, parse and validate official university and government sources. RabbitMQ provides durable jobs, retry and dead-letter handling. S3 stores source snapshots. PostgreSQL stores source versions, extracted candidates and evidence.

LLM extraction is advisory. Publication requires deterministic validation or human review. Each job is idempotent and attributable to a source/parser version. See docs/proidu-4.0/06_FEDERAL_COVERAGE.md.