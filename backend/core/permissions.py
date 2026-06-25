from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.role == "admin"

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsAdminOrEmployee(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ("admin", "employee")

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
