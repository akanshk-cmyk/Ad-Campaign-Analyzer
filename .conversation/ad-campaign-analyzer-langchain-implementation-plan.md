# Ad Campaign Performance Analyzer — LangChain Implementation Plan

**Purpose:** Developer handoff for implementing the PRD as a Streamlit dashboard with an optional LangChain analytics assistant.  
**Source:** PRD v1.2 and the attached LangChain Essentials course notes.  
**Recommended stack:** Streamlit, pandas, Plotly, LangChain `create_agent`, Pydantic, and a model provider configured through Replit Secrets.

## Architecture decision

Use pandas—not an LLM—to parse, validate, filter, aggregate, and calculate every displayed metric. LangChain adds a read-only natural-language assistant for questions about the currently filtered campaign data. This is the safest fit for the PRD: numbers remain repeatable and testable, while the agent helps explain the results.

The assistant is an additional product feature beyond the current PRD, so it should be feature-gated and must not block or delay the four dashboard tabs. The 20-second MVP dashboard target applies whether or not the assistant is used.

```text
CSV / XLSX upload
       ↓
Validation + normalization (pandas; reject entire invalid upload)
       ↓
Canonical session DataFrame ───────→ Global sidebar filters
       │                                      ↓
       │                          One filtered DataFrame
       │                         ↙      ↓       ↓       ↘
       │                    Overview Platform Campaign  Time Series
       │                              Comparison Details
       ↓
Safe aggregate context → LangChain read-only tools → Optional AI insight panel
```

## Step-by-step implementation

### 1. Create the Streamlit app shell

- Build one Streamlit app with an upload/setup screen, a global filter sidebar, and four tabs: **Overview**, **Platform Comparison**, **Campaign Details**, and **Time Series**.
- Add download buttons for both CSV and `.xlsx` templates. Include the PRD’s required headers, optional headers, USD guidance, and `YYYY-MM-DD` date format.
- Put the optional assistant in a separate panel or tab. It must not be required to render charts or KPIs.

### 2. Build the deterministic file pipeline first

- Accept `.csv` and `.xlsx` (first worksheet) files within the PRD limits: 10 MB and 500 data rows.
- Validate the full file before analysis: required columns, required attributed revenue, parseable dates, nonnegative numeric values, USD-only currency, and supported channel aliases.
- Reject the whole upload on any invalid row or unsupported channel. Show row numbers, errors, and how to fix them; never silently analyze only part of the file.
- Normalize column names, channel aliases, dates, currency, and blank audience/goal labels into one canonical pandas DataFrame.
- Keep the upload in Streamlit session state only. Replacing the upload clears the prior dataset, filters, and assistant conversation.

### 3. Implement one tested analytics layer

Create pure functions independent of Streamlit and LangChain, such as:

- `validate_upload(file) -> validation_result`
- `normalize_campaign_data(dataframe) -> canonical_dataframe`
- `apply_filters(dataframe, filter_state) -> filtered_dataframe`
- `calculate_kpis(filtered_dataframe) -> kpi_result`
- `aggregate_by_platform(filtered_dataframe) -> platform_result`
- `aggregate_time_series(filtered_dataframe, metric, interval) -> series_result`
- `search_campaigns(filtered_dataframe, query) -> campaign_rows`

Calculate spend, clicks, conversions, CPA, ROI, and ROAS with the PRD formulas. Use aggregate numerators and denominators for rates; display `—` for zero denominators; never infer ROI from conversions. Include units and distinguish zero from missing/unavailable values.

### 4. Wire the global filters to all four views

- Store date range, channel, audience, and campaign goal selections in `st.session_state`.
- Derive exactly one filtered DataFrame after filter changes and pass it to each view and to the assistant context.
- Keep all filters when changing tabs or searching campaign names; add a reset-all control.
- Show the same clear empty state on every affected view when the filtered result contains no rows.
- Test this shared-filter contract before adding AI features.

### 5. Add the LangChain agent as an optional read-only analyst

Use LangChain’s `create_agent` / ReAct loop only for natural-language questions, such as “Which channel had the most conversions in this date range?” or “How did CPA change over time?” The model reasons, calls a narrowly scoped tool, observes its result, and then responds. It must not perform the underlying calculation itself.

**Suggested read-only tools:**

| Tool | Inputs | Returns |
|---|---|---|
| `get_filtered_summary` | None; uses current session context | Spend, clicks, conversions, CPA, ROI/ROAS availability, selected date range, and row count |
| `compare_platforms` | Metric from an allowlist | Aggregated platform values for that metric and units |
| `get_metric_trend` | Metric and allowed interval | Aggregated time-series points and units |
| `search_campaigns` | Search text and bounded result limit | A small, redacted set of matching campaign fields |

- Give every tool a specific name, typed arguments, and a detailed description so the agent chooses the right tool and understands its limits.
- Expose tools only for the currently filtered session data. Do not provide arbitrary Python execution, arbitrary pandas expressions, SQL execution, file-system access, or write actions.
- Return calculated values, units, selected filters, and data-quality caveats from tools. The model can explain those results, but cannot modify them.
- Bound campaign search results and avoid sending complete campaign tables to the model. Prefer aggregated data unless a specific campaign lookup is needed.

