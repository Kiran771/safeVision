
import os
from dotenv import load_dotenv
from sib_api_v3_sdk import Configuration, ApiClient, TransactionalEmailsApi
from sib_api_v3_sdk.models import SendSmtpEmail, SendSmtpEmailSender, SendSmtpEmailTo

# Load .env 
load_dotenv()

# Get config from .env
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = os.getenv("BREVO_EMAIL_FROM")  # Must match your .env key name

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
    """
    Send verification email using Brevo API
    Returns True if sent successfully, False on failure
    """
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
