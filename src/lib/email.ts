/**
 * Email utility for sending notifications
 * Modular and reusable email service
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send email using SMTP (or email service)
 * This is a modular function that can be extended to use any email service
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // For now, we'll use a simple approach
    // In production, you can integrate with:
    // - Nodemailer (SMTP)
    // - SendGrid
    // - AWS SES
    // - Resend
    // - etc.

    const emailService = process.env.EMAIL_SERVICE || 'console'; // 'console', 'smtp', 'sendgrid', etc.

    switch (emailService) {
      case 'console':
        // Development: Just log to console
        console.log('='.repeat(60));
        console.log('📧 EMAIL (Console Mode)');
        console.log('To:', Array.isArray(options.to) ? options.to.join(', ') : options.to);
        console.log('Subject:', options.subject);
        console.log('Body:');
        console.log(options.html);
        console.log('='.repeat(60));
        return { success: true };

      case 'smtp':
        // Use nodemailer for SMTP
        return await sendEmailViaSMTP(options);

      default:
        console.warn(`Unknown email service: ${emailService}, using console mode`);
        return await sendEmail({ ...options, to: options.to });
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via SMTP using nodemailer
 */
async function sendEmailViaSMTP(options: EmailOptions): Promise<EmailResult> {
  try {
    // Dynamic import to avoid requiring nodemailer if not needed
    let nodemailer: any;
    try {
      nodemailer = await import('nodemailer');
    } catch (importError) {
      console.error('[Email] nodemailer package not installed. Run: npm install nodemailer');
      return {
        success: false,
        error: 'nodemailer package not installed. Please install it: npm install nodemailer',
      };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@urvann.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('SMTP email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMTP error',
    };
  }
}

/**
 * Format push update stats into HTML email
 */
export function formatPushStatsEmail(stats: {
  totalSkus: number;
  successful: number;
  failed: number;
  elapsedTime: number;
  errors?: Array<{ sku: string; productId: string; error: string }>;
}): string {
  const successRate = stats.totalSkus > 0 
    ? ((stats.successful / stats.totalSkus) * 100).toFixed(1)
    : '0';

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        .success { border-left-color: #10b981; }
        .failed { border-left-color: #ef4444; }
        .errors { margin-top: 20px; }
        .error-item { background: #fee; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #ef4444; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Push Updates Completed</h1>
          <p>Frequently Bought Together - Automated Update</p>
        </div>
        <div class="content">
          <h2>Summary</h2>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-label">Total SKUs</div>
              <div class="stat-value">${stats.totalSkus.toLocaleString()}</div>
            </div>
            <div class="stat-card success">
              <div class="stat-label">Successful</div>
              <div class="stat-value">${stats.successful.toLocaleString()}</div>
            </div>
            <div class="stat-card failed">
              <div class="stat-label">Failed</div>
              <div class="stat-value">${stats.failed.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Success Rate</div>
              <div class="stat-value">${successRate}%</div>
            </div>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background: #e0f2fe; border-radius: 8px;">
            <strong>⏱️ Duration:</strong> ${formatTime(stats.elapsedTime)}
          </div>

          ${stats.errors && stats.errors.length > 0 ? `
            <div class="errors">
              <h3>Failed SKUs (${stats.errors.length})</h3>
              ${stats.errors.slice(0, 20).map(err => `
                <div class="error-item">
                  <strong>${err.sku}</strong> (${err.productId})<br>
                  <small>${err.error}</small>
                </div>
              `).join('')}
              ${stats.errors.length > 20 ? `<p><em>... and ${stats.errors.length - 20} more errors</em></p>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>This is an automated email from Urvann Growth Automation</p>
            <p>Generated at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
