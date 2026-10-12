## 1. Summary

Build a lightweight dashboard that lets a marketer download a campaign file template, fill it in, and upload a CSV or Excel workbook to compare campaign performance across Facebook, Instagram, Pinterest, and Twitter/X. The MVP centers on four coordinated views—Overview, Platform Comparison, Campaign Details, and Time Series—with shared date, channel, audience, and campaign-goal filters.

The dashboard must make units and metric definitions visible, keep filter behavior consistent across all views, and explain when a metric cannot be calculated or the filters return no data. Proposed implementation: **Streamlit, pandas, and Plotly**.

## 2. Problem and opportunity

Marketers often need to combine or inspect campaign exports to answer basic allocation questions: where spend is going, which channels generate conversions, and how results change over time. Comparing exports manually is slow and makes it easy to compare unlike date ranges, audiences, or goals.

A single upload-and-explore workflow can shorten that analysis and make the underlying comparisons more consistent. This MVP is an analysis tool, not an attribution system or campaign manager.

## 3. Target user and job

**Primary user:** A marketer or growth generalist who has campaign results in a CSV or Excel workbook and needs to understand performance without building a custom dashboard.

**Job story:** When I have campaign results from multiple social channels, I want to filter and compare spend, clicks, conversions, and return in one place, so I can identify what is working and where to investigate or reallocate budget.

## 4. Goals and non-goals

### Goals

- Provide downloadable campaign templates and analyze valid CSV or Excel uploads with little setup.
- Compare performance across Facebook, Instagram, Pinterest, and Twitter/X.
- Provide four views that all respond to the same active filters.
- Surface clear, correctly labeled totals and derived metrics.
- Make missing, invalid, or insufficient data understandable rather than silently misleading.

### Non-goals for MVP

- Connecting directly to ad platforms or refreshing data automatically.
- Editing, launching, or pausing campaigns; budget recommendations or automated optimization.
- Cross-device/user accounts, saved dashboards, scheduled reports, or multi-user collaboration.
- Attribution modeling, deduplication across platforms, currency conversion, or causal claims about campaign performance.
- A general-purpose BI or arbitrary CSV query builder.

## 5. Proposed solution and user flow

1. User downloads a CSV or Excel template from the upload screen, or selects an existing campaign file.
2. User fills the template with campaign results and uploads the completed CSV or Excel workbook.
3. App validates the file and required columns, normalizes supported channel names, and reports any issues before analysis.
4. App shows the Overview with global filters initialized to all available values and the full available date range.
5. User adjusts filters; all four views, their tables, charts, and summary metrics update from the same filtered dataset.
6. User searches/sorts campaign rows or switches views to investigate differences.
7. User clears filters or uploads a replacement file to begin a new analysis.

For the MVP, process uploads in memory for the current session. Do not persist uploaded campaign data after the session ends.

## 6. CSV contract and data handling

### Required fields

| Field | Type / expected meaning | Validation |
|---|---|---|
| `date` | Date associated with the reported results | Must parse as `YYYY-MM-DD`; any invalid date blocks the entire upload |
| `campaign_name` | Campaign name | Non-empty text |
| `channel` | Advertising platform | Normalize supported aliases to Facebook, Instagram, Pinterest, or Twitter/X |
| `audience` | Audience or segment label | Text; blank values shown as “Unknown” |
| `campaign_goal` | Campaign objective/goal | Text; blank values shown as “Unknown” |
| `spend` | Ad spend | Numeric and non-negative; USD |
| `clicks` | Click count | Numeric and non-negative |
| `conversions` | Conversion count | Numeric and non-negative |
| `attributed_revenue` | Revenue attributed to the campaign | Numeric and non-negative; required for the supported dataset |

### Optional fields

| Field | Purpose |
|---|---|
| `currency` | Currency code; if omitted, assume USD and label values as `$ (USD)`. If supplied, it must be USD. |
| `impressions` | Enables CTR (`clicks / impressions`) if included; CTR is not required for MVP |

