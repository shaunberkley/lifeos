# What Is LifeOS?

LifeOS is a personal AI life management platform.

The product goal is straightforward:

- help a person organize work and life in one system
- turn fragmented inputs into structured state, memory, and actions
- use AI to assist with planning, synthesis, retrieval, and automation
- keep restricted data private by processing it locally whenever required

LifeOS is not a generic chat app, not a wrapper around a vector database, and not "one agent that runs your life." It is a typed application with AI layered on top of it.

## The Product In One Sentence

LifeOS is a system that ingests the important signals in a person's life, turns them into durable typed state, and uses policy-constrained AI to help them decide and act.

## What LifeOS Manages

LifeOS is designed to manage these core domains:

- tasks, projects, priorities, and deadlines
- calendar, routines, and scheduling
- notes, documents, captured links, and inbox items
- contacts and relationship context
- memory and retrieval across structured and unstructured information
- automations, reminders, approvals, and assistant actions
- selected health, finance, and camera-derived signals

## The Core Product Thesis

Most "AI life assistant" products fail because they collapse everything into one of two bad models:

1. unstructured chat with no durable system of record
2. over-automated agents with too much authority and too little policy

LifeOS rejects both.

The correct model is:

- typed application state first
- append-only ingest at integration boundaries
- deterministic workflows for durable execution
- AI as a constrained decision-support layer
- human approval for sensitive or high-consequence actions

## The Critical Privacy Boundary

LifeOS is intentionally split into two systems:

1. Convex cloud/backend for sync-safe state, workflows, collaboration surfaces, and realtime UI
2. a mandatory local bridge for restricted raw data, local connectors, and Ollama inference

This boundary is non-negotiable.

Restricted raw data must stay local by default, especially:

- health data
- finance data
- camera images and raw vision payloads
- local files containing sensitive personal information

Only sanitized, classified, policy-approved derivatives may move from the local bridge into Convex.

## How AI Fits

AI is important in LifeOS, but it is not the product's source of truth.

AI in LifeOS is used for:

- classification
- summarization
- extraction into structured shapes
- retrieval and ranking
- draft generation
- recommendation
- policy-gated action proposals

AI is not allowed to:

- silently become the source of truth for user-facing state
- bypass policy checks
- write directly into critical durable tables without workflow control
- send restricted data to remote models

The governing principle is:

Agents propose. Workflows execute. Policies approve.

## What Makes This Repo Different

This repository is being built under unusual but deliberate constraints:

- solo developer
- code authored with AI coding tools
- AGPL/open-core public scrutiny
- self-hosting required
- strong determinism and reviewability required from the beginning

That means the codebase must be:

- easy for humans to review
- easy for coding agents to navigate
- explicit instead of magical
- typed instead of loosely dynamic
- testable and reproducible

## What Contributors And Agents Should Assume

If you are contributing to LifeOS, assume the following:

- Convex is the sync-safe system of record
- the local bridge is the restricted-data system of record
- integrations ingest append-only events and project into typed domain tables
- restricted data stays local unless explicitly classified and allowed
- small files, clear ownership, and deterministic behavior matter more than clever abstractions
- documentation must match reality; placeholder behavior is treated as debt, not progress

## Canonical Docs

Start here, in this order:

1. `README.md`
2. `docs/overview/what-is-lifeos.md`
3. `docs/architecture/lifeos-technical-architecture.md`
4. `docs/operations/hardening-program.md`
5. `docs/architecture/implementation-roadmap.md`
6. `docs/data-classification.md`

## Short Version

LifeOS is a privacy-aware personal operating system for life management.

It combines:

- typed application state
- realtime sync
- local-first sensitive-data processing
- durable workflows
- constrained AI assistance

The architecture exists to make that combination safe, maintainable, and real.
