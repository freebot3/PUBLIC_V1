// Owner: Wily Kun
// Recode: Wily Kun
// -------------------------------------------------------------------------

// Pengaturan untuk fitur auto typing, auto recording, dan auto update dependencies
// -------------------------------------------------------------------------
const settings = {
  autoTyping: {
    private: false, // Mengaktifkan autoTyping untuk chat pribadi
    group: true,  // Mengaktifkan autoTyping untuk grup
    duration: 60000 // Durasi dalam milidetik (1 menit)
  },
  autoRecording: {
    private: false, // Mengaktifkan autoRecording untuk chat pribadi
    group: false,  // Mengaktifkan autoRecording untuk grup
    duration: 60000 // Durasi dalam milidetik (1 menit)
  }
};

// Fungsi untuk mendapatkan pengaturan
// -------------------------------------------------------------------------
function getSettings() {
  return settings;
}

// Penjelasan Fitur
// -------------------------------------------------------------------------
// autoTyping: Fitur ini akan membuat bot secara otomatis bila ada pesan baru di chat pribadi maupun di gc
// 'sedang mengetik' ke chat yang sedang aktif. Durasi dapat diatur sesuai
// kebutuhan dalam milidetik.
//
// autoRecording: Fitur ini akan membuat bot secara otomatis bila ada pesan baru di chat pribadi maupun di gc
// 'sedang merekam' ke chat yang sedang aktif. Durasi dapat diatur sesuai
// kebutuhan dalam milidetik.

// Ekspor modul
// -------------------------------------------------------------------------
module.exports = {
  getSettings
};
