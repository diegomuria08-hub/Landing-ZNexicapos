import logging
from datetime import datetime
import zoneinfo
import httpx

logger = logging.getLogger("time_service")

CARACAS_TZ = zoneinfo.ZoneInfo("America/Caracas")

def get_realtime_caracas_now() -> datetime:
    """
    Obtiene la fecha y hora exacta en tiempo real para el registro de pagos.
    Prioridad:
    1. Consumir WorldTimeAPI (http/https://worldtimeapi.org/api/timezone/America/Caracas).
    2. Fallback resiliente a TimeAPI.io.
    3. Fallback a reloj del sistema con zona horaria America/Caracas.
    """
    # 1. Intentar WorldTimeAPI
    urls = [
        "http://worldtimeapi.org/api/timezone/America/Caracas",
        "https://worldtimeapi.org/api/timezone/America/Caracas"
    ]
    for url in urls:
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(url, headers={"User-Agent": "miniPOS-RealTime/1.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    # Formato WorldTimeAPI: "2026-10-15T09:41:00.123456-04:00"
                    dt_str = data.get("datetime")
                    if dt_str:
                        dt = datetime.fromisoformat(dt_str)
                        # Retornar como naive datetime en hora local de Caracas
                        return dt.astimezone(CARACAS_TZ).replace(tzinfo=None)
        except Exception as e:
            logger.warning(f"WorldTimeAPI ({url}) no disponible o cerrada por el host: {e}")

    # 2. Fallback TimeAPI.io
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get("https://timeapi.io/api/time/current/zone?timeZone=America/Caracas")
            if resp.status_code == 200:
                data = resp.json()
                dt_str = data.get("dateTime")
                if dt_str:
                    return datetime.fromisoformat(dt_str)
    except Exception as e:
        logger.warning(f"TimeAPI.io fallback no disponible: {e}")

    # 3. Fallback seguro a reloj de sistema con zona horaria America/Caracas
    now_caracas = datetime.now(CARACAS_TZ)
    return now_caracas.replace(tzinfo=None)


def get_realtime_date_str() -> str:
    """Devuelve la fecha actual en formato YYYY-MM-DD."""
    return get_realtime_caracas_now().strftime("%Y-%m-%d")


def get_realtime_formatted_str() -> str:
    """Devuelve la fecha y hora formateada en español, ej: 15/10/2026 09:41 a. m."""
    now = get_realtime_caracas_now()
    d_str = now.strftime("%d/%m/%Y")
    hour = now.hour
    minute = now.minute
    ampm = "a. m." if hour < 12 else "p. m."
    h12 = hour % 12 or 12
    return f"{d_str} {h12:02d}:{minute:02d} {ampm}"
