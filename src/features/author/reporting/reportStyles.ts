export const REPORT_PRINT_STYLES = `
  @page {
    size: Letter portrait;
    margin: 16mm;
  }

  :root {
    color-scheme: light;
  }

  html, body {
    background: #ffffff;
    color: #111118;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.42;
    margin: 0;
    padding: 0;
  }

  body {
    padding: 0;
  }

  .report {
    width: 100%;
  }

  .masthead {
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #c0172d;
  }

  h1 {
    color: #c0172d;
    font-size: 23pt;
    line-height: 1.1;
    margin: 0 0 8px;
  }

  .meta {
    color: #555564;
    font-size: 9.5pt;
    margin: 0;
  }

  .section {
    margin-top: 18px;
  }

  .section-title,
  .block-title {
    color: #111118;
    line-height: 1.2;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  .section-title {
    font-size: 14pt;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #bfc2cc;
  }

  .block {
    margin-top: 10px;
  }

  .block-title {
    font-size: 11pt;
    margin: 0 0 6px;
  }

  p {
    margin: 0 0 8px;
  }

  .paragraphs p + p {
    margin-top: 6px;
  }

  .five-whys {
    width: 100%;
  }

  .five-whys-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .five-whys-panel {
    padding: 9px 10px;
    border: 1px solid #d7d9e0;
    border-radius: 8px;
    background: #fcfcfd;
  }

  .five-whys-step {
    background: #ffffff;
  }

  .five-whys-step-title {
    margin: 0 0 8px;
    font-size: 10.5pt;
    line-height: 1.2;
    color: #c0172d;
  }

  .five-whys-label {
    margin-top: 0;
    margin-bottom: 4px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #3e4050;
  }

  .five-whys-text {
    margin: 0;
  }

  .five-whys-panel + .five-whys-panel {
    margin-top: 0;
  }

  .five-whys-list {
    margin: 0;
    padding-left: 18px;
  }

  .five-whys-list li + li {
    margin-top: 4px;
  }

  .historical-review-card {
    width: 100%;
    border: 1px solid #d7d9e0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #ffffff;
    margin-top: 12px;
  }

  .historical-review-card-title {
    margin: 0 0 8px;
  }

  .historical-review-card-metadata {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px 10px;
    margin-bottom: 10px;
  }

  .historical-review-card-metadata-item {
    padding: 7px 8px;
    border: 1px solid #e2e4eb;
    border-radius: 8px;
    background: #fafafa;
  }

  .historical-review-card-label {
    margin: 0 0 4px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #3e4050;
  }

  .historical-review-card-value {
    margin: 0;
  }

  .historical-review-card-section {
    margin-top: 10px;
  }

  .historical-review-card-section--narrative p + p {
    margin-top: 6px;
  }

  .historical-review-card-section-title {
    margin: 0 0 6px;
    font-size: 10pt;
    line-height: 1.2;
    color: #111118;
  }

  .historical-review-card-list {
    margin: 0;
    padding-left: 18px;
  }

  .historical-review-card-list li + li {
    margin-top: 4px;
  }

  .detail-card {
    width: 100%;
    border: 1px solid #d7d9e0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #ffffff;
    margin-top: 12px;
  }

  .detail-card-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .detail-card-heading {
    min-width: 0;
  }

  .detail-card-title {
    margin: 0;
  }

  .detail-card-subtitle {
    margin: 4px 0 0;
    font-size: 9pt;
    color: #555564;
  }

  .detail-card-status {
    flex: 0 0 auto;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f3f4f7;
    color: #3e4050;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .detail-card-metadata,
  .detail-card-group-metadata {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px 10px;
    margin-bottom: 10px;
  }

  .detail-card-group-metadata {
    margin-bottom: 0;
  }

  .detail-card-metadata-item,
  .detail-card-group-metadata-item {
    padding: 7px 8px;
    border: 1px solid #e2e4eb;
    border-radius: 8px;
    background: #fafafa;
  }

  .detail-card-metadata-label,
  .detail-card-group-metadata-label {
    margin: 0 0 4px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #3e4050;
  }

  .detail-card-metadata-value,
  .detail-card-group-metadata-value {
    color: #111118;
    word-break: normal;
    overflow-wrap: break-word;
  }

  .detail-card-group {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eaebef;
  }

  .detail-card-group-title {
    margin: 0 0 8px;
    font-size: 10pt;
    line-height: 1.2;
    color: #111118;
  }

  .sequence-events {
    width: 100%;
  }

  .sequence-events-table {
    table-layout: fixed;
  }

  .sequence-events-col-date {
    width: 18%;
  }

  .sequence-events-col-event {
    width: 58%;
  }

  .sequence-events-col-traceability {
    width: 24%;
  }

  .sequence-events th,
  .sequence-events td {
    word-break: normal;
    overflow-wrap: break-word;
  }

  .sequence-events th {
    vertical-align: bottom;
  }

  .sequence-events-row {
    background: #ffffff;
    break-inside: auto;
    page-break-inside: auto;
  }

  .sequence-events-row--review {
    background: #fbfcff;
  }

  .sequence-events-cell {
    padding: 8px 8px;
  }

  .sequence-events-date {
    font-weight: 700;
    color: #3e4050;
  }

  .sequence-events-event-text {
    margin: 0;
    font-weight: 600;
    color: #111118;
  }

  .sequence-events-review {
    margin-top: 8px;
    padding: 7px 8px;
    border: 1px solid #d7d9e0;
    border-radius: 8px;
    background: #f8faff;
  }

  .sequence-events-review-title {
    margin: 0 0 4px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #3e4050;
  }

  .sequence-events-review-line {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }

  .sequence-events-review-label {
    font-weight: 700;
    color: #3e4050;
    white-space: nowrap;
  }

  .sequence-events-review-value {
    color: #111118;
  }

  .sequence-events-traceability {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sequence-events-traceability-line {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sequence-events-traceability-label {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #3e4050;
  }

  .sequence-events-traceability-value {
    word-break: normal;
    overflow-wrap: break-word;
  }

  .sequence-events-confidence {
    font-size: 9pt;
    color: #555564;
  }

  .sequence-events-empty {
    color: #6b6b7a;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.5pt;
  }

  thead {
    display: table-header-group;
  }

  tbody tr,
  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th,
  td {
    border: 1px solid #d7d9e0;
    padding: 6px 7px;
    vertical-align: top;
    text-align: left;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  th {
    background: #f3f4f7;
    font-weight: 700;
    color: #22222f;
  }

  .key-value {
    width: 100%;
  }

  .key-value tbody tr:nth-child(even) td {
    background: #fcfcfd;
  }

  .key-value .label {
    width: 26%;
    font-weight: 700;
    color: #3e4050;
  }

  .key-value .value {
    width: 74%;
  }

  .footer {
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #d7d9e0;
    color: #555564;
    font-size: 9pt;
  }
`
