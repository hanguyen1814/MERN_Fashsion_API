const nodemailer = require("nodemailer");
const logger = require("../config/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = process.env.EMAIL_FROM || "noreply@example.com";
    this.fromName = process.env.EMAIL_FROM_NAME || "MERN Fashion Store";
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    this.init();
  }

  /**
   * Khởi tạo email transporter dựa trên provider được chọn
   */
  init() {
    const emailService = process.env.EMAIL_SERVICE?.toLowerCase() || "smtp";

    // Log cấu hình hiện tại để debug
    logger.info(`Initializing email service: ${emailService}`, {
      EMAIL_SERVICE: process.env.EMAIL_SERVICE,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: this.fromEmail,
    });

    try {
      switch (emailService) {
        case "sendgrid":
          if (!process.env.SENDGRID_API_KEY) {
            throw new Error(
              "SENDGRID_API_KEY is required when EMAIL_SERVICE=sendgrid"
            );
          }
          this.transporter = this.createSendGridTransport();
          logger.info("SendGrid transport created successfully");
          break;
        case "mailgun":
          this.transporter = this.createMailgunTransport();
          logger.info("Mailgun transport created successfully");
          break;
        case "resend":
          this.transporter = this.createResendTransport();
          logger.info("Resend transport created successfully");
          break;
        case "ses":
          this.transporter = this.createSESTransport();
          logger.info("AWS SES transport created successfully");
          break;
        case "smtp":
        default:
          logger.warn(
            "Using SMTP transport. Make sure EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD are configured."
          );
          this.transporter = this.createSMTPTransport();
          break;
      }

      logger.info(`Email service initialized: ${emailService}`, {
        fromEmail: this.fromEmail,
        fromName: this.fromName,
        frontendUrl: this.frontendUrl,
      });
    } catch (error) {
      logger.error("Failed to initialize email service:", {
        error: error.message,
        stack: error.stack,
        emailService,
      });
      // Tạo transporter giả để tránh crash, nhưng sẽ log lỗi khi gửi
      this.transporter = {
        sendMail: async () => {
          throw new Error(
            `Email service not configured: ${error.message}. Please check your EMAIL_SERVICE and provider credentials.`
          );
        },
      };
    }
  }

  /**
   * Tạo SendGrid transport
   * SendGrid sử dụng SMTP với username "apikey" và password là API key
   */
  createSendGridTransport() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY is required");
    }

    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "apikey",
        pass: apiKey,
      },
    });
  }

  /**
   * Tạo Mailgun transport
   */
  createMailgunTransport() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!apiKey || !domain) {
      throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN are required");
    }

    return nodemailer.createTransport({
      host: `smtp.mailgun.org`,
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${domain}`,
        pass: apiKey,
      },
    });
  }

  /**
   * Tạo Resend transport (sử dụng SMTP của Resend)
   */
  createResendTransport() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required");
    }

    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 587,
      secure: false,
      auth: {
        user: "resend",
        pass: apiKey,
      },
    });
  }

  /**
   * Tạo AWS SES transport
   * Lưu ý: Cần cài đặt @aws-sdk/client-ses để sử dụng
   * npm install @aws-sdk/client-ses
   */
  createSESTransport() {
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
    const region = process.env.AWS_SES_REGION || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY are required"
      );
    }

    try {
      // Thử require AWS SDK (cần cài đặt riêng)
      const { SESClient } = require("@aws-sdk/client-ses");
      const { defaultProvider } = require("@aws-sdk/credential-provider-node");

      const sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      return nodemailer.createTransport({
        SES: { ses: sesClient, aws: require("@aws-sdk/client-ses") },
        sendingRate: 14,
        maxConnections: 5,
      });
    } catch (error) {
      throw new Error(
        "AWS SES SDK not installed. Run: npm install @aws-sdk/client-ses @aws-sdk/credential-provider-node"
      );
    }
  }

  /**
   * Tạo SMTP transport (fallback hoặc custom SMTP)
   */
  createSMTPTransport() {
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_PORT || "587", 10);
    const user = process.env.EMAIL_USER;
    const password = process.env.EMAIL_PASSWORD;

    if (!user || !password) {
      logger.warn(
        "EMAIL_USER and EMAIL_PASSWORD not set, email sending will fail"
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        user && password
          ? {
              user,
              pass: password,
            }
          : undefined,
    });
  }

  /**
   * Gửi email chung
   */
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    if (!this.transporter) {
      logger.error("Email transporter not initialized");
      throw new Error("Email service not available");
    }

    // Log thông tin provider đang sử dụng để debug
    const currentProvider = process.env.EMAIL_SERVICE || "smtp";
    logger.debug(`Sending email using provider: ${currentProvider}`, {
      to,
      subject,
      from: this.fromEmail,
    });

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text: text || this.htmlToText(html),
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`, {
        messageId: info.messageId,
        to,
        subject,
        provider: currentProvider,
        category: "email_sent",
      });
      return info;
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, {
        error: error.message,
        stack: error.stack,
        to,
        subject,
        provider: currentProvider,
        EMAIL_SERVICE: process.env.EMAIL_SERVICE,
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
        category: "email_error",
      });
      throw error;
    }
  }

  /**
   * Gửi email xác nhận đăng ký
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận email đăng ký</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Chào mừng đến với MERN Fashion!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại MERN Fashion Store!</p>
          <p>Để hoàn tất đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xác nhận Email</a>
          </div>
          <p>Hoặc copy và dán link sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            <strong>Lưu ý:</strong> Link xác nhận sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} MERN Fashion Store. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Chào mừng đến với MERN Fashion!
      
      Xin chào ${user.fullName},
      
      Cảm ơn bạn đã đăng ký tài khoản tại MERN Fashion Store!
      
      Để hoàn tất đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách truy cập link sau:
      ${verificationUrl}
      
      Lưu ý: Link xác nhận sẽ hết hạn sau 24 giờ.
      
      Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.
      
      © ${new Date().getFullYear()} MERN Fashion Store.
    `;

    return await this.sendEmail({
      to: user.email,
      subject: "Xác nhận email đăng ký - MERN Fashion",
      html,
      text,
    });
  }

  /**
   * Gửi email hóa đơn đơn hàng
   */
  async sendOrderInvoice(order, user) {
    const orderDate = new Date(order.createdAt).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
    };

    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <img src="${item.image || ""}" alt="${
          item.name
        }" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <strong>${item.name}</strong><br>
          <small style="color: #666;">SKU: ${item.sku}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
          item.price
        )}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${formatCurrency(
          item.price * item.quantity
        )}</strong></td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hóa đơn đơn hàng #${order.code}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Hóa đơn đơn hàng</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">#${
            order.code
          }</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="margin-bottom: 30px;">
            <p><strong>Xin chào ${user.fullName},</strong></p>
            <p>Cảm ơn bạn đã mua sắm tại MERN Fashion Store!</p>
            <p>Đơn hàng của bạn đã được tạo thành công vào ngày <strong>${orderDate}</strong>.</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #667eea;">Thông tin đơn hàng</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Mã đơn hàng:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><strong>#${
                  order.code
                }</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Ngày đặt:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${orderDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Trạng thái:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 12px;">${this.getStatusText(
                    order.status
                  )}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Phương thức thanh toán:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${this.getPaymentMethodText(
                  order.payment.method
                )}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #667eea;">Địa chỉ giao hàng</h2>
            <p style="margin: 5px 0;"><strong>${
              order.shippingAddress.fullName
            }</strong></p>
            <p style="margin: 5px 0;">${order.shippingAddress.phone}</p>
            <p style="margin: 5px 0;">
              ${order.shippingAddress.street}, ${order.shippingAddress.ward}, ${
      order.shippingAddress.district
    }, ${order.shippingAddress.province}
            </p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #667eea;">Chi tiết sản phẩm</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Hình ảnh</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Số lượng</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Đơn giá</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #667eea;">Tổng thanh toán</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;">Tạm tính:</td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(
                  order.subtotal
                )}</td>
              </tr>
              ${
                order.discount > 0
                  ? `
              <tr>
                <td style="padding: 8px 0;">Giảm giá:</td>
                <td style="padding: 8px 0; text-align: right; color: #e74c3c;">-${formatCurrency(
                  order.discount
                )}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0;">Phí vận chuyển:</td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(
                  order.shippingFee
                )}</td>
              </tr>
              <tr style="border-top: 2px solid #667eea;">
                <td style="padding: 12px 0;"><strong>Tổng cộng:</strong></td>
                <td style="padding: 12px 0; text-align: right;">
                  <strong style="font-size: 20px; color: #667eea;">${formatCurrency(
                    order.total
                  )}</strong>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.frontendUrl}/orders/${
      order.code
    }" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xem chi tiết đơn hàng</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.<br>
            © ${new Date().getFullYear()} MERN Fashion Store. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hóa đơn đơn hàng #${order.code}
      
      Xin chào ${user.fullName},
      
      Cảm ơn bạn đã mua sắm tại HNG Store!
      
      Đơn hàng của bạn đã được tạo thành công vào ngày ${orderDate}.
      
      Mã đơn hàng: #${order.code}
      Trạng thái: ${this.getStatusText(order.status)}
      
      Địa chỉ giao hàng:
      ${order.shippingAddress.fullName}
      ${order.shippingAddress.phone}
      ${order.shippingAddress.street}, ${order.shippingAddress.ward}, ${
      order.shippingAddress.district
    }, ${order.shippingAddress.province}
      
      Chi tiết sản phẩm:
      ${order.items
        .map(
          (item) =>
            `- ${item.name} (SKU: ${item.sku}) x${
              item.quantity
            } = ${formatCurrency(item.price * item.quantity)}`
        )
        .join("\n")}
      
      Tạm tính: ${formatCurrency(order.subtotal)}
      ${
        order.discount > 0
          ? `Giảm giá: -${formatCurrency(order.discount)}\n`
          : ""
      }
      Phí vận chuyển: ${formatCurrency(order.shippingFee)}
      Tổng cộng: ${formatCurrency(order.total)}
      
      Xem chi tiết đơn hàng: ${this.frontendUrl}/orders/${order.code}
      
      © ${new Date().getFullYear()} MERN Fashion Store.
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Hóa đơn đơn hàng #${order.code} - MERN Fashion`,
      html,
      text,
    });
  }

  /**
   * Chuyển đổi HTML sang text đơn giản
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Lấy text hiển thị cho trạng thái đơn hàng
   */
  getStatusText(status) {
    const statusMap = {
      pending: "Chờ xử lý",
      paid: "Đã thanh toán",
      processing: "Đang xử lý",
      shipped: "Đã giao hàng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
      refunded: "Đã hoàn tiền",
    };
    return statusMap[status] || status;
  }

  /**
   * Lấy text hiển thị cho phương thức thanh toán
   */
  getPaymentMethodText(method) {
    const methodMap = {
      cod: "Thanh toán khi nhận hàng (COD)",
      card: "Thẻ tín dụng",
      bank: "Chuyển khoản ngân hàng",
      ewallet: "Ví điện tử",
      qr: "Quét QR code",
      momo: "MoMo",
    };
    return methodMap[method] || method;
  }

  /**
   * Gửi email xác nhận thanh toán thành công
   */
  async sendPaymentConfirmationEmail(order, user) {
    const paymentDate = new Date().toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận thanh toán thành công</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✓ Thanh toán thành công!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p><strong>Xin chào ${user.fullName},</strong></p>
          <p>Cảm ơn bạn! Chúng tôi đã nhận được thanh toán cho đơn hàng của bạn.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <h2 style="margin-top: 0; color: #27ae60;">Thông tin thanh toán</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Mã đơn hàng:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><strong>#${
                  order.code
                }</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Số tiền đã thanh toán:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <strong style="font-size: 18px; color: #27ae60;">${formatCurrency(
                    order.total
                  )}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Phương thức thanh toán:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${this.getPaymentMethodText(
                  order.payment.method
                )}</td>
              </tr>
              ${
                order.payment.transactionId
                  ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Mã giao dịch:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${order.payment.transactionId}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0;"><strong>Thời gian thanh toán:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${paymentDate}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>📦 Bước tiếp theo:</strong> Đơn hàng của bạn đang được xử lý và sẽ được giao hàng trong thời gian sớm nhất.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.frontendUrl}/orders/${
      order.code
    }" style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xem chi tiết đơn hàng</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.<br>
            © ${new Date().getFullYear()} MERN Fashion Store. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Xác nhận thanh toán thành công!
      
      Xin chào ${user.fullName},
      
      Cảm ơn bạn! Chúng tôi đã nhận được thanh toán cho đơn hàng của bạn.
      
      Mã đơn hàng: #${order.code}
      Số tiền đã thanh toán: ${formatCurrency(order.total)}
      Phương thức thanh toán: ${this.getPaymentMethodText(order.payment.method)}
      ${
        order.payment.transactionId
          ? `Mã giao dịch: ${order.payment.transactionId}\n`
          : ""
      }
      Thời gian thanh toán: ${paymentDate}
      
      Bước tiếp theo: Đơn hàng của bạn đang được xử lý và sẽ được giao hàng trong thời gian sớm nhất.
      
      Xem chi tiết đơn hàng: ${this.frontendUrl}/orders/${order.code}
      
      © ${new Date().getFullYear()} MERN Fashion Store.
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Xác nhận thanh toán thành công - Đơn hàng #${order.code}`,
      html,
      text,
    });
  }

  /**
   * Gửi email thông báo đơn hàng hoàn thành
   */
  async sendOrderCompletedEmail(order, user) {
    const completedDate = new Date().toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đơn hàng đã hoàn thành</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 Đơn hàng đã hoàn thành!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p><strong>Xin chào ${user.fullName},</strong></p>
          <p>Chúc mừng! Đơn hàng của bạn đã được hoàn thành thành công.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #667eea;">Thông tin đơn hàng</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Mã đơn hàng:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><strong>#${
                  order.code
                }</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Ngày hoàn thành:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${completedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Tổng thanh toán:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <strong style="font-size: 18px; color: #667eea;">${formatCurrency(
                    order.total
                  )}</strong>
                </td>
              </tr>
            </table>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #1565c0;">
              <strong>💝 Cảm ơn bạn đã mua sắm!</strong><br>
              Chúng tôi rất vui khi được phục vụ bạn. Hãy để lại đánh giá sản phẩm để giúp chúng tôi cải thiện dịch vụ.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.frontendUrl}/orders/${
      order.code
    }" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">Xem chi tiết đơn hàng</a>
            <a href="${this.frontendUrl}/orders/${
      order.code
    }/review" style="background: #f39c12; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Đánh giá sản phẩm</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Chúng tôi hy vọng bạn hài lòng với sản phẩm. Hãy tiếp tục ủng hộ chúng tôi!<br>
            © ${new Date().getFullYear()} MERN Fashion Store. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Đơn hàng đã hoàn thành!
      
      Xin chào ${user.fullName},
      
      Chúc mừng! Đơn hàng của bạn đã được hoàn thành thành công.
      
      Mã đơn hàng: #${order.code}
      Ngày hoàn thành: ${completedDate}
      Tổng thanh toán: ${formatCurrency(order.total)}
      
      Cảm ơn bạn đã mua sắm! Chúng tôi rất vui khi được phục vụ bạn.
      
      Xem chi tiết đơn hàng: ${this.frontendUrl}/orders/${order.code}
      Đánh giá sản phẩm: ${this.frontendUrl}/orders/${order.code}/review
      
      © ${new Date().getFullYear()} MERN Fashion Store.
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Đơn hàng đã hoàn thành - #${order.code}`,
      html,
      text,
    });
  }

  /**
   * Gửi email thông báo hủy đơn hàng
   */
  async sendOrderCancelledEmail(order, user, reason) {
    const cancelledDate = new Date().toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
    };

    const needsRefund =
      order.payment.status === "refunded" || order.payment.status === "paid";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đơn hàng đã bị hủy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Đơn hàng đã bị hủy</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p><strong>Xin chào ${user.fullName},</strong></p>
          <p>Chúng tôi xin thông báo đơn hàng của bạn đã được hủy.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h2 style="margin-top: 0; color: #e74c3c;">Thông tin đơn hàng</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Mã đơn hàng:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><strong>#${
                  order.code
                }</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Ngày hủy:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${cancelledDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Tổng giá trị đơn hàng:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(
                  order.total
                )}</td>
              </tr>
              ${
                reason
                  ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Lý do hủy:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${reason}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          ${
            needsRefund
              ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>💰 Thông tin hoàn tiền:</strong><br>
              Đơn hàng của bạn đã được thanh toán. Chúng tôi sẽ xử lý hoàn tiền trong vòng 3-5 ngày làm việc. 
              Số tiền ${formatCurrency(
                order.total
              )} sẽ được hoàn trả về phương thức thanh toán ban đầu của bạn.
            </p>
          </div>
          `
              : ""
          }

          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #6c757d;">
              <strong>ℹ️ Lưu ý:</strong> Tồn kho sản phẩm đã được hoàn trả. Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.frontendUrl}/orders/${
      order.code
    }" style="background: #6c757d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xem chi tiết đơn hàng</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.<br>
            © ${new Date().getFullYear()} MERN Fashion Store. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Đơn hàng đã bị hủy
      
      Xin chào ${user.fullName},
      
      Chúng tôi xin thông báo đơn hàng của bạn đã được hủy.
      
      Mã đơn hàng: #${order.code}
      Ngày hủy: ${cancelledDate}
      Tổng giá trị đơn hàng: ${formatCurrency(order.total)}
      ${reason ? `Lý do hủy: ${reason}\n` : ""}
      ${
        needsRefund
          ? `
      Thông tin hoàn tiền:
      Đơn hàng của bạn đã được thanh toán. Chúng tôi sẽ xử lý hoàn tiền trong vòng 3-5 ngày làm việc. 
      Số tiền ${formatCurrency(
        order.total
      )} sẽ được hoàn trả về phương thức thanh toán ban đầu của bạn.
      `
          : ""
      }
      
      Lưu ý: Tồn kho sản phẩm đã được hoàn trả.
      
      Xem chi tiết đơn hàng: ${this.frontendUrl}/orders/${order.code}
      
      © ${new Date().getFullYear()} MERN Fashion Store.
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Đơn hàng đã bị hủy - #${order.code}`,
      html,
      text,
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