### Validation and normalization behavior

- Accept `.csv` files with a header row and `.xlsx` Excel workbooks using the first worksheet. Reject unsupported file types, empty files, duplicate/ambiguous required headers, and files with missing required fields with a specific, actionable message.
- Offer downloadable CSV and Excel templates from the upload screen. Templates must include the exact required headers, optional supported headers, and concise instructions for accepted values and date format; users can fill them and upload the completed file through the same flow.
- Use ISO 8601 dates (`YYYY-MM-DD`) in both templates and document that expected format in the upload experience.
- Ignore extra columns not used by the MVP and retain valid campaign fields for the detail table where practical.
- Trim whitespace in text values; map common channel aliases (for example, `FB` to Facebook and `Twitter`/`X` to Twitter/X). Do not silently map unknown channels into a supported platform.
- Any invalid row or unsupported channel blocks the entire upload. Show row numbers, the detected issue, and a clear corrective action; do not partially analyze the file.
- Treat blank audience or goal as “Unknown” so users can include/filter those rows.
- The expected currency is USD. If a currency column is present, reject files containing a currency other than USD or more than one currency; explain how to correct the file.
- Upload guardrail: 10 MB or 500 data rows, whichever is reached first. Reject larger files with a clear message.

### Metric definitions and units

- **Spend:** Sum of `spend`, shown with the upload currency (USD when no currency is provided, clearly labeled as assumed).
- **Clicks:** Sum of clicks, shown as clicks.
- **Conversions:** Sum of conversions, shown as conversions.
- **Cost per conversion (CPA):** `spend / conversions`, shown in currency per conversion; show “—” when conversions are zero.
- **Attributed revenue:** Sum of `attributed_revenue`, shown in the same currency as spend.
- **ROI:** `(attributed_revenue - spend) / spend`, formatted as a percentage. Available only when attributed revenue exists and spend is greater than zero.
- **ROAS:** `attributed_revenue / spend`, formatted as an `x` multiple. Available only when attributed revenue exists and spend is greater than zero.
- **Important:** Never label conversions divided by spend as ROI. Attributed revenue is required in the supported dataset; if it is missing, reject the file and explain that the required field is needed. Show CPA as an additional efficiency metric.
- **CTR:** Optional only when impressions are present and greater than zero: `clicks / impressions`. Do not display as a required headline metric.
- For aggregate rates, calculate from aggregate numerators and denominators; do not average per-campaign percentages. When denominator is zero, show “—” rather than infinity or a fabricated zero.

## 7. Functional requirements

### Shared controls and behavior

- Provide global filters for date range, channel, audience, and campaign goal.
- Date range is inclusive in the file’s date values; default to the earliest and latest valid dates in the uploaded data.
- Channel, audience, and goal filters support selecting multiple values and default to all available values, including “Unknown” where applicable.
- Every view, summary metric, chart, and campaign table must use the same filtered dataset. Show the active filter state and a clear reset-all action.
- Filter options should come from the successfully parsed upload. Changing one filter should not silently reset the others.
- If a selected combination returns no rows, replace data visualizations/tables with a clear empty state such as “No campaigns match these filters. Adjust or reset filters.” Do not present empty results as zero performance.

### View 1 — Overview

- Show headline spend, clicks, conversions, and CPA; show ROI/ROAS when revenue supports them.
- Show a spend-versus-conversions trend over time for the active filter set. Use clearly labeled axes and units; make the dual-axis relationship visually unambiguous, or use separate aligned series to avoid implying shared units.
- Provide concise data-quality and metric-availability notices where relevant.

### View 2 — Platform Comparison

- Compare supported platforms for spend, clicks, conversions, CPA, and ROI/ROAS when available.
- Use consistent definitions, currency, date range, and active filters across platforms.
- Make it easy to see platforms with no rows in the selected range without implying they had zero spend if they were not represented in the file.
- Label units on charts and expose exact values in tooltips or a companion table.

