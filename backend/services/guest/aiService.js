const aiRepository = require('../../repositories/guest/aiRepository');
const AppError = require('../../utils/AppError');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service to handle AI Room Recommendations using Google Gemini.
 * Hỗ trợ History để nhớ ngữ cảnh chat.
 */
async function getRecommendations(message, history = []) {
  if (!message || message.trim() === '') {
    throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp nội dung tin nhắn (message).', 400);
  }

  // Lấy dữ liệu phòng từ Database (chỉ lấy các phòng đang AVAILABLE)
  const rooms = await aiRepository.getAvailableRoomsForAI();

  // Kiểm tra Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    // Fallback: Khi chưa cài API Key thì trả về mock response để dev test frontend trước
    return mockRecommendationFallback(message, rooms);
  }

  // Khởi tạo Gemini Client
  const genAI = new GoogleGenerativeAI(apiKey);

  // Chuyển đổi list phòng thành chuỗi văn bản JSON hoặc danh sách dễ đọc cho AI
  const roomContext = rooms.map((r, i) => {
    const fullAddress = [r.detailed_address, r.ward_name, r.district_name, r.province_name].filter(Boolean).join(', ');
    return `${i + 1}. [ID: ${r.room_id}] Tên: ${r.title} | Loại: ${r.room_type} | Giá thuê: ${r.monthly_rent} VND/tháng | Tiền cọc: ${r.deposit_amount} VND | Điện: ${r.electricity_cost} VND | Nước: ${r.water_cost} VND | Internet: ${r.internet_cost} VND | Phí dịch vụ: ${r.service_fee} VND | Địa chỉ đầy đủ: ${fullAddress} | Đánh giá: ${r.average_rating || 'Chưa có'} sao | Ảnh bìa: ${r.cover_image || 'Chưa có'}.`;
  }).join('\n');

  // Xây dựng System Prompt
  const systemPrompt = `
Bạn là một trợ lý ảo thông minh chuyên tư vấn thuê phòng trọ trên nền tảng BookingRoom. 
Nhiệm vụ của bạn là tư vấn và đề xuất phòng cho khách hàng dựa trên DANH SÁCH PHÒNG TRỌ THẬT DƯỚI ĐÂY.

LUẬT TỐI THƯỢNG:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC BỊA ĐẶT (hallucinate) ra bất kỳ phòng nào không có trong danh sách. Nếu khách hỏi loại phòng không có, hãy lịch sự thông báo là hệ thống hiện không có phòng phù hợp và gợi ý các phòng gần giống nhất từ danh sách hiện có.
2. Hãy trả lời bằng ngôn ngữ phù hợp với câu hỏi đầu vào của người dùng (ví dụ: tiếng Việt nếu hỏi tiếng Việt, tiếng Anh nếu hỏi tiếng Anh). Giữ phong thái thân thiện, lịch sự và súc tích như một chuyên viên tư vấn.
3. Trong câu trả lời ("reply"), đối với mỗi phòng được đề xuất, bạn BẮT BUỘC phải viết đầy đủ 5 phần thông tin theo đúng định dạng và thứ tự sau (tuyệt đối không được lược bỏ phần nào, kể cả khi chỉ có 1 phòng phù hợp):
   - Tiêu đề bắt đầu bằng số thứ tự và Tên phòng dạng in đậm thông thường (Ví dụ: 1. **Phòng gác cao mới xây KCN Tân Bình**). KHÔNG ĐƯỢC gắn bất kỳ liên kết markdown nào vào tiêu đề này.
   - Giá thuê: - Giá thuê: {Giá thuê} VND/tháng
   - Địa chỉ: - Địa chỉ: {Địa chỉ đầy đủ}
   - Thông tin phòng: - Thông tin phòng: {Mô tả ngắn gọn, lý do đề xuất...}
   - Mã thẻ phòng (đứng riêng một dòng ngay phía dưới): [RoomCard: ID_của_phòng]
4. Ở cuối câu trả lời ("reply"), bạn BẮT BUỘC phải viết một câu chốt thân thiện để hỏi han lịch sự và đề nghị hỗ trợ thêm, ví dụ: "Nếu bạn cần hỗ trợ gì thêm hoặc muốn tìm kiếm theo tiêu chí khác, cứ nói cho tôi biết nhé!" hoặc câu tương tự.

Ví dụ về câu trả lời giới thiệu phòng trọ trong trường "reply":
Chào bạn, tôi tìm thấy các phòng phù hợp với yêu cầu của bạn dưới đây:

1. **Phòng gác cao mới xây KCN Tân Bình**
- Giá thuê: 3.900.000 VND/tháng
- Địa chỉ: 15 Tây Thạnh, Tây Thạnh, Tân Phú, Hồ Chí Minh
- Thông tin phòng: Phòng mới xây sạch đẹp có gác lửng, phù hợp với yêu cầu làm việc gần KCN Tân Bình của bạn.
[RoomCard: d0000000-0000-0000-0000-000000000001]

2. **Phòng trọ giá rẻ sinh viên Làng Đại học**
- Giá thuê: 2.200.000 VND/tháng
- Địa chỉ: Khu phố 6, Linh Trung, Thành phố Thủ Đức, Hồ Chí Minh
- Thông tin phòng: Lựa chọn rất tiết kiệm cho sinh viên, giao thông thuận tiện.
[RoomCard: d0000000-0000-0000-0000-000000000002]

Nếu bạn cần hỗ trợ gì thêm hoặc muốn tìm kiếm theo tiêu chí khác, cứ nói cho tôi biết nhé!

5. BẮT BUỘC phản hồi dưới dạng một chuỗi JSON hợp lệ duy nhất (không có markdown code block \`\`\`json ở đầu và cuối) theo định dạng sau:
{
  "reply": "Nội dung câu trả lời/tư vấn thân thiện của bạn gửi cho khách hàng, chứa danh sách phòng đề xuất kèm theo đầy đủ thông tin chữ, mã [RoomCard: ID_của_phòng] và câu chốt hỗ trợ ở cuối cùng đúng như ví dụ ở trên.",
  "recommendedRooms": [
    {
      "roomId": "ID_của_phòng_được_chọn_trong_danh_sách",
      "reason": "Lý do ngắn gọn đề xuất phòng này cụ thể với khách hàng"
    }
  ]
}

DANH SÁCH PHÒNG TRỌ HIỆN CÓ:
${roomContext}
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  try {
    const chat = model.startChat({
      history: Array.isArray(history) ? history : []
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const aiReply = response.text();

    // Clean JSON format in case Gemini wraps it in code blocks
    let cleanedJson = aiReply.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (e) {
      console.warn('Gemini response is not valid JSON, falling back to plaintext:', aiReply);
      parsed = {
        reply: aiReply,
        recommendedRooms: []
      };
    }

    // Map recommended IDs to full objects in memory
    const recommendedRoomsData = [];
    if (Array.isArray(parsed.recommendedRooms)) {
      for (const rec of parsed.recommendedRooms) {
        const found = rooms.find(r => String(r.room_id) === String(rec.roomId));
        if (found) {
          const fullAddress = [found.detailed_address, found.ward_name, found.district_name, found.province_name].filter(Boolean).join(', ');
          recommendedRoomsData.push({
            roomId: found.room_id,
            title: found.title,
            monthlyRent: found.monthly_rent,
            depositAmount: found.deposit_amount,
            coverImage: found.cover_image,
            fullAddress: fullAddress,
            roomType: found.room_type,
            averageRating: found.average_rating,
            reason: rec.reason || 'Phù hợp với yêu cầu tìm kiếm.'
          });
        }
      }
    }

    return {
      reply: parsed.reply || aiReply,
      recommendedRooms: recommendedRoomsData
    };
  } catch (error) {
    console.error('Gemini Error:', error);
    throw new AppError('INTERNAL_SERVER_ERROR', 'Xin lỗi, hệ thống AI đang gặp gián đoạn kỹ thuật. Vui lòng thử lại sau giây lát!.', 500);
  }
}

/**
 * Mock function to return a fake AI response if no API key is provided.
 * Useful for development and testing.
 */
function mockRecommendationFallback(message, rooms) {
  let mockReply = 'Đây là tin nhắn tự động từ hệ thống vì bạn chưa cấu hình **GEMINI_API_KEY** trong file .env. \n\n';
  mockReply += `Hệ thống hiện tại đang có **${rooms.length} phòng trống**.\n\n`;

  const recommendedRoomsData = [];
  if (rooms.length > 0) {
    const found = rooms[0];
    const fullAddress = [found.detailed_address, found.ward_name, found.district_name, found.province_name].filter(Boolean).join(', ');
    mockReply += `Dưới đây là một số lựa chọn phù hợp dành cho bạn:\n\n`;
    mockReply += `1. **${found.title}**\n`;
    mockReply += `- Giá thuê: ${new Intl.NumberFormat('vi-VN').format(found.monthly_rent)} VND/tháng\n`;
    mockReply += `- Địa chỉ: ${fullAddress}\n`;
    mockReply += `- Thông tin phòng: ${found.room_description || 'Đây là phòng trống tốt nhất hiện có trong hệ thống.'}\n`;
    mockReply += `[RoomCard: ${found.room_id}]\n`;

    recommendedRoomsData.push({
      roomId: found.room_id,
      title: found.title,
      monthlyRent: found.monthly_rent,
      depositAmount: found.deposit_amount,
      coverImage: found.cover_image,
      fullAddress: fullAddress,
      roomType: found.room_type,
      averageRating: found.average_rating,
      reason: 'Đây là phòng trống tốt nhất hiện có trong hệ thống.'
    });
  }

  return {
    reply: mockReply,
    recommendedRooms: recommendedRoomsData
  };
}

module.exports = {
  getRecommendations
};
