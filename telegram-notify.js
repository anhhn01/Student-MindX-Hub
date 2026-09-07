const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const projectName = process.env.VERCEL_PROJECT_NAME || 'Dự án của tôi';
const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'Chưa có thông tin';
const previewUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'Chưa có thông tin';

const deployTime = new Date().toLocaleString('vi-VN', { 
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'medium',
  timeStyle: 'medium'
});

const message = `🚀 <b>Deploy Thành Công: ${projectName}</b>\n\n⏰ <b>Thời gian:</b> ${deployTime}\n🌍 <b>Production:</b> ${prodUrl}\n🔍 <b>Preview:</b> ${previewUrl}`;

fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  })
})
.then(res => console.log('Đã gửi thông báo Telegram'))
.catch(err => console.error('Lỗi gửi Telegram:', err));
