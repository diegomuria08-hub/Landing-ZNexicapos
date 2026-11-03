"""
Cliente oficial de la API Externa de Aprovisionamiento y Gestión SaaS de ZNexica POS (miniPOS).

Documentación y peticiones de prueba (Postman/cURL): ver README.md en esta misma carpeta.
"""
from app.integrations.znexica_api.client import (  # noqa: F401
    ZNexicaApiError,
    ZNexicaApiAuthError,
    ZNexicaApiConflictError,
    ZNexicaApiValidationError,
    ZNexicaApiNotFoundError,
    provision_tenant,
    set_user_status,
)

