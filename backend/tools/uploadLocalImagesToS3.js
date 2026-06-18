const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { uploadToS3 } = require('../utils/s3Helper');

(async () => {
  try {
    console.log('=== Bắt đầu quét cơ sở dữ liệu để tìm hình ảnh cục bộ (/uploads/) ===');
    
    // 1. Quét bảng room_images
    const roomImages = await db('room_images')
      .select('room_id', 'sequence_number', 'image_url')
      .whereILike('image_url', '/uploads/%');
      
    console.log(`Tìm thấy ${roomImages.length} hình ảnh phòng lưu cục bộ trong DB.`);
    
    let successCount = 0;
    
    for (const img of roomImages) {
      const relativePath = img.image_url;
      // Đường dẫn file tuyệt đối trên máy
      // relativePath có dạng /uploads/rooms/room_id/filename.jpg
      const absolutePath = path.join(__dirname, '..', relativePath);
      
      if (fs.existsSync(absolutePath)) {
        const fileName = path.basename(relativePath);
        // Xác định Content-Type
        let mimeType = 'image/jpeg';
        if (fileName.endsWith('.png')) mimeType = 'image/png';
        else if (fileName.endsWith('.webp')) mimeType = 'image/webp';
        
        // Cấu trúc thư mục trên S3: rooms/<room_id>/<filename>
        const s3Key = `rooms/${img.room_id}/${fileName}`;
        
        console.log(`Uploading [Room: ${img.room_id}]: ${fileName} -> S3...`);
        const fileBuffer = fs.readFileSync(absolutePath);
        
        // Tải lên S3
        const s3Url = await uploadToS3(fileBuffer, s3Key, mimeType);
        
        // Cập nhật URL mới vào database
        await db('room_images')
          .where({ room_id: img.room_id, sequence_number: img.sequence_number })
          .update({ image_url: s3Url });
          
        console.log(`  -> Thành công! S3 URL: ${s3Url}`);
        successCount++;
      } else {
        console.warn(`  [Bỏ qua] File không tồn tại cục bộ: ${absolutePath}`);
      }
    }
    
    console.log(`\n=== Đã hoàn tất! Đã di chuyển thành công ${successCount}/${roomImages.length} ảnh phòng lên S3. ===`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi nghiêm trọng khi chạy script:', err);
    process.exit(1);
  }
})();
