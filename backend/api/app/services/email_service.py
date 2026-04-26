import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

# Load environment variables from the backend/.env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))

def send_2fa_code(to_email: str, code: str):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('FROM_EMAIL')
    
    if not api_key or not from_email:
        print("Error: SENDGRID_API_KEY or FROM_EMAIL not found in environment.")
        return False

    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject='Your CORS Verification Code',
        html_content=f'''
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #333;">CORS Verification Code</h2>
                <p>Hello,</p>
                <p>Your 2-step verification code for <strong>CORS</strong> is:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                    {code}
                </div>
                <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #999;">Course Offering Recommendation System (CORS)</p>
            </div>
        '''
    )
    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        print(f"SendGrid Error: {e}")
        return False
