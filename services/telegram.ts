
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { TelegramLog, TelegramParent, Student, LedgerType } from '../types';

const LATEST_TOKEN = '8589199191:AAHeXmUawNVz3DRAGfMLuIP5rE7l79S491U';

function getToken() {
  const saved = localStorage.getItem(STORAGE_KEYS.TELEGRAM_BOT_TOKEN);
  if (!saved || saved !== LATEST_TOKEN) {
    localStorage.setItem(STORAGE_KEYS.TELEGRAM_BOT_TOKEN, LATEST_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TELEGRAM_OFFSET);
    return LATEST_TOKEN;
  }
  return saved;
}

function addLog(log: Omit<TelegramLog, 'id' | 'time'>) {
  const logs = db.get<TelegramLog[]>(STORAGE_KEYS.TELEGRAM_LOGS, []);
  const newLog: TelegramLog = {
    id: db.generateId(),
    time: new Date().toISOString(),
    ...log
  };
  db.set(STORAGE_KEYS.TELEGRAM_LOGS, [newLog, ...logs].slice(0, 50));
}

export async function checkBotStatus() {
  const token = getToken();
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok) {
      return { status: 'CONNECTED', bot: data.result };
    } else {
      return { status: 'ERROR', error: `${data.error_code}: ${data.description}` };
    }
  } catch (error) {
    console.error('Bot status check error:', error);
    return { status: 'ERROR', error: 'Connection failed' };
  }
}

export async function sendTelegramMessage(chatId: string, message: string, type: TelegramLog['type'], studentId?: string, extra?: any) {
  const token = getToken();
  try {
    const body: any = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      ...extra
    };

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    
    addLog({
      chatId,
      studentId,
      type,
      status: result.ok ? 'OK' : 'FAIL',
      message: message.substring(0, 50) + '...',
      error: result.ok ? undefined : `${result.error_code}: ${result.description}`
    });

    return result.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

export async function processBotUpdates() {
  const token = getToken();
  const offset = Number(localStorage.getItem(STORAGE_KEYS.TELEGRAM_OFFSET) || '0');
  
  try {
    // timeout=30 - Long Polling. Telegram xabar kelishini 30 soniya kutadi.
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset + 1}&timeout=30`);
    const data = await res.json();
    
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        localStorage.setItem(STORAGE_KEYS.TELEGRAM_OFFSET, update.update_id.toString());
        
        // Callback query (Tugmalar bosilganda)
        if (update.callback_query) {
            const chatId = update.callback_query.message.chat.id.toString();
            const callbackData = update.callback_query.data;
            const from = update.callback_query.from;

            if (callbackData.startsWith('LINK:')) {
                const sId = callbackData.split(':')[1];
                const student = db.getStudents().find(s => s.id === sId);
                if (student) {
                    const parents = db.get<TelegramParent[]>(STORAGE_KEYS.TELEGRAM_PARENTS, []);
                    if (!parents.some(p => p.chatId === chatId && p.studentId === sId)) {
                        const newParent: TelegramParent = {
                            id: db.generateId(),
                            studentId: sId,
                            chatId,
                            parentName: `${from.first_name || ''} ${from.last_name || ''}`.trim(),
                            isActive: true,
                            createdAt: new Date().toISOString()
                        };
                        db.set(STORAGE_KEYS.TELEGRAM_PARENTS, [...parents, newParent]);
                        
                        // Answer callback to remove loading state in Telegram
                        fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery?callback_query_id=${update.callback_query.id}`);
                        
                        // Send success message immediately
                        await sendTelegramMessage(chatId, `✅ <b>Muvaffaqiyatli ulandi!</b>\n\nFarzandingiz: <b>${student.ism} ${student.familiya}</b>\n\nEndi davomat va ballar haqida xabarlar shu yerga keladi.`, 'SYSTEM', sId);
                    } else {
                        await sendTelegramMessage(chatId, `⚠️ Bu o'quvchi allaqachon ulangan.`, 'SYSTEM');
                    }
                }
            } else if (callbackData === 'CANCEL') {
                fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery?callback_query_id=${update.callback_query.id}`);
                await sendTelegramMessage(chatId, "❌ Amal bekor qilindi. ID kodni qaytadan kiritishingiz mumkin.", 'SYSTEM');
            }
            continue;
        }

        // Oddiy xabarlar
        if (update.message) {
          const chatId = update.message.chat.id.toString();
          const text = update.message.text?.trim();
          
          if (!text) continue;

          if (text === '/start') {
            await sendTelegramMessage(chatId, "👋 <b>Xush kelibsiz!</b>\n\nShaxmat maktabi botiga xush kelibsiz. Farzandingizni tizimga ulash uchun uning <b>ID kodini</b> kiriting (Masalan: 1001):", 'SYSTEM');
          } else {
            // ID kod bo'yicha qidirish
            const student = db.getStudents().find(s => s.studentCode.toLowerCase() === text.toLowerCase());
            if (student) {
              await sendTelegramMessage(chatId, `👤 <b>O'quvchi topildi:</b>\n\nIsmi: ${student.ism} ${student.familiya}\nID: ${student.studentCode}\n\nBu sizning farzandingizmi?`, 'SYSTEM', student.id, {
                  reply_markup: {
                      inline_keyboard: [
                        [
                          { text: "✅ HA, TASDIQLASH", callback_data: `LINK:${student.id}` },
                          { text: "❌ YO'Q", callback_data: `CANCEL` }
                        ]
                      ]
                  }
              });
            } else {
              await sendTelegramMessage(chatId, "☹️ <b>O'quvchi topilmadi.</b>\n\nIltimos, ID kodni to'g'ri kiritganingizni tekshiring yoki ma'muriyatga murojaat qiling.", 'SYSTEM');
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Bot polling error:', e);
  }
}

