/**
 * Send OTP emails with EmailJS from the backend.
 * Keep these configuration values in server/.env or backend hosting secrets.
 */
export async function sendPasswordResetEmail({ to, code, name, purpose = 'password_reset' }) {
  const serviceId = process.env.VITE_EMAILJS_SERVICE_ID?.trim();
  const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY?.trim();

  if (!serviceId || !templateId || !publicKey) {
    console.error('EmailJS is not configured. Set the VITE_EMAILJS_* values in server/.env.');
    return { sent: false, reason: 'EmailJS is not configured on the backend.' };
  }

  const isSignup = purpose === 'signup';
  const expiryMinutes = isSignup ? 10 : 15;
  const templateParams = {
    to_email: to,
    to_name: name || 'Traveler',
    verification_code: code,
    purpose: isSignup ? 'Email verification' : 'Password reset',
    expiry_minutes: expiryMinutes,
    message: isSignup
      ? 'Use this code to verify your NepalStay email address.'
      : 'Use this code to reset your NepalStay password.',
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error('EmailJS delivery failed:', response.status, detail);
      return { sent: false, status: response.status };
    }
    console.log(`EmailJS accepted ${purpose} email for ${to}.`);
    return { sent: true };
  } catch (error) {
    console.error('EmailJS request failed:', error instanceof Error ? error.message : 'Unknown error');
    return { sent: false };
  }
}
