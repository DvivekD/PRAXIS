# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Context

- **Monorepo structure**: Turborepo with pnpm workspaces.
- **Import boundaries**: Apps cannot import from each other, only from `/packages`.
- **Tech stack**: Next.js frontend, Fastify (Node) backend, TypeScript throughout.
- **Code style**:
  - No `any` types allowed.
  - Use `async/await` only.
  - All API calls must handle errors.
- **Agent instructions**: 
  - Always use Plan Mode for multi-file changes.
  - Always save significant decisions to memory.
- **Key architectural decisions**: 
  - **Telemetry**: WebSocket streams to a Kafka event bus for real-time high-frequency processing.
  - **Orchestration Backend**: LangGraph is used for stateful, multi-agent evaluation workflows.
  - **Credentials**: We issue W3C Verifiable Credentials signed by the backend, with SNARK-based Zero-Knowledge Proofs applied on the frontend for privacy-preserving score verification.

# Common Development Tasks

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @praxis/api dev`
- `pnpm --filter @praxis/web dev`
