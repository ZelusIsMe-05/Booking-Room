// ---------------------------------------------------------------------------
// Host Messages — Data Types & Mock Data
// ---------------------------------------------------------------------------

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type SenderType = 'host' | 'tenant';

export interface ChatMessage {
  id: string;
  senderId: SenderType;
  content: string;
  timestamp: string;    // display string e.g. "09:15 AM"
  status?: MessageStatus; // only for host messages
}

export interface Conversation {
  id: string;
  tenantName: string;
  tenantInitial: string;
  tenantAvatarBg: string;
  isOnline: boolean;
  roomTitle: string;
  contractCode: string;   // e.g. "#ANT-12903"
  lastMessage: string;
  lastMessageTime: string;
  isActive?: boolean;     // selected in list
  messages: ChatMessage[];
  dateDivider: string;    // e.g. "THỨ TƯ, 15 THÁNG 5"
}

export const conversations: Conversation[] = [
  {
    id: 'conv-001',
    tenantName: 'Nguyễn Văn A',
    tenantInitial: 'A',
    tenantAvatarBg: '#2563EB',
    isOnline: true,
    roomTitle: 'Căn hộ Studio - Quận 7',
    contractCode: '#ANT-12903',
    lastMessage: 'Cảm ơn anh, em đã nhận được chìa khóa...',
    lastMessageTime: '10:45 AM',
    isActive: true,
    dateDivider: 'THỨ TƯ, 15 THÁNG 5',
    messages: [
      {
        id: 'm1',
        senderId: 'tenant',
        content: 'Chào anh, em là A đang thuê phòng 302 ạ. Em muốn hỏi về việc gia hạn hợp đồng tháng tới.',
        timestamp: '09:15 AM',
      },
      {
        id: 'm2',
        senderId: 'host',
        content: 'Chào A, anh đã nhận được thông tin. Em dự định gia hạn thêm bao lâu nhỉ? Bên anh đang có chương trình giảm 5% cho hợp đồng 6 tháng trở lên đấy.',
        timestamp: '09:22 AM',
        status: 'read',
      },
      {
        id: 'm3',
        senderId: 'tenant',
        content: 'Dạ em tính gia hạn thêm 6 tháng luôn ạ. Anh gửi lại phụ lục hợp đồng giúp em nhé.',
        timestamp: '10:40 AM',
      },
      {
        id: 'm4',
        senderId: 'host',
        content: 'Ok em, để anh soạn rồi gửi qua app cho em ký online luôn nhé. Chút nữa anh gửi.',
        timestamp: '10:42 AM',
        status: 'delivered',
      },
      {
        id: 'm5',
        senderId: 'tenant',
        content: 'Cảm ơn anh, em đã nhận được chìa khóa dự phòng anh gửi ở bảo vệ rồi nhé.',
        timestamp: '10:45 AM',
      },
    ],
  },
  {
    id: 'conv-002',
    tenantName: 'Trấn Thị B',
    tenantInitial: 'B',
    tenantAvatarBg: '#7C3AED',
    isOnline: false,
    roomTitle: 'Nhà phố - Quận 2',
    contractCode: '#ANT-10821',
    lastMessage: 'Cho em hỏi về chính sách hủy phòng ạ?',
    lastMessageTime: 'Hôm qua',
    dateDivider: 'THỨ BA, 14 THÁNG 5',
    messages: [
      {
        id: 'm1',
        senderId: 'tenant',
        content: 'Cho em hỏi về chính sách hủy phòng ạ?',
        timestamp: 'Hôm qua',
      },
    ],
  },
  {
    id: 'conv-003',
    tenantName: 'Lê Minh C',
    tenantInitial: 'C',
    tenantAvatarBg: '#D97706',
    isOnline: false,
    roomTitle: 'Villa Biển - Vũng Tàu',
    contractCode: '#ANT-09504',
    lastMessage: 'Anh ơi phòng mình bị hư đèn rồi.',
    lastMessageTime: 'Thứ 2',
    dateDivider: 'THỨ HAI, 13 THÁNG 5',
    messages: [
      {
        id: 'm1',
        senderId: 'tenant',
        content: 'Anh ơi phòng mình bị hư đèn rồi.',
        timestamp: 'Thứ 2',
      },
    ],
  },
];
