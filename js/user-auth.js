(function () {
  const SUPABASE_URL = 'https://pwohquppbydpycpqwxtg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b2hxdXBwYnlkcHljcHF3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjYyNTUsImV4cCI6MjEwMTEwMjI1NX0.QUmKNTzaw88NZqb7ihR9Mgm7laJzm6_-M7Ktz0hNcGU';
  const ADMIN_PATH = './admin/index.html';

  function isEmailUser(user) {
    const providers = user?.app_metadata?.providers || [];
    const provider = user?.app_metadata?.provider;
    return provider === 'email' || providers.includes('email');
  }

  async function redirectAdminUser() {
    if (!window.supabase) return;

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (isEmailUser(session?.user)) {
      window.location.replace(ADMIN_PATH);
    }
  }

  redirectAdminUser().catch((error) => {
    console.error('Gagal memeriksa akses dashboard user:', error);
  });
})();
