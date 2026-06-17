# Tích hợp AWS S3 Lưu Trữ Hình Ảnh Phòng Trọ

Tài liệu này hướng dẫn chi tiết các bước chuẩn bị và triển khai tích hợp dịch vụ lưu trữ đám mây **AWS S3 (Simple Storage Service)** vào hệ thống **Booking-Room** để thay thế cho cơ chế lưu trữ file cục bộ hiện tại.

---

## 1. Các Bước Chuẩn Bị trên AWS Console

Để tích hợp AWS S3, bạn cần chuẩn bị một S3 Bucket và các thông tin xác thực IAM.

### Bước 1.1: Tạo IAM User và Lấy Credentials
1. Truy cập vào [AWS IAM Console](https://console.aws.amazon.com/iam/).
2. Chọn **Users** -> **Create user**.
3. Đặt tên user (ví dụ: `booking-room-s3-user`). Chọn **Next**.
4. Chọn **Attach policies directly** và tìm kiếm quyền truy cập. 
   - *Khuyến nghị bảo mật:* Tạo một Policy tùy chỉnh chỉ cho phép thao tác trên bucket cụ thể của bạn.
   - *Lựa chọn nhanh:* Gán quyền `AmazonS3FullAccess` (Lưu ý: Chỉ nên dùng cho môi trường phát triển/thử nghiệm).
5. Hoàn thành tạo user.
6. Sau khi tạo xong, click vào User vừa tạo -> chọn tab **Security credentials**.
7. Cuộn xuống phần **Access keys** -> Chọn **Create access key**.
8. Chọn **Application running outside AWS** -> Chọn **Next** -> Đặt tên mô tả -> Chọn **Create access key**.
9. **QUAN TRỌNG:** Lưu lại **Access Key ID** và **Secret Access Key** để cấu hình vào file `.env`. (AWS chỉ hiển thị Secret Access Key duy nhất một lần này).

### Bước 1.2: Tạo S3 Bucket
1. Truy cập [AWS S3 Console](https://console.aws.amazon.com/s3/).
2. Chọn **Create bucket**.
3. Cấu hình các thông tin:
   - **Bucket name**: Đặt tên duy nhất (ví dụ: `booking-room-assets-bucket`).
   - **AWS Region**: Chọn khu vực gần người dùng của bạn nhất (ví dụ: `ap-southeast-1` - Singapore).
4. **Object Ownership**: Chọn **ACLs disabled (recommended)**.
5. **Block Public Access settings for this bucket**:
   - Vì ảnh phòng trọ cần hiển thị công khai trên website cho khách thuê (Guest) xem mà không cần đăng nhập hoặc tạo mã bảo mật phức tạp, chúng ta sẽ **tắt** chặn truy cập công khai.
   - **Bỏ chọn (Uncheck)** mục **Block *all* public access**.
   - Tích chọn cam kết hiểu rõ việc này.
6. Chọn **Create bucket**.

### Bước 1.3: Cấu hình Bucket Policy (Cho phép Đọc Công Khai)
Để người dùng có thể xem ảnh thông qua URL trực tiếp, hãy cấu hình quyền đọc (Read-only) cho cộng đồng:
1. Vào Bucket vừa tạo -> Chọn tab **Permissions**.
2. Cuộn xuống phần **Bucket policy** -> Chọn **Edit**.
3. Dán đoạn JSON cấu hình dưới đây (Thay `booking-room-assets-bucket` bằng tên bucket thực tế của bạn):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::booking-room-assets-bucket/*"
    }
  ]
}
```
4. Chọn **Save changes**.

### Bước 1.4: Cấu hình CORS (Cross-Origin Resource Sharing)
Để Next.js frontend và các trình duyệt có thể tải ảnh hoặc thực hiện upload trực tiếp mà không gặp lỗi CORS:
1. Tại tab **Permissions** của Bucket, cuộn xuống phần **Cross-origin resource sharing (CORS)** -> Chọn **Edit**.
2. Dán cấu hình CORS dưới đây:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
3. Chọn **Save changes**.

---

## 2. Triển Khai Tại Backend (Node.js/Express)

### Bước 2.1: Cấu hình biến môi trường (`backend/.env`)
Thêm các biến cấu hình S3 vào file [backend/.env](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/backend/.env):

```env
# AWS S3 Configurations
AWS_ACCESS_KEY_ID=YOUR_IAM_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_IAM_SECRET_ACCESS_KEY
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=booking-room-assets-bucket
```

### Bước 2.2: Cài đặt thư viện AWS SDK v3
Di chuyển vào thư mục `backend` và cài đặt SDK chính thức của AWS (sử dụng phiên bản v3 modular):

```bash
npm install @aws-sdk/client-s3
```

### Bước 2.3: Tạo S3 Utility Helper
Tạo một file mới [backend/utils/s3Helper.js](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/backend/utils/s3Helper.js) hoặc [backend/config/s3.js](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/backend/config/s3.js) để khởi tạo client S3 và viết các hàm upload/delete:

```javascript
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Khởi tạo S3 Client sử dụng thông tin từ biến môi trường
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload buffer của file lên AWS S3
 * @param {Buffer} fileBuffer Buffer dữ liệu của file (từ multer memory storage)
 * @param {string} fileName Tên file duy nhất trên S3
 * @param {string} mimeType Định dạng file (ví dụ: image/jpeg)
 * @returns {Promise<string>} Trả về URL công khai của file sau khi upload thành công
 */
async function uploadToS3(fileBuffer, fileName, mimeType) {
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: fileName, // Đường dẫn của file trên bucket (ví dụ: rooms/room-abc-123/image-1.jpg)
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  
  // Trả về URL trực tiếp tới file vừa upload trên S3
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}

/**
 * Xóa file trên AWS S3
 * @param {string} fileKey S3 Key của file cần xóa (đường dẫn tương đối trong bucket, ví dụ: rooms/room-abc-123/image-1.jpg)
 */
async function deleteFromS3(fileKey) {
  const deleteParams = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  await s3Client.send(new DeleteObjectCommand(deleteParams));
}

/**
 * Hàm tiện ích để phân tích S3 Key từ S3 URL hoàn chỉnh
 * @param {string} url URL đầy đủ trên S3
 * @returns {string} S3 Key tương ứng
 */
function extractS3KeyFromUrl(url) {
  const pattern = new RegExp(`https://${BUCKET_NAME}\\.s3\\.${process.env.AWS_REGION}\\.amazonaws\\.com/(.+)`);
  const match = url.match(pattern);
  return match ? match[1] : null;
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  extractS3KeyFromUrl,
};
```

### Bước 2.4: Cập nhật Service Logic (`backend/services/host/roomService.js`)

Hiện tại, trong [roomService.js](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/backend/services/host/roomService.js), hệ thống đang lưu ảnh cục bộ vào thư mục `uploads/rooms` và lưu đường dẫn tương đối `/uploads/rooms/...` vào database. 

Chúng ta cần sửa đổi để **upload lên S3** và **lưu URL tuyệt đối** từ S3.

#### 2.4.1. Cập nhật hàm `createRoom`
Sửa đổi logic upload file từ ghi file cục bộ sang gọi helper S3:

```diff
-	// Save files to disk (uploads/rooms) and collect urls
-	const savedUrls = [];
-	const path = require('path');
-	const fs = require('fs');
-	const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'rooms');
-	if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
-
-	// Use transaction: insert room, images, approval
-	return await db.transaction(async (trx) => {
-		const created = await roomRepository.create(room, [], trx);
-
-		const roomFolder = path.join(uploadDir, created.room_id);
-		if (!fs.existsSync(roomFolder)) fs.mkdirSync(roomFolder, { recursive: true });
-
-		files.forEach((file, idx) => {
-			const ext = path.extname(file.originalname) || '.jpg';
-			const filename = `${Date.now()}-${idx + 1}${ext}`;
-			const outPath = path.join(roomFolder, filename);
-			fs.writeFileSync(outPath, file.buffer);
-			const publicPath = `/uploads/rooms/${created.room_id}/${filename}`;
-			savedUrls.push(publicPath);
-		});
+	// Import S3 Helper
+	const { uploadToS3 } = require('../../utils/s3Helper');
+	const path = require('path');
+
+	return await db.transaction(async (trx) => {
+		const created = await roomRepository.create(room, [], trx);
+		const savedUrls = [];
+
+		// Duyệt qua danh sách file buffer từ Multer memoryStorage và upload lên S3
+		for (let idx = 0; idx < files.length; idx++) {
+			const file = files[idx];
+			const ext = path.extname(file.originalname) || '.jpg';
+			// Cấu trúc S3 Key: rooms/<roomId>/<timestamp>-<index>.<extension>
+			const s3Key = `rooms/${created.room_id}/${Date.now()}-${idx + 1}${ext}`;
+			
+			const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
+			savedUrls.push(s3Url);
+		}
```

#### 2.4.2. Cập nhật hàm `updateRoom`
Tương tự, sửa logic update hình ảnh trong `updateRoom`:

```diff
-		// Handle images replacement if files provided
-		if (files && files.length) {
-			const roomFolder = path.join(uploadDir, roomId);
-			if (!fs.existsSync(roomFolder)) fs.mkdirSync(roomFolder, { recursive: true });
-
-			const savedUrls = [];
-			files.forEach((file, idx) => {
-				if (!file.size || file.size > MAX_IMAGE_BYTES) throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
-				const ext = path.extname(file.originalname) || '.jpg';
-				const filename = `${Date.now()}-${idx + 1}${ext}`;
-				const outPath = path.join(roomFolder, filename);
-				fs.writeFileSync(outPath, file.buffer);
-				const publicPath = `/uploads/rooms/${roomId}/${filename}`;
-				savedUrls.push(publicPath);
-			});
-
-			await roomRepository.replaceImages(roomId, savedUrls, trx);
-		}
+		// Handle S3 images replacement if files provided
+		if (files && files.length) {
+			const { uploadToS3, deleteFromS3, extractS3KeyFromUrl } = require('../../utils/s3Helper');
+			
+			// 1. (Tùy chọn) Xóa ảnh cũ trên S3 để tránh rác dung lượng bucket
+			const oldImages = await trx('room_images').select('image_url').where('room_id', roomId);
+			for (const img of oldImages) {
+				const s3Key = extractS3KeyFromUrl(img.image_url);
+				if (s3Key) {
+					try {
+						await deleteFromS3(s3Key);
+					} catch (err) {
+						console.error(`Không thể xóa ảnh cũ trên S3: ${s3Key}`, err);
+					}
+				}
+			}
+
+			// 2. Upload các ảnh mới lên S3
+			const savedUrls = [];
+			for (let idx = 0; idx < files.length; idx++) {
+				const file = files[idx];
+				if (!file.size || file.size > MAX_IMAGE_BYTES) {
+					throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
+				}
+				const ext = path.extname(file.originalname) || '.jpg';
+				const s3Key = `rooms/${roomId}/${Date.now()}-${idx + 1}${ext}`;
+				
+				const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
+				savedUrls.push(s3Url);
+			}
+
+			await roomRepository.replaceImages(roomId, savedUrls, trx);
+		}
```

#### 2.4.3. Cập nhật hàm `deleteRoom`
Đảm bảo khi chủ phòng xóa phòng, toàn bộ ảnh tương ứng trên S3 cũng được dọn dẹp sạch sẽ:

```javascript
// Trước khi xóa phòng trong database (sẽ xóa cascade records ở room_images), lấy các URLs để xóa trên S3
const { deleteFromS3, extractS3KeyFromUrl } = require('../../utils/s3Helper');

const images = await trx('room_images').select('image_url').where('room_id', roomId);

// Thực hiện xóa phòng trong DB (gây cascade delete các bản ghi room_images)
await roomRepository.remove(roomId, trx);

// Dọn dẹp trên S3 sau khi DB xóa thành công
for (const img of images) {
  const s3Key = extractS3KeyFromUrl(img.image_url);
  if (s3Key) {
    try {
      await deleteFromS3(s3Key);
    } catch (e) {
      console.error(`Lỗi khi dọn dẹp ảnh S3 khi xóa phòng: ${s3Key}`, e);
    }
  }
}
```

---

## 3. Triển Khai Tại Frontend (Next.js)

Vì cơ sở dữ liệu bây giờ lưu URL đầy đủ của S3 (ví dụ: `https://booking-room-assets-bucket.s3.ap-southeast-1.amazonaws.com/...`), việc lấy và hiển thị ảnh trên frontend trở nên vô cùng đơn giản.

### Bước 3.1: Cho phép hiển thị ảnh từ S3 Domain trong `next.config.js`
Next.js có cơ chế tối ưu hóa hình ảnh `<Image />` và yêu cầu khai báo rõ các domain bên ngoài.
Sửa file [frontend/next.config.js](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/frontend/next.config.js) để thêm pattern của bucket S3:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        // Định dạng hostname S3: <bucket-name>.s3.<region>.amazonaws.com
        hostname: 'booking-room-assets-bucket.s3.ap-southeast-1.amazonaws.com',
      },
    ],
  },
  allowedDevOrigins: ['192.168.56.1'],
  devIndicators: false,
};

module.exports = nextConfig;
```

### Bước 3.2: Tạo hàm chuẩn hóa URL hiển thị (Helper function)
Do hệ thống chuyển đổi từ lưu trữ cục bộ (relative path `/uploads/...`) sang S3 (absolute path `https://...`), trong dữ liệu database cũ hoặc dữ liệu mock có thể chứa cả hai loại URL này.

Hãy viết một hàm helper tại [frontend/utils/image.ts](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/frontend/utils/image.ts) để giải quyết hiển thị tự động:

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Trả về URL hình ảnh chính xác
 * - Nếu URL bắt đầu bằng http/https (như S3 URL, ảnh mock Unsplash), trả về trực tiếp.
 * - Nếu URL bắt đầu bằng /uploads, nối với tên miền của Backend Server.
 * - Nếu không có hình ảnh hoặc lỗi, trả về ảnh mặc định.
 */
export function getFullImageUrl(url: string | null | undefined, fallback = '/images/booking/room-1.png'): string {
  if (!url) return fallback;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/uploads')) {
    return `${BACKEND_URL}${url}`;
  }

  return url;
}
```

### Bước 3.3: Sử dụng hiển thị trong React Components
Áp dụng hàm helper trên tại mọi nơi hiển thị ảnh phòng, ví dụ trong [frontend/services/roomService.ts](file:///d:/N%C4%83m%203/Nh%E1%BA%ADp%20m%C3%B4n%20CNPM/Booking-Room/frontend/services/roomService.ts):

```typescript
import { getFullImageUrl } from '@/utils/image';