### 6. Define the LangChain messages and system prompt

- The user’s question becomes a human message.
- The agent emits an AI tool call when it needs a metric or comparison.
- The read-only tool returns a tool message with validated results.
- The final AI message explains the result in plain language and cites the metric, value, unit, and active filters in the response.

The system prompt should state: answer only from tool results; use the selected filter context; do not invent values, infer causality, or recommend budget changes as fact; clearly say when data is missing or ROI is unavailable; distinguish correlation from causation; and ask for clarification if the requested metric is not supported.

### 7. Use structured output for reliable UI rendering

Define a Pydantic response model, for example:

- `answer`: short explanation
- `evidence`: list of `{metric, value, unit, scope}`
- `caveats`: list of limitations or missing-data notes
- `suggested_follow_up`: optional next analysis question

Validate the agent result before rendering. If output fails validation, show a safe fallback message rather than unvalidated claims. Do not use generated narrative as the source for chart labels or KPI values.

### 8. Apply middleware and guardrails

Use LangChain middleware/hooks around model and tool calls to:

- Verify a dataset is loaded and the question is within campaign-analysis scope before invoking the model.
- Restrict metric names, aggregation intervals, date scope, and result limits to explicit allowlists.
- Pass current filters and metric availability into a dynamic system prompt so the assistant knows whether revenue-based measures are available.
- Catch tool/model errors, explain that the assistant could not complete the analysis, and leave the dashboard usable.
- Prevent prompt-injection text inside campaign names or CSV cells from changing tool policy. Treat uploaded cell values strictly as data, not instructions.

Because all MVP tools are read-only, do not add human approval interrupts to normal tool calls. If a later version can send reports, change budgets, or write to ad platforms, add a human-in-the-loop approval step before those actions.

### 9. Add streaming without coupling it to dashboard rendering

- Stream assistant status or final response into the assistant panel using LangChain’s streaming APIs and Streamlit’s streaming UI.
- Show a clear “Analyzing the filtered data…” state and handle cancellation/errors gracefully.
- Do not stream chain-of-thought or private reasoning. The user sees progress and the final evidence-backed answer only.
- Render tabs and charts immediately from pandas; a slow model must not block them or violate the dashboard’s MVP load target.

### 10. Handle memory conservatively

- If follow-up questions are supported, keep short-term conversation state per Streamlit session using a session-scoped thread ID and an in-memory LangGraph checkpointer.
- Clear assistant history whenever a new file is uploaded or the user resets the analysis.
- Do not store uploaded rows, raw CSV contents, or conversation state in long-term memory or a database in the MVP.
- Make the memory boundary explicit: follow-ups may refer to earlier questions in the same session, but the active dataset and filters always come from current session state.

### 11. Defer MCP and external ad-platform tools

The PRD’s MVP is file-upload-only and has no external account integrations, so MCP is not needed. Revisit LangChain MCP adapters only if the product later connects to ad-platform APIs. Any such integration should be read-only first and separately scoped for authentication, permissions, rate limits, and source attribution.

### 12. Add observability and privacy controls

- Use LangSmith tracing only if explicitly configured for development/operations; keep API keys in Replit Secrets.
- Do not log raw uploaded files, full campaign rows, or sensitive prompt contents. Trace latency, tool names, errors, token usage, and non-sensitive aggregate metadata where possible.
- Make the assistant’s LLM use clear in the UI. If the model provider is not configured or the assistant is disabled, all dashboard functionality continues to work.

### 13. Test the app in layers

**Data and metric tests:** CSV/XLSX templates parse; required fields and revenue are enforced; bad dates, invalid values, unknown channels, non-USD currencies, and over-limit files are rejected; ROI/ROAS/CPA edge cases and weighted aggregates match the PRD.

**Dashboard tests:** All four views use the same filtered data; filter changes persist across tabs; reset works; no-results states are clear; campaign search and upload replacement behave as specified.

**Agent tests:** Tools are read-only and scoped to current filters; only allowlisted metrics/intervals are accepted; no fabricated values appear when data is missing; structured output validates; changing files clears memory; injected instructions in cells cannot expand permissions.

**Performance tests:** With a representative valid file within 10 MB / 500 rows, the populated dashboard renders within the 20-second MVP target. Measure assistant latency separately; it is not part of the dashboard render SLA.

## Build order and MVP cut line

1. Ship the template downloads, upload validation, pandas analytics layer, and four deterministic views.
2. Verify PRD acceptance criteria and the 20-second dashboard target.
3. Add the optional read-only LangChain assistant behind a feature flag, with strict tools and structured output.
4. Add session-only follow-up memory and streaming only after the single-question assistant is reliable.
5. Defer MCP integrations, persistent memory, automated recommendations, and any write/action tools.

**Bottom line:** LangChain should explain and explore trusted pandas outputs—not calculate the dashboard, replace filters, or operate ad accounts.
