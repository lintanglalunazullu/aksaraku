(function () {
  const SUPABASE_URL = 'https://pwohquppbydpycpqwxtg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwicmVmIjoicHdob2hxdXBwYnlkcHljcHF3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjYyNTUsImV4cCI6MjEwMTEwMjI1NX0.QUmKNTzaw88NZqb7ihR9Mgm7laJzm6_-M7Ktz0hNcGU';
  const LOGIN_PATH = './login.html';

  document.documentElement.style.visibility = 'hidden';

  function isEmailSession(session) {
    const user = session?.user;
    const providers = user?.app_metadata?.providers || [];
    const provider = user?.app_metadata?.provider;
    return provider === 'email' || providers.includes('email');
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_PATH);
  }

  async function guardAdminPage() {
    if (!window.supabase) {
      redirectToLogin();
      return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error || !isEmailSession(session)) {
      await supabaseClient.auth.signOut();
      redirectToLogin();
      return;
    }

    document.documentElement.style.visibility = 'visible';
  }

  guardAdminPage().catch(() => {
    redirectToLogin();
  });
})();
