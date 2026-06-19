export const pendingApprovalSteps = [
  {
    id: 'registered',
    label: 'Đăng ký thành công',
    state: 'complete',
  },
  {
    id: 'reviewing',
    label: 'Đang chờ cung cấp CCCD',
    state: 'current',
  },
  {
    id: 'verified',
    label: 'Hoàn tất xác thực',
    state: 'locked',
  },
] as const;

export const pendingApprovalNotes = [
  {
    id: 'notice',
    title: 'Cần lưu ý điều gì?',
    body: 'Trong thời gian này, bạn có thể hoàn thiện hồ sơ cá nhân hoặc tìm hiểu các chính sách vận hành của chúng tôi.',
    tone: 'blue',
  },
  {
    id: 'result',
    title: 'Thông báo kết quả',
    body: 'Một email xác nhận sẽ được gửi ngay sau khi tài khoản của bạn được phê duyệt chính thức.',
    tone: 'red',
  },
] as const;

export const idCardUploadFields = [
  {
    id: 'front',
    label: 'Ảnh mặt trước CCCD',
    name: 'id_card_front',
  },
  {
    id: 'back',
    label: 'Ảnh mặt sau CCCD',
    name: 'id_card_back',
  },
] as const;
