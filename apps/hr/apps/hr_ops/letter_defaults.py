"""Default HR letter templates — India SMB style, Jinja2 placeholders."""

DEFAULT_LETTER_TEMPLATES: dict[str, dict] = {
    "offer": {
        "name": "Offer Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
  {% if company.address %}<p style="font-size: 9pt;">{{ company.address }}{% if company.city %}, {{ company.city }}{% endif %}</p>{% endif %}
</div>
<p style="text-align: right;">Ref: {{ company.ref_prefix }}/OFF/{{ employee.employee_code }}<br>Date: {{ today_formatted }}</p>
<p>Dear {{ employee.first_name }},</p>
<p>We are pleased to offer you employment with <strong>{{ company.name }}</strong> on the following terms:</p>
<table style="width:100%; border-collapse: collapse; margin: 16px 0; font-size: 11pt;">
  <tr><td style="padding:6px; border:1px solid #ccc; width:40%;"><strong>Designation</strong></td><td style="padding:6px; border:1px solid #ccc;">{{ employee.designation.name|default("—") }}</td></tr>
  <tr><td style="padding:6px; border:1px solid #ccc;"><strong>Department</strong></td><td style="padding:6px; border:1px solid #ccc;">{{ employee.department.name|default("—") }}</td></tr>
  <tr><td style="padding:6px; border:1px solid #ccc;"><strong>Date of Joining</strong></td><td style="padding:6px; border:1px solid #ccc;">{{ joining_date|default(employee.date_of_joining) }}</td></tr>
  <tr><td style="padding:6px; border:1px solid #ccc;"><strong>Work Location</strong></td><td style="padding:6px; border:1px solid #ccc;">{{ employee.location.name|default(company.city|default("—")) }}</td></tr>
  <tr><td style="padding:6px; border:1px solid #ccc;"><strong>Annual CTC (INR)</strong></td><td style="padding:6px; border:1px solid #ccc;">{{ ctc|default("As discussed") }}</td></tr>
</table>
<p>This offer is subject to successful verification of your documents and background checks. You will be on probation for the period stated in company policy, after which your employment may be confirmed.</p>
<p>Please sign and return a copy of this letter as acceptance within 7 days.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "appointment": {
        "name": "Appointment Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
  {% if company.address %}<p style="font-size: 9pt;">{{ company.address }}</p>{% endif %}
</div>
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p><strong>Appointment Letter</strong></p>
<p>Dear {{ employee.full_name }},</p>
<p>Further to your acceptance of our offer, we are pleased to confirm your appointment as <strong>{{ employee.designation.name|default("—") }}</strong> in the <strong>{{ employee.department.name|default("—") }}</strong> department of {{ company.name }}, effective <strong>{{ employee.date_of_joining }}</strong>.</p>
<p>Your employee code is <strong>{{ employee.employee_code }}</strong>. You shall report to {{ employee.reporting_manager.full_name|default("your department head") }} and abide by all company policies, including attendance, leave, and conduct rules.</p>
<p>Your compensation and benefits are as per the offer letter and applicable company policies.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "experience": {
        "name": "Experience Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
  {% if company.address %}<p style="font-size: 9pt;">{{ company.address }}</p>{% endif %}
</div>
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p><strong>To Whom It May Concern</strong></p>
<p>This is to certify that <strong>{{ employee.full_name }}</strong> (Employee ID: {{ employee.employee_code }}) was employed with {{ company.name }} as <strong>{{ employee.designation.name|default("—") }}</strong> in the {{ employee.department.name|default("—") }} department from <strong>{{ employee.date_of_joining }}</strong> to <strong>{{ last_working_day|default(employee.date_of_exit|default(today_formatted)) }}</strong>.</p>
<p>During this period, {{ employee.first_name }} performed duties with diligence and maintained professional conduct. We wish {{ employee.first_name }} success in future endeavours.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "relieving": {
        "name": "Relieving Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
  {% if company.address %}<p style="font-size: 9pt;">{{ company.address }}</p>{% endif %}
</div>
<p style="text-align: right;">Ref: {{ company.ref_prefix }}/REL/{{ employee.employee_code }}<br>Date: {{ today_formatted }}</p>
<p>Dear {{ employee.full_name }},</p>
<p>This is with reference to your resignation dated <strong>{{ resignation_date|default("—") }}</strong>. We accept your resignation and confirm that you are relieved from your duties at {{ company.name }} with effect from the close of business on <strong>{{ last_working_day|default(employee.date_of_exit|default(today_formatted)) }}</strong>.</p>
<p>You were employed as <strong>{{ employee.designation.name|default("—") }}</strong> (Employee ID: {{ employee.employee_code }}) from {{ employee.date_of_joining }} until your last working day.</p>
<p>We thank you for your contributions and wish you the best for your future career.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "increment": {
        "name": "Increment Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
</div>
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p>Dear {{ employee.full_name }},</p>
<p>We are pleased to inform you that in recognition of your performance and contribution to {{ company.name }}, your compensation has been revised.</p>
<p>Your revised Annual CTC will be <strong>INR {{ new_ctc|default("—") }}</strong> effective <strong>{{ effective_date|default(today_formatted) }}</strong>. Other terms of your employment remain unchanged.</p>
<p>Congratulations and we look forward to your continued success with us.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "promotion": {
        "name": "Promotion Letter — Standard",
        "html": """
<p style="text-align: right;">Ref: {{ company.ref_prefix }}/PRO/{{ employee.employee_code }}<br>Date: {{ today_formatted }}</p>
<p>Dear {{ employee.full_name }},</p>
<p>We are pleased to inform you that you have been promoted to <strong>{{ new_designation|default(employee.designation.name|default("—")) }}</strong>{% if new_department %} in the <strong>{{ new_department }}</strong> department{% endif %}, effective <strong>{{ effective_date|default(today_formatted) }}</strong>.</p>
<p>This promotion reflects your performance, leadership, and contribution to {{ company.name }}. Your revised compensation and benefits will be communicated separately.</p>
<p>Congratulations and we wish you continued success in your new role.</p>
""",
    },
    "confirmation": {
        "name": "Confirmation Letter — Standard",
        "html": """
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p><strong>Subject: Confirmation of Employment</strong></p>
<p>Dear {{ employee.full_name }},</p>
<p>We are pleased to confirm your employment with {{ company.name }} as <strong>{{ employee.designation.name|default("—") }}</strong>, effective <strong>{{ confirmation_date|default(today_formatted) }}</strong>, upon successful completion of your probation period.</p>
<p>All other terms and conditions of your employment remain unchanged. We look forward to your continued contribution.</p>
""",
    },
    "termination": {
        "name": "Termination Letter — Standard",
        "html": """
<p style="text-align: right;">Ref: {{ company.ref_prefix }}/TER/{{ employee.employee_code }}<br>Date: {{ today_formatted }}</p>
<p>Dear {{ employee.full_name }},</p>
<p>This letter is to inform you that your employment with {{ company.name }} is terminated with effect from <strong>{{ last_working_day|default(employee.date_of_exit|default(today_formatted)) }}</strong>.</p>
<p>Reason: <strong>{{ termination_reason|default("As per company policy and applicable law") }}</strong>.</p>
<p>Please complete the exit formalities, return company assets, and collect your full &amp; final settlement as per policy.</p>
""",
    },
    "internship": {
        "name": "Internship Letter — Standard",
        "html": """
<p style="text-align: right;">Ref: {{ company.ref_prefix }}/INT/{{ employee.employee_code }}<br>Date: {{ today_formatted }}</p>
<p>Dear {{ employee.first_name }},</p>
<p>We are pleased to offer you an internship with <strong>{{ company.name }}</strong> as <strong>{{ employee.designation.name|default("Intern") }}</strong> from <strong>{{ internship_start|default(employee.date_of_joining) }}</strong> to <strong>{{ internship_end|default("—") }}</strong>.</p>
<p>During this period you will report to {{ employee.reporting_manager.full_name|default("your mentor") }} and abide by company policies applicable to interns.</p>
<p>Upon successful completion, a certificate of internship may be issued at the company's discretion.</p>
""",
    },
    "warning": {
        "name": "Warning Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
</div>
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p><strong>Subject: {{ warning_subject|default("Formal Warning") }}</strong></p>
<p>Dear {{ employee.full_name }},</p>
<p>This letter serves as a formal warning regarding: <strong>{{ warning_reason|default("—") }}</strong>.</p>
<p>You are required to take immediate corrective action. Failure to improve may lead to further disciplinary action as per company policy.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
    "appreciation": {
        "name": "Appreciation Letter — Standard",
        "html": """
<div class="header">
  <p style="font-size: 14pt; font-weight: bold;">{{ company.name }}</p>
</div>
<p style="text-align: right;">Date: {{ today_formatted }}</p>
<p>Dear {{ employee.full_name }},</p>
<p>We would like to express our sincere appreciation for your outstanding contribution: <strong>{{ appreciation_reason|default("your dedication and excellent work") }}</strong>.</p>
<p>Your efforts make a meaningful difference to {{ company.name }}. Thank you for your commitment.</p>
<div class="signature">
  <p>For <strong>{{ company.name }}</strong></p>
  <p style="margin-top: 40px;"><strong>{{ company.signatory_name|default("Authorized Signatory") }}</strong><br>{{ company.signatory_title }}</p>
</div>
""",
    },
}


def get_default_html(letter_type: str) -> str | None:
    entry = DEFAULT_LETTER_TEMPLATES.get(letter_type)
    return entry["html"].strip() if entry else None


def get_default_name(letter_type: str) -> str:
    entry = DEFAULT_LETTER_TEMPLATES.get(letter_type)
    return entry["name"] if entry else f"{letter_type.title()} Letter — Standard"
