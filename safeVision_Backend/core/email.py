import os
from dotenv import load_dotenv
from sib_api_v3_sdk import (
    Configuration,
    ApiClient,
    TransactionalEmailsApi,
    SendSmtpEmail,
    SendSmtpEmailSender,
    SendSmtpEmailTo,
)
from sib_api_v3_sdk.rest import ApiException

# Load .env 
load_dotenv()

# Get config from .env
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = os.getenv("BREVO_EMAIL_FROM") 

if not BREVO_API_KEY:
    raise ValueError("BREVO_API_KEY is missing in .env")
if not FROM_EMAIL:
    raise ValueError("BREVO_EMAIL_FROM is missing in .env")

# Initialize Brevo client 
configuration = Configuration()
configuration.api_key['api-key'] = BREVO_API_KEY
api_client = ApiClient(configuration)
api_instance = TransactionalEmailsApi(api_client)


def send_verification_email(
    to_email: str,
    token: str,
    authority_name: str,
    category: str,
    base_url: str = "http://127.0.0.1:8000"
) -> bool:

    verification_url = f"{base_url}/contacts/verify/{token}"

    # HTML template
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>SafeVision – Confirm Your Registration</h2>
        <p>Hello,</p>
        <p>A new emergency responder has been registered with this email:</p>
        <ul>
            <li><strong>Authority / Organization:</strong> {authority_name}</li>
            <li><strong>Category:</strong> {category}</li>
        </ul>
        <p>To activate this contact and receive emergency alerts, please confirm:</p>
        <a href="{verification_url}" style="background:#0066cc; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block; margin:20px 0;">
            Confirm & Activate
        </a>
        <p>The link expires in 24 hours.</p>
        <p>Best regards,<br>SafeVision Team</p>
    </body>
    </html>
    """

    # Build Brevo email object
    send_smtp_email = SendSmtpEmail(
        sender=SendSmtpEmailSender(email=FROM_EMAIL, name="SafeVision"),
        to=[SendSmtpEmailTo(email=to_email)],
        subject="SafeVision – Activate Your Emergency Contact",
        html_content=html_content
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"Email sent successfully: {response}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False  
    

def send_accident_alert_email(
    to_email        : str,
    authority_name  : str,
    camera_location : str,
    confidence      : float,
    detection_type  : str,
    timestamp       : str,
    frame_path      : str = None,
) -> bool:

    subject = f" {detection_type.upper()} DETECTED — {camera_location}"
    alert_color = "#ff4444" if detection_type == "accident" else "#ff8c00"

    html_content = f"""
    <html>
    <body style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px;">

        <div style="background: {alert_color}; padding: 20px; 
                    border-radius: 8px; text-align: center;">
            <h1 style="color: white; margin: 0;">
                EMERGENCY ALERT
            </h1>
        </div>

        <div style="background: #f9f9f9; padding: 20px; margin-top: 20px; 
                    border-radius: 8px; 
                    border-left: 4px solid {alert_color};">

            <h2 style="color: #333;">Dear {authority_name},</h2>
            <p style="font-size: 16px; color: #555;">
                A <strong>{detection_type.upper()}</strong> has been 
                confirmed by SafeVision.
            </p>

            <table style="width:100%; border-collapse:collapse; 
                    margin-top:15px;">
                <tr style="background:#fff;">
                    <td style="padding:10px; border:1px solid #ddd; 
                                font-weight:bold; width:40%;">
                        Detection Type
                    </td>
                    <td style="padding:10px; border:1px solid #ddd;">
                        {detection_type.upper()}
                    </td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px; border:1px solid #ddd; 
                                font-weight:bold;">
                        Location
                    </td>
                    <td style="padding:10px; border:1px solid #ddd;">
                        📍 {camera_location}
                    </td>
                </tr>
                <tr style="background:#fff;">
                    <td style="padding:10px; border:1px solid #ddd; 
                                font-weight:bold;">
                        Confidence
                    </td>
                    <td style="padding:10px; border:1px solid #ddd;">
                        {confidence:.0%}
                    </td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px; border:1px solid #ddd; 
                                font-weight:bold;">
                        Time
                    </td>
                    <td style="padding:10px; border:1px solid #ddd;">
                        {timestamp}
                    </td>
                </tr>
            </table>

            <p style="margin-top:20px; color:#888; font-size:13px;">
                Please respond immediately. 
                This alert was generated automatically by SafeVision.
            </p>
        </div>
    </body>
    </html>
    """

    send_smtp_email = SendSmtpEmail(
        sender = SendSmtpEmailSender(
            email = FROM_EMAIL,
            name  = "SafeVision Alert"
        ),
        to =[SendSmtpEmailTo(
            email = to_email,
            name  = authority_name
        )],
        subject = subject,
        html_content = html_content,
    )
    try:
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"[ALERT] Sent to {to_email} | id: {response.message_id}")
        return True
    except ApiException as e:
        print(f"[ALERT ERROR] Failed for {to_email}: {e}")
        return False