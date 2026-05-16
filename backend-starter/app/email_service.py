import resend
from .config import settings

resend.api_key = settings.RESEND_API_KEY

def send_password_reset_email(to_email: str, reset_link: str):
    if not settings.RESEND_API_KEY:
        print(f"Mock email to {to_email}: Reset your password here {reset_link}")
        return True

    try:
        params = {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": "Reset your IronLog Password",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password for your IronLog account.</p>
                <p>Click the button below to reset it:</p>
                <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            """
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