### View 3 — Campaign Details

- Show a campaign-level table with campaign name, channel, audience, goal, date, spend, clicks, conversions, CPA, and ROI/ROAS when calculable.
- Support text search across campaign name and sorting on displayed columns. Keep filters applied while searching and sorting.
- Format dates, currency, counts, percentages, and multiples consistently with the metric definitions.
- Show a clear no-match state when search has no matches, distinct from the global-filter empty state if feasible.

### View 4 — Time Series

- Let users explore performance over time for the active filter set, with a selectable metric from spend, clicks, conversions, and CPA; include ROI/ROAS only when revenue supports them.
- Aggregate by day by default. If the date range is long enough that daily points become unreadable, allow or automatically use weekly aggregation and label the interval.
- Label axes, time interval, and units. Preserve date/channel/audience/goal filters when switching metrics or views.
- Missing dates in the source should not be presented as observed zero performance without an explicit visual distinction.

## 8. UX and accessibility requirements

- Make upload, validation, filters, and navigation understandable without prior setup or training.
- Keep metric names and units visible in cards, axes, tables, and tooltips; do not rely on color alone to distinguish series.
- Provide useful loading/progress feedback during upload and analysis. For a representative valid file within the 10 MB / 500-row limits, render the populated dashboard within 20 seconds of upload completion.
- Make both templates easy to find before upload and explain that users should enter campaign data in the template, then upload the completed file.
- Ensure controls and data tables are keyboard accessible and chart colors/text have adequate contrast.
- Distinguish “no matching rows,” “metric unavailable,” and “value is zero”; these are different states.

## 9. Success measures

Instrument or evaluate the MVP against these initial measures; numeric targets should be set after baseline/usage testing.

- **Time to first useful comparison:** time from opening the app to viewing populated channel comparisons after upload.
- **Successful analysis rate:** share of valid uploads that reach a populated dashboard without a blocking validation error.
- **Filter consistency:** no view shows rows or totals inconsistent with the active global filters.
- **Metric correctness:** spend, clicks, conversions, CPA, ROI, and ROAS match their documented formulas on a reference dataset.
- **Usability:** representative marketers can identify the leading channel by conversions and the most efficient channel by CPA without assistance.
- **Reliability (MVP target):** valid uploads within the 10 MB / 500-row guardrail render without crashes and populate the dashboard within 20 seconds. This latency target is for the MVP only.

## 10. Acceptance criteria

1. **Valid upload** — Given a CSV or supported Excel workbook with all required fields and valid supported rows, when the user uploads it, then the app displays the dashboard without excluding rows.
2. **Missing fields** — Given a CSV or Excel workbook missing a required field, when the user uploads it, then the app blocks analysis and names the missing field(s) and expected headers.
3. **Invalid rows or channels** — Given a file with any invalid row or unsupported channel, when it is processed, then the app blocks the entire upload and reports the affected row numbers, issues, and corrective actions.
4. **Shared filters** — Given populated results in all views, when the user changes any global filter, then every view and every aggregate reflects the same filtered rows without resetting the other filters.
5. **Inclusive date bounds** — Given rows on both selected date boundaries, when the user applies that date range, then rows on the start and end dates are included.
6. **Reset filters** — Given one or more active filters, when the user selects reset, then all filters return to their upload defaults and all views recalculate.
7. **Empty filter results** — Given a filter combination with no matching rows, when applied, then each affected view shows a clear no-results message instead of misleading zero-valued performance.
8. **Revenue absent** — Given a file without the required attributed-revenue field, when the user uploads it, then the app blocks analysis and explains that attributed revenue is required.
9. **ROI formula** — Given spend and attributed revenue, when ROI is shown, then it equals `(revenue - spend) / spend`, uses percent formatting, and is unavailable when spend is zero.
10. **Weighted aggregate rates** — Given campaigns with different denominators, when a rate is displayed in aggregate, then it is computed from aggregate numerator and denominator rather than an arithmetic mean of campaign rates.
11. **Campaign search** — Given a populated campaign table, when a user searches a campaign name, then only matching rows remain while global filters remain in effect; an empty search result has a clear message.
12. **Units and time intervals** — Given any populated chart or table, when displayed, then metric units and the time aggregation interval are visible and consistent with the metric definition.
13. **Upload size and latency** — Given a valid representative file within 10 MB and 500 rows, when the user uploads it, then the populated dashboard is available within 20 seconds of upload completion.
14. **Upload replacement** — Given an analyzed file, when the user uploads a new valid file, then the dashboard and filter options are based on the new upload and do not retain rows from the prior file.
15. **Upload limits** — Given a file larger than 10 MB or containing more than 500 data rows, when the user uploads it, then the app rejects it and explains the applicable limit.
16. **Currency** — Given a file with a currency other than USD or with multiple currencies, when the user uploads it, then the app blocks analysis and explains that MVP uploads must use USD only.
17. **Downloadable templates** — Given the upload screen, when the user chooses a template, then the app downloads a CSV or Excel file with the exact supported required headers, optional supported headers, and instructions, and the completed template can be uploaded successfully.
18. **Template date format** — Given either downloaded template, when the user enters a campaign date in the documented `YYYY-MM-DD` format and uploads the completed file, then the date parses and is included in the dashboard.

