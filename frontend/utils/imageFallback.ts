export function getRoomFallbackImage(roomId: string, coverImageUrl?: string | null): string {
  if (coverImageUrl) return coverImageUrl;

  // Generate a stable hash of the roomId string to get a consistent image index between 1 and 4
  let hash = 0;
  const idStr = String(roomId || 'default');
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const imgIndex = (Math.abs(hash) % 4) + 1;
  
  return `/images/booking/room-${imgIndex}.png`;
}