export function mapBackendRoomToBookingRoom(room: BackendRoom): BookingRoom {
  const district = room.detailed_address?.match(/(Quận \d+|Bình Thạnh|Gò Vấp|Thủ Đức|Tân Bình|Phú Nhuận|Quận [1-9]|Quận 1[0-2]|Tân Phú|Bình Tân)/i)?.[0] || 'Khác';
  const price = Number(room.monthly_rent);
  
  return {
    id: room.room_id,
    title: room.title,
    location: room.detailed_address,
    district,
    price,
    priceLabel: new Intl.NumberFormat('vi-VN').format(price) + 'đ',
    // Sử dụng hàm helper để chuyển đổi đường dẫn linh hoạt
    image: getFullImageUrl(room.cover_image_url),
    verified: room.approval_status === 'APPROVED',
    isNew: new Date().getTime() - new Date(room.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
    type: room.room_type || 'Phòng trọ',
    area: `${(room.max_capacity || 2) * 8 + 4} m²`,
    rating: room.average_rating || 0,
    reviews: 0,
    amenities: ['Wifi', 'Điều hòa', 'Bếp riêng', 'Chỗ để xe'],
    description: room.room_description || '',
  };
}
```

Và tại các component hiển thị danh sách ảnh chi tiết (ví dụ: Room Details):
```typescript
import { getFullImageUrl } from '@/utils/image';

// Render các ảnh chi tiết trong gallery
{room.images.map((img) => (
  <Image 
    key={img.sequence_number}
    src={getFullImageUrl(img.image_url)} 
    alt={`Room image ${img.sequence_number}`} 
    fill 
    className="object-cover"
  />
))}
```

---

## 4. Ưu điểm & Lưu ý về Chi phí và Bảo mật

### Ưu điểm khi dùng AWS S3
- **Tách biệt Storage và Compute:** Server backend không bị phình dung lượng ổ đĩa khi có hàng ngàn ảnh phòng tải lên. Khi deploy server (ví dụ: Render, Heroku, Docker) dạng stateless, dữ liệu ảnh không bị mất đi khi server restart.
- **Tốc độ tải nhanh:** Kết hợp với CloudFront (nếu cần CDN sau này) giúp ảnh tải về trình duyệt của khách hàng với độ trễ tối thiểu.
- **Tối ưu Next.js Image Optimization:** Giảm tải xử lý nén ảnh trên server chính bằng cách ủy quyền hoặc tải tài nguyên tĩnh tối ưu.

### Khuyến nghị bảo mật & vận hành bổ sung
1. **Quản lý Vòng đời (Lifecycle Rules):** Nếu hệ thống hỗ trợ đăng phòng tạm, hoặc lưu nháp, hãy cấu hình Lifecycle trong S3 bucket để tự động dọn dẹp các ảnh mồ côi (không liên kết với phòng nào trong DB) sau N ngày để tiết kiệm chi phí.
2. **Sử dụng CloudFront (Khuyên dùng khi Go Live):** Thay vì truy cập trực tiếp URL S3, hãy cấu hình AWS CloudFront (mạng phân phối nội dung CDN) để trỏ đến Bucket S3. Điều này bảo vệ S3 Bucket khỏi bị DDoS, hỗ trợ giao thức HTTP/3 tiên tiến hơn và giảm thiểu chi phí truyền dữ liệu từ S3 ra ngoài Internet (Data Transfer Out).
