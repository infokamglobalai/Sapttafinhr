from django.db.models import ProtectedError, RestrictedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, (ProtectedError, RestrictedError)):
        refs = {}
        for obj in exc.protected_objects:
            label = obj._meta.verbose_name_plural.title()
            refs[label] = refs.get(label, 0) + 1

        blocking = [
            f"{count} {label}" if count > 1 else f"1 {label.rstrip('s') if label.endswith('s') else label}"
            for label, count in refs.items()
        ]

        return Response(
            {
                "detail": f"Cannot delete — referenced by: {', '.join(blocking)}.",
                "blocking": refs,
            },
            status=status.HTTP_409_CONFLICT,
        )

    return drf_exception_handler(exc, context)