## 11. Alternatives and current workaround

| Alternative | How the user solves it today | Limitation this MVP addresses |
|---|---|---|
| Spreadsheet exports | Manually combine platform exports and build pivots/charts | Repeated setup and risk of inconsistent filters or formulas |
| Native ad-platform reporting | Inspect each channel’s reporting UI separately | Harder to compare a shared date range and metric definitions across channels |
| General BI tooling | Model and visualize campaign data in an existing BI stack | More setup than needed for a one-file, self-serve analysis |

This is a lightweight status-quo comparison, not a researched competitor assessment.

## 12. Risks and mitigations

- **ROI is misrepresented:** Revenue may be incomparable. Require attributed revenue and USD inputs; never infer ROI from conversions.
- **CSV schemas vary:** Headers and channel labels differ by source. Start with a documented schema, common channel aliases, and actionable validation errors; defer a configurable column-mapping wizard.
- **Currency is mixed or ambiguous:** Accept USD only, reject non-USD or mixed-currency files, and label assumed USD when currency is omitted.
- **Small or sparse data is over-interpreted:** Show counts and dates; do not imply missing dates or absent platforms equal zero performance.
- **Upload size affects responsiveness:** Enforce the 10 MB / 500-row guardrail and benchmark the 20-second target on the target deployment before release.

## 13. DACI and ownership

| Role | Who | Responsibility |
|---|---|---|
| Driver | Product Manager (TBD) | Own scope and resolve open product decisions |
| Approver | Product Manager (PM) | Final approval of MVP scope |
| Contributors | Designer and engineer (TBD) | Review interaction design, data handling, and implementation estimates |
| Informed | Relevant marketing stakeholders (TBD) | Receive status and launch outcome |

## 14. Implementation validation before release

- Benchmark the 20-second MVP latency target in the intended deployment environment using a representative file within the 10 MB / 500-row limits. This is an MVP target, not a commitment for later versions.

## 15. Suggested implementation sequence

1. Define and test the CSV contract, validation, normalization, and metric calculations with a small reference dataset.
2. Build upload flow, shared filter state, and empty/error states.
3. Implement Overview and Platform Comparison against shared aggregation logic.
4. Add Campaign Details search/sort and Time Series metric/interval controls.
5. Verify acceptance criteria across all views using reference files, including missing revenue, zero denominators, invalid rows, and empty filters.

**Review checkpoints:** Revisit this PRD after CSV/schema validation, design review, and engineering estimation; update the status and changelog as decisions are made.
