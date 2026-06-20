// Medaxis — Mock Auth (localStorage)

(function () {
  'use strict';

  const FREE_IDS    = ['hypertension', 'asthma', 'tloc-blackouts', 'ibs'];
  const USERS_KEY   = 'medaxis_users';
  const SESSION_KEY = 'medaxis_session';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const users = getUsers();
    if (!users[email]) return null;
    return { email, name: users[email].name, favourites: users[email].favourites };
  }

  function signUp(name, email, password) {
    if (!name || !email || !password) return { ok: false, error: 'All fields are required.' };
    const users = getUsers();
    if (users[email]) return { ok: false, error: 'An account with this email already exists.' };
    users[email] = { name: name.trim(), password, favourites: [] };
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true };
  }

  function signIn(email, password) {
    if (!email || !password) return { ok: false, error: 'Email and password are required.' };
    const users = getUsers();
    if (!users[email]) return { ok: false, error: 'No account found with this email.' };
    if (users[email].password !== password) return { ok: false, error: 'Incorrect password.' };
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true };
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isFavourite(id) {
    const user = getCurrentUser();
    return user ? user.favourites.includes(id) : false;
  }

  function toggleFavourite(id) {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return false;
    const users = getUsers();
    if (!users[email]) return false;
    const favs = users[email].favourites;
    const idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); } else { favs.splice(idx, 1); }
    saveUsers(users);
    return idx === -1;
  }

  window.Auth = { FREE_IDS, getCurrentUser, signUp, signIn, signOut, isFavourite, toggleFavourite };
})();
