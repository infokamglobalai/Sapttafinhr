# Generated for company document branding (logo + report/invoice presentation).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('masters', '0008_company_country_company_standard_vat_rate_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='logo',
            field=models.TextField(blank=True, help_text='Company logo as a base64 data URL (PNG/JPG/SVG).'),
        ),
        migrations.AddField(
            model_name='company',
            name='document_header',
            field=models.CharField(blank=True, help_text='Short note shown under the company name on documents (e.g. tagline).', max_length=120),
        ),
        migrations.AddField(
            model_name='company',
            name='document_footer',
            field=models.CharField(blank=True, help_text='Footer note shown at the bottom of documents (terms, thanks, etc.).', max_length=240),
        ),
        migrations.AddField(
            model_name='company',
            name='brand_color',
            field=models.CharField(blank=True, help_text='Accent colour as hex (e.g. #4f46e5) for document headings and table headers.', max_length=7),
        ),
        migrations.AddField(
            model_name='company',
            name='document_template',
            field=models.CharField(choices=[('CLASSIC', 'Classic'), ('MODERN', 'Modern')], default='CLASSIC', help_text='Layout style applied to generated documents.', max_length=8),
        ),
        migrations.AddField(
            model_name='historicalcompany',
            name='logo',
            field=models.TextField(blank=True, help_text='Company logo as a base64 data URL (PNG/JPG/SVG).'),
        ),
        migrations.AddField(
            model_name='historicalcompany',
            name='document_header',
            field=models.CharField(blank=True, help_text='Short note shown under the company name on documents (e.g. tagline).', max_length=120),
        ),
        migrations.AddField(
            model_name='historicalcompany',
            name='document_footer',
            field=models.CharField(blank=True, help_text='Footer note shown at the bottom of documents (terms, thanks, etc.).', max_length=240),
        ),
        migrations.AddField(
            model_name='historicalcompany',
            name='brand_color',
            field=models.CharField(blank=True, help_text='Accent colour as hex (e.g. #4f46e5) for document headings and table headers.', max_length=7),
        ),
        migrations.AddField(
            model_name='historicalcompany',
            name='document_template',
            field=models.CharField(choices=[('CLASSIC', 'Classic'), ('MODERN', 'Modern')], default='CLASSIC', help_text='Layout style applied to generated documents.', max_length=8),
        ),
    ]
