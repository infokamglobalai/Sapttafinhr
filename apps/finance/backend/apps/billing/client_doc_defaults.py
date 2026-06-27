"""Default client contract / SOW templates (Jinja2 HTML body)."""

DEFAULT_CLIENT_DOC_TEMPLATES: dict[str, dict] = {
    "sow": {
        "name": "Statement of Work (SOW) — Standard",
        "html": """
<p style="text-align:right;">Ref: {{ doc_no }}<br>Date: {{ today_formatted }}</p>
<h2 style="text-align:center; margin: 16px 0;">STATEMENT OF WORK</h2>
<p><strong>{{ company.name }}</strong>{% if company.gstin %} (GSTIN: {{ company.gstin }}){% endif %}<br>
<strong>Client:</strong> {{ customer.name }}{% if customer.gstin %} (GSTIN: {{ customer.gstin }}){% endif %}</p>

<p>This Statement of Work ("SOW") is entered into between <strong>{{ company.legal_name or company.name }}</strong>
("Service Provider") and <strong>{{ customer.legal_name or customer.name }}</strong> ("Client")
{% if quotation %} pursuant to Quotation <strong>{{ quotation.quote_no }}</strong> dated {{ quotation.date }}{% endif %}.</p>

<h3 style="margin-top: 20px;">1. Project</h3>
<p><strong>Project name:</strong> {{ project_name or "As described below" }}</p>
<p><strong>Estimated value:</strong> {{ project_value_fmt or quotation.grand_total_fmt or "As per quotation" }}</p>

<h3>2. Scope of services</h3>
{% if quotation and quotation.lines %}
<table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:10pt;">
  <tr style="background:#f3f4f6;">
    <th style="border:1px solid #ccc; padding:8px; text-align:left;">Description</th>
    <th style="border:1px solid #ccc; padding:8px; text-align:right;">Qty</th>
    <th style="border:1px solid #ccc; padding:8px; text-align:right;">Amount</th>
  </tr>
  {% for line in quotation.lines %}
  <tr>
    <td style="border:1px solid #ccc; padding:8px;">{{ line.description }}</td>
    <td style="border:1px solid #ccc; padding:8px; text-align:right;">{{ line.quantity }}</td>
    <td style="border:1px solid #ccc; padding:8px; text-align:right;">{{ line.line_total_fmt }}</td>
  </tr>
  {% endfor %}
</table>
{% else %}
<p>{{ scope_summary or "Professional services as mutually agreed." }}</p>
{% endif %}

<h3>3. Milestones &amp; deliverables</h3>
<p style="white-space:pre-line;">{{ milestones or "Milestone schedule to be agreed during project kick-off." }}</p>

<h3>4. Timeline</h3>
<p><strong>Start:</strong> {{ contract_start or "Upon signing" }}<br>
<strong>End / go-live:</strong> {{ contract_end or "As per milestone plan" }}</p>

<h3>5. Commercial terms</h3>
<p style="white-space:pre-line;">{{ payment_terms or "Invoicing as per agreed milestone schedule. Taxes extra as applicable." }}</p>

<h3>6. Acceptance</h3>
<p>Both parties accept this SOW by signing below.</p>

<table style="width:100%; margin-top:48px;">
  <tr>
    <td style="width:50%; vertical-align:top;">
      <p>For <strong>{{ company.name }}</strong></p>
      <p style="margin-top:40px;">Authorized Signatory<br>Name &amp; Title</p>
    </td>
    <td style="width:50%; vertical-align:top;">
      <p>For <strong>{{ customer.name }}</strong></p>
      <p style="margin-top:40px;">Authorized Signatory<br>Name &amp; Title</p>
    </td>
  </tr>
</table>
""",
    },
    "msa": {
        "name": "Master Service Agreement (MSA) — Short form",
        "html": """
<p style="text-align:right;">Ref: {{ doc_no }}<br>Date: {{ today_formatted }}</p>
<h2 style="text-align:center; margin: 16px 0;">MASTER SERVICE AGREEMENT</h2>

<p>This Master Service Agreement ("Agreement") is between <strong>{{ company.legal_name or company.name }}</strong>
("Provider") and <strong>{{ customer.legal_name or customer.name }}</strong> ("Client").</p>

<h3>1. Services</h3>
<p>Provider shall perform professional services as described in one or more Statements of Work executed under this Agreement.</p>

<h3>2. Term</h3>
<p>This Agreement commences on <strong>{{ contract_start or today_formatted }}</strong> and continues until
<strong>{{ contract_end or "terminated per Section 6" }}</strong>, unless extended in writing.</p>

<h3>3. Fees &amp; payment</h3>
<p style="white-space:pre-line;">{{ payment_terms or "Fees as stated in each SOW. Invoices payable within 30 days unless otherwise agreed." }}</p>

<h3>4. Confidentiality</h3>
<p>Each party shall protect the other's confidential information and use it only for performing under this Agreement.</p>

<h3>5. Limitation of liability</h3>
<p>Except for fraud or wilful misconduct, neither party's aggregate liability shall exceed fees paid in the twelve months preceding the claim.</p>

<h3>6. Termination</h3>
<p>Either party may terminate with 30 days written notice. Outstanding fees for work performed remain payable.</p>

<h3>7. Governing law</h3>
<p>This Agreement is governed by the laws applicable at Provider's registered place of business.</p>

<table style="width:100%; margin-top:48px;">
  <tr>
    <td style="width:50%;"><p>For <strong>{{ company.name }}</strong></p><p style="margin-top:40px;">Signatory</p></td>
    <td style="width:50%;"><p>For <strong>{{ customer.name }}</strong></p><p style="margin-top:40px;">Signatory</p></td>
  </tr>
</table>
""",
    },
    "nda": {
        "name": "Mutual NDA — Short form",
        "html": """
<p style="text-align:right;">Ref: {{ doc_no }}<br>Date: {{ today_formatted }}</p>
<h2 style="text-align:center;">MUTUAL NON-DISCLOSURE AGREEMENT</h2>
<p><strong>{{ company.name }}</strong> and <strong>{{ customer.name }}</strong> ("Parties") agree to protect
each other's confidential information disclosed in connection with: {{ project_name or "a potential business engagement" }}.</p>
<p>Confidential information shall not be disclosed to third parties except as required by law. Term: 2 years from last disclosure.</p>
<table style="width:100%; margin-top:48px;">
  <tr>
    <td style="width:50%;"><p><strong>{{ company.name }}</strong></p><p style="margin-top:40px;">Signatory</p></td>
    <td style="width:50%;"><p><strong>{{ customer.name }}</strong></p><p style="margin-top:40px;">Signatory</p></td>
  </tr>
</table>
""",
    },
}


def get_default_html(doc_type: str) -> str:
    return DEFAULT_CLIENT_DOC_TEMPLATES.get(doc_type, {}).get("html", "<p>{{ project_name }}</p>")


def get_default_name(doc_type: str) -> str:
    return DEFAULT_CLIENT_DOC_TEMPLATES.get(doc_type, {}).get("name", doc_type.replace("_", " ").title())
