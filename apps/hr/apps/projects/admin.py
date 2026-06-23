from django.contrib import admin

from .models import Project, ProjectDocument, ProjectMember, ProjectUpdate, TimeEntry

admin.site.register(Project)
admin.site.register(ProjectMember)
admin.site.register(ProjectDocument)
admin.site.register(ProjectUpdate)
admin.site.register(TimeEntry)