export async function notifyAttendance(studentId: string, status: string, time?: string, currentCoins: number = 0) {
  const parents = db.get<TelegramParent[]>(STORAGE_KEYS.TELEGRAM_PARENTS, []).filter(p => p.studentId === studentId && p.isActive);
  const student = db.getStudents().find(s => s.id === studentId);
  if (!student || parents.length === 0) return;

  const currentMonth = new Date().toISOString().substring(0, 7);
  const ledger = db.getLedger() || [];
  const ledgerTotal = ledger
    .filter(l => l.studentId === studentId && 
           (l.type === LedgerType.ATTENDANCE || l.type === LedgerType.BONUS) &&
           l.dateTime.startsWith(currentMonth))
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const allRecords = db.getRecords() || [];
  const sessions = db.getSessions() || [];
  const pendingTotal = allRecords
    .filter(r => r.studentId === studentId && r.coinsApplied === false)
    .reduce((sum, r) => {
      const sess = sessions.find(s => s.id === r.sessionId);
      if (sess && sess.date.startsWith(currentMonth)) {
        return sum + Number(r.coins || 0);
      }
      return sum;
    }, 0);

  const totalMonthlyDisplay = ledgerTotal + pendingTotal;

  const emoji = status === 'KELDI' ? '✅' : status === 'KECHIKDI' ? '⚠️' : '❌';
  const statusLabel = status === 'KELDI' ? 'DARSGA KELDI' : status === 'KECHIKDI' ? 'KECHIKIB KELDI' : 'DARSGA KELMADI';

  let msg = `<b>🔔 DAVOMAT BILDIRISHNOMASI</b>\n\n` +
    `👤 <b>O'quvchi:</b> ${student.ism} ${student.familiya}\n` +
    `📊 <b>Holat:</b> ${emoji} ${statusLabel}\n` +
    (time ? `⏰ <b>Vaqt:</b> ${time}\n` : '');

  if (status !== 'KELMADI') {
    msg += `🪙 <b>Bugun olingan ball:</b> +${currentCoins}\n`;
  }
  
  msg += `🏆 <b>Shu oydagi jami ballar:</b> ${totalMonthlyDisplay}\n\n` +
         `📍 <b>Klub:</b> Shaxmat Maktabi`;

  for (const parent of parents) {
    await sendTelegramMessage(parent.chatId, msg, status === 'KELMADI' ? 'KELMADI' : 'CHECKIN', studentId);
  }
}

export async function broadcastToTelegram(targetType: 'all' | 'group' | 'student', targetIds: string[], message: string) {
  const parents = db.get<TelegramParent[]>(STORAGE_KEYS.TELEGRAM_PARENTS, []).filter(p => p.isActive);
  let chatIds: string[] = [];
  if (targetType === 'all') chatIds = parents.map(p => p.chatId);
  else if (targetType === 'group') {
    const sIds = db.getGroupMembers().filter(gm => targetIds.includes(gm.groupId)).map(gm => gm.studentId);
    chatIds = parents.filter(p => sIds.includes(p.studentId)).map(p => p.chatId);
  } else chatIds = parents.filter(p => targetIds.includes(p.studentId)).map(p => p.chatId);

  const uniqueChats = Array.from(new Set(chatIds));
  let success = 0;
  for (const cid of uniqueChats) {
    const ok = await sendTelegramMessage(cid, `<b>📢 YANGILIK</b>\n\n${message}`, 'BROADCAST');
    if (ok) success++;
  }
  return { success, failed: uniqueChats.length - success };
}
