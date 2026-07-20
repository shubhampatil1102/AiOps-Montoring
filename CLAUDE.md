# AiOps Monitoring Platform
## Product Development Master Plan

You are the lead software engineer responsible for continuing development of an existing enterprise-grade AiOps Monitoring Platform.

IMPORTANT:

This project is NOT a prototype.

This project is NOT a dashboard clone.

This project already has an existing codebase.

Your responsibility is to EXTEND the project while preserving architecture, coding style and existing functionality.

DO NOT redesign everything.

DO NOT rewrite working modules.

DO NOT introduce duplicate components.

DO NOT create unnecessary abstractions.

Always build incrementally.

------------------------------------------------------------

# Existing Technology Stack

Frontend
- React
- TypeScript
- Vite
- TanStack Query
- React Router
- CSS Modules
- Lucide Icons

Backend

- Node.js
- Express
- PostgreSQL
- Modular architecture

Current backend structure

routes
controllers
services
repositories
middleware
config

Agent

Current
PowerShell

Future
.NET Windows Service

Deployment

Docker
Docker Compose

------------------------------------------------------------

# Existing Features

Already implemented

Dashboard

Reusable DashboardWidget

Reusable StatCard

Device List

Device Details

Metrics Collection

Health Monitoring

CPU

RAM

Disk

Alerts

Recent Alerts Widget

AI Suggestions

Inventory

Hardware Information

Compliance

Backend Metrics APIs

Healing APIs

Docker

DO NOT rebuild these.

Only improve them.

------------------------------------------------------------

# Product Vision

This product is an AI Operations Platform.

NOT another monitoring dashboard.

The goal is

Observe

Analyze

Predict

Heal

Automate

Learn

Every feature must contribute to this vision.

------------------------------------------------------------

# UI Philosophy

Enterprise

Minimal

Clean

Professional

Consistent

Avoid

Repeated KPI cards

Repeated charts

Repeated tables

Duplicate widgets

Every page must have a unique purpose.

------------------------------------------------------------

# Sidebar Structure

Overview

Dashboard

Live Monitoring

Operations

Devices

Incidents

Auto Heal

Compliance

AI

AI Insights

AI Copilot

Predictions

Management

Inventory

Software

Policies

Reports

Administration

Users

Roles

Integrations

Settings

------------------------------------------------------------

# Development Rules

Never duplicate components.

Always reuse existing components.

If DashboardWidget exists

Reuse it.

If StatCard exists

Reuse it.

If Card exists

Reuse it.

Never create

DashboardWidget2

StatCardNew

HealthCardNew

etc.

------------------------------------------------------------

# Component Rules

Every page must have

Loading State

Empty State

Error State

Responsive Layout

Accessibility

Keyboard Navigation

------------------------------------------------------------

# Code Rules

Small reusable components

No duplicated logic

Strict TypeScript

Clean folder structure

Strong typing

No inline styles

No magic numbers

Reusable hooks

Reusable utilities

------------------------------------------------------------

# Authentication

Started 2026-07-19. Current scope is login + session foundation ONLY:

JWT Authentication

Refresh Token

Protected Routes

Login

Logout

Forgot Password (placeholder link only, no email flow yet)

Remember Me

Session Timeout

Role Based Access started 2026-07-19 — explicit user decision to move it
ahead of schedule (second explicit override of this file's own sequencing;
see "Current Sprint"). Every route is already gated on isAuthenticated
(done in the auth foundation sprint) — this sprint adds real gating on
role/permission on top of that, per "Roles" and "Permissions" below.

------------------------------------------------------------

# Roles

Super Admin

IT Admin

Helpdesk

Security Analyst

Read Only

Auditor

------------------------------------------------------------

# Permissions

Dashboard

Devices

Inventory

Compliance

Incidents

Auto Heal

Policies

Reports

Settings

Users

Each permission supports

View

Create

Edit

Delete

Execute

------------------------------------------------------------

# Future AI Modules

AI Copilot

Ask

Why is this device unhealthy?

Which devices need attention?

Predict failures

Explain incidents

Summarize alerts

Generate reports

------------------------------------------------------------

# Incident Center

Each incident contains

Timeline

Root Cause

Affected Devices

Suggested Resolution

Executed Actions

Owner

Status

Comments

------------------------------------------------------------

# Compliance

BitLocker

Firewall

Windows Defender

TPM

Secure Boot

Encryption

Updates

Antivirus

Compliance Score

------------------------------------------------------------

# Inventory

Hardware

Software

Installed Applications

Warranty

Purchase Date

Device Owner

Department

Lifecycle

------------------------------------------------------------

# Reports

Executive Report

Incident Report

Compliance Report

Asset Report

Weekly Health Report

PDF

Excel

------------------------------------------------------------

# Patch Management

Started 2026-07-20. Replaces the scan-only Windows Update implementation
(agent.ps1 Get-UpdateHealth + device_updates table + ad hoc script-runner
"Fix" buttons) with a real patch job engine.

Phase 1 (current, in progress):

Patch job data model (PatchJobs, PatchHistory)

Backend job API: scan, install, retry, cancel, progress

Agent: native Windows Update COM API scan + download + install,
PSWindowsUpdate as fallback only

Reboot is detected and reported by the agent, but only ever executed
after an explicit confirmation click in the UI — never auto-triggered

