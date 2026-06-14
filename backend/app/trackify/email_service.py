"""Email notifications for Trackify."""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)


APP_NAME = "LuMen - Smart Shopping Reader"
FROM_NAME = "LuMen Team"


def _send_via_brevo(subject: str, body: str, recipient: str, sender: str) -> bool:
    """Send through Brevo's HTTP API (port 443) — works on hosts like Render
    that block outbound SMTP ports."""
    import httpx

    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        return False
    payload = {
        "sender": {"name": FROM_NAME, "email": sender},
        "to": [{"email": recipient}],
        "subject": subject,
        "textContent": body,
    }
    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": api_key, "content-type": "application/json"},
            json=payload,
            timeout=20,
        )
        if r.status_code in (200, 201, 202):
            return True
        log.error("Brevo send failed (%s): %s", r.status_code, r.text[:300])
        return False
    except Exception:
        log.exception("Brevo request failed for %s", recipient)
        return False


def _send_via_smtp(message: EmailMessage, recipient: str, sender: str, password: str) -> bool:
    message["From"] = f"{FROM_NAME} <{sender}>"
    message["To"] = recipient
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
            smtp.login(sender, password)
            smtp.send_message(message)
        return True
    except Exception:
        log.exception("SMTP send failed for %s (host may block outbound SMTP)", recipient)
        return False


def _send_message(message: EmailMessage, recipient: str) -> bool:
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")
    if not sender:
        log.warning("Email skipped because EMAIL_USER is missing")
        return False

    # Prefer Brevo's HTTP API (works where SMTP ports are blocked, e.g. Render).
    subject = message["Subject"] or ""
    body = message.get_content()
    if _send_via_brevo(subject, body, recipient, sender):
        return True

    # Fall back to direct SMTP (works locally / on hosts that allow it).
    if password:
        return _send_via_smtp(message, recipient, sender, password)

    log.warning("No working email transport: Brevo not configured and EMAIL_PASS missing")
    return False


def send_price_alert(
    email: str,
    product_name: str,
    price: float,
    link: str,
    target_price: float,
    old_price: float | None = None,
) -> bool:
    message = EmailMessage()
    message["Subject"] = "Price Alert: Your Tracked Product is Now Available at Your Target Price"
    message.set_content(
        "\n".join(
            [
                APP_NAME,
                "",
                "Dear User,",
                "",
                "We're pleased to inform you that a product you are tracking on LuMen has reached your desired price.",
                "",
                "Product Details:",
                f"- Product Name: {product_name}",
                f"- Old Price: {old_price if old_price is not None else 'Not available'}",
                f"- Current Price: {price}",
                f"- Your Target Price: {target_price}",
                "",
                "This means the product is now available at or below the price you specified.",
                "",
                "You can view or purchase the product using the link below:",
                str(link),
                "",
                "Price dropped! Buy now",
                "",
                "We recommend acting promptly, as prices may fluctuate.",
                "",
                "Best regards,",
                "LuMen Team",
            ]
        )
    )
    return _send_message(message, email)


def send_password_reset_otp(email: str, otp_code: str) -> bool:
    message = EmailMessage()
    message["Subject"] = "LuMen Password Reset Verification Code"
    message.set_content(
        "\n".join(
            [
                APP_NAME,
                "",
                "Dear User,",
                "",
                "We received a request to reset your password.",
                "",
                f"OTP Code: {otp_code}",
                "",
                "Valid for 5 minutes. Do not share.",
                "",
                "Best regards,",
                "LuMen Security Team",
            ]
        )
    )
    return _send_message(message, email)
