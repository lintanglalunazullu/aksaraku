// dashboard.js
const SUPABASE_URL = 'https://pwohquppbydpycpqwxtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b2hxdXBwYnlkcHljcHF3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjYyNTUsImV4cCI6MjEwMTEwMjI1NX0.QUmKNTzaw88NZqb7ihR9Mgm7laJzm6_-M7Ktz0hNcGU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Tampilkan Profil User dari Google
async function displayUserProfile() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session && session.user) {
    const user = session.user;

    // Ambil data dari metadata Google OAuth
    document.getElementById('user-name').innerText = user.user_metadata.full_name || 'User';
    document.getElementById('user-email').innerText = user.email;
    document.getElementById('user-avatar').src = user.user_metadata.avatar_url || 'https://via.placeholder.com/80';
  }
}

// 2. Fungsi Logout
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert('Gagal Logout: ' + error.message);
  } else {
    // Lempar kembali ke halaman login
    window.location.href = '/';
  }
}

// Jalankan saat script dimuat
displayUserProfile();