Reuses the existing agent long-poll job pattern (GET /agent/job/:device,
POST /agent/job/result) — no new transport

Dashboard + Device Page wired to real job data (counts, progress, history)

Explicitly deferred to a later phase, not Phase 1:

Patch rings / patch policies (Pilot, IT, Production, Critical Devices)

Maintenance-window / scheduled installs

WindowsUpdate.log / CBS.log collection

AI-generated recommendation text

Weekly/monthly report generation

Dedicated patch alert rules

------------------------------------------------------------

# Reboot Intelligence

Started 2026-07-20. Converts plain uptime display into a real reboot-health
analysis, reusing the reboot execution already built in Patch Management
(patch_jobs action=REBOOT) — not a second reboot mechanism.

Phase 1 (current, in progress):

Agent: real registry/WMI pending-reboot signals (PendingFileRenameOperations,
Component Based Servicing RebootPending key, Windows Update Auto Update
RebootRequired key), plus the WU-COM-API/PSWindowsUpdate signals already
collected by Patch Management — reused, not duplicated

RebootHistory / RebootPolicy tables (per-device-class thresholds: laptop,
desktop, server, shared device, kiosk — code-configurable, not yet an
admin UI)

Backend read/recommend endpoints; reboot execution itself stays on the
existing POST /patch/jobs/:id/reboot, not a new endpoint

Health score integration: uptime-based and pending-reboot penalties

Reboot Intelligence card on the Device page: uptime, last restart,
pending-reboot signals, why-it-matters bullets, a rule-based recommendation
with rounded confidence matching the existing lib/intelligence/* convention
(0.65/0.7/0.8 style — never fabricated decimal precision)

Compact fleet-wide Reboot Health widget on the Dashboard (same treatment as
the Patch Compliance widget)

Explicitly deferred to a later phase, not Phase 1:

Full 8-card fleet reboot dashboard page

Animated reboot timeline / predictive stability-decay visualization

Live status streaming (Restarting → Stopping Services → ... → Healthy) —
no websocket/SSE transport exists in this repo; would need one built first

Notifications / dedicated reboot alert rules

Admin-editable reboot policy UI

------------------------------------------------------------

# Auto Heal

Restart Service

Restart IIS

Restart Process

Kill Process

Flush DNS

Restart Print Spooler

Run Script

Workflow Builder

------------------------------------------------------------

# Future Endpoint Agent

NOT NOW

Backlog only

Future

.NET Windows Service

Auto Update

Installer

Self Healing

Offline Queue

------------------------------------------------------------

# Coding Strategy

Before changing any page

Understand

Current implementation

Existing components

Existing hooks

Existing APIs

Existing styles

Modify only what is necessary.

------------------------------------------------------------

# Development Process

Every task

1 Study existing implementation

2 Explain impact

3 Implement

4 Ensure no regressions

5 Keep code clean

------------------------------------------------------------

# Current Sprint

Device Details layout is done (Device Intelligence Hub).

Authentication foundation is done (login + JWT/refresh sessions, every
route gated on isAuthenticated).

RBAC sprint is done — real roles/permissions data model, route/menu/action
gating on permission (not just isAuthenticated), 403 handling. Started
2026-07-19, second explicit override of this file's original sequencing.
See "Roles" and "Permissions" sections.

Patch Management (Phase 1) sprint is done — real patch job engine (scan,
download, install, reboot-detect via WU COM API, history) replacing the
scan-only Windows Update implementation, including the reboot execution
mechanism (patch_jobs action=REBOOT, WAITING_FOR_REBOOT state, confirm-
before-reboot UI). Started 2026-07-20, third override of this file's
sequencing. See "Patch Management" section for exact boundary.

Reboot Intelligence (Phase 1) sprint started 2026-07-20 — explicit user
decision, FOURTH override of this file's own sequencing (after
Authentication, RBAC, then Patch Management), confirmed via a direct
question to the user before proceeding. Scope: real registry/WMI-based
pending-reboot detection, uptime/reboot health scoring, an honest
rule-based "AI recommendation" (rounded confidence matching the existing
lib/intelligence/* convention, not fabricated precision), a Reboot
Intelligence card on the Device page, and a compact fleet Reboot Health
widget on the Dashboard — all reusing the reboot execution already built
in Patch Management, not a second reboot mechanism. See "Reboot
Intelligence" section below for exact Phase 1 boundary and what's
deferred.

DO NOT start Windows Service. Patch Management and Reboot Intelligence
both stay inside the existing PowerShell agent.ps1 polling model — no
compiled .NET service, per "Future Endpoint Agent" below.

DO NOT redesign sidebar.

Still remaining from the pre-Authentication sprint, not yet done — resume
after Reboot Intelligence Phase 1 lands:

1 Finish AI Insights

2 Finish Devices Overview

3 Dashboard polish

Only after completing these

Proceed to the next net-new sprint.

------------------------------------------------------------

# Long Term Goal

Build an enterprise-grade AI Operations Platform comparable in architecture to products such as:

Microsoft Endpoint Manager
ManageEngine Endpoint Central
Datadog
Splunk
CrowdStrike Falcon
ServiceNow ITOM

while keeping the interface modern, lightweight and AI-first.

Always prioritize maintainability, scalability and code reuse over adding new features.