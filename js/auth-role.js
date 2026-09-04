window.AKSARAKU_ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
  TEACHER: 'teacher',
});

window.createAksarakuClient = function createAksarakuClient() {
  const config = window.AKSARAKU_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return null;
  return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
};

window.getAksarakuUserRole = async function getAksarakuUserRole(client, user) {
  if (!client || !user) return null;

  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return data?.role || user.user_metadata?.role || user.app_metadata?.role || null;
};

window.requireAksarakuRole = async function requireAksarakuRole(allowedRoles, loginPath) {
  document.documentElement.style.visibility = 'hidden';
  const client = window.createAksarakuClient();
  const { data: { session } = {} } = client
    ? await client.auth.getSession()
    : { data: {} };
  const role = await window.getAksarakuUserRole(client, session?.user);

  if (!session?.user || !allowedRoles.includes(role)) {
    if (client && session) await client.auth.signOut();
    window.location.replace(loginPath);
    return null;
  }

  document.documentElement.style.visibility = 'visible';
  return { client, session, role };
};
