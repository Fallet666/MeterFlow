from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "get_username")
    list_filter = ("role",)
    search_fields = ("user__username",)

    def get_username(self, obj):
        return obj.user.username

    get_username.short_description = "Имя пользователя"